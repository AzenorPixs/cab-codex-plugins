#!/usr/bin/env python3
"""Versioned local dependency mailbox interface; native notification is separate."""
import argparse
from contextlib import contextmanager, nullcontext
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import sys
import urllib.request

from cab_session_dependencies import (CoordinationError, DependencyStore, check_close, codex_proxy_exchange,
                                      codex_active_turn, codex_verified_sender, controller_admission, encoded, same_state_root, verify_pilot_binding)

VERSION = '2.7.4'
ADAPTER_PROTOCOL = 'cab-session-coordination-1'
ACTIONS = ("version", "capabilities", "register", "state", "decide", "decisions", "subscribe", "publish", "inbox", "outbox", "discover-turn", "notify-all", "ack", "release-notice", "notify-piloted", "notify-direct", "reconcile-piloted", "reconcile-direct", "cancel-prepared", "check-close", "close-direct", "reopen-direct")


def request_coder_pump(project,base):
    gate=controller_admission(base)
    if gate.get('workspace')!=project_root(project) or gate.get('protocol')!='dependency-pause-gate-v1':
        raise CoordinationError('coordination-native-barrier-unavailable')
    request=urllib.request.Request(base.rstrip('/')+'/coordination/coder/pump',data=b'{}',method='POST',
        headers={'content-type':'application/json','x-cab-continuity':'cab-continuity-v1'})
    with urllib.request.urlopen(request,timeout=15) as response:return json.loads(response.read(65536))


def discover_target(store, project, session, run, notice_id, target, state_root, controller_url, codex_socket):
    if target['acknowledged']:
        return {'status':'acknowledged'}
    if target['delivery_state']!='not-attempted':
        return {'status':target['delivery_state'],'attempt_id':target['attempt_id'],'turn_id':target['turn_id'],
                'delivery_dependency_id':target['delivery_dependency_id'],'observation_sha256':target['observation_sha256']}
    if target['session_state']!='active':
        reason={'paused':'recipient-paused','closed':'recipient-closed'}.get(target['session_state'],'recipient-not-active')
        return {'status':'waiting','reason':reason}
    mode=target['mode'];recipient=target['recipient_session'];recipient_run=target['recipient_run']
    binding=store.db.execute('SELECT actor_session FROM coder_bindings WHERE project=? AND run=?',(project,recipient_run)).fetchone()
    if binding:
        request_coder_pump(project,controller_url)
        delivery=store.db.execute('SELECT state FROM coder_deliveries WHERE project=? AND session=? AND run=? AND notice_id=?',(project,recipient,recipient_run,notice_id)).fetchone()
        return {'status':delivery['state'] if delivery else 'queued','actor_session':binding['actor_session']}

    verify_pilot_binding(project,recipient_run,recipient,state_root,mode)
    control=controller_admission(controller_url,recipient_run if mode=='piloted' else None)
    if (not isinstance(control,dict) or control.get('protocol')!='dependency-pause-gate-v1' or
        control.get('workspace')!=project or
        not same_state_root(control.get('stateRoot'),state_root) or
        mode=='piloted' and (control.get('runId')!=recipient_run or type(control.get('version')) is not int or control['version']<1)):
        raise CoordinationError('coordination-native-barrier-unavailable')
    if control.get('active') is not True:
        reason=control.get('reason')
        if reason not in ('run-paused','run-stopped','global-paused','global-stopped','global-blocked','job-inactive'):
            raise CoordinationError('coordination-native-barrier-unavailable')
        return {'status':'waiting','reason':reason}
    turn=codex_active_turn(project,recipient,lambda request:codex_proxy_exchange(request,codex_socket))
    attempt='dep-'+hashlib.sha256(encoded([project,session,run,notice_id,recipient,recipient_run]).encode()).hexdigest()
    return {'status':'ready','mode':mode,'turn_id':turn['turn_id'],'attempt_id':attempt,
            'reservation_version':control.get('version') if mode=='piloted' else None}


@contextmanager
def origin_guarded(store, origin, barrier, project, session, run, turn):
    with barrier(project,session,run,turn) as allowed:
        closed=store.db.execute('SELECT 1 FROM session_closures WHERE project=? AND session=? AND run=?',origin).fetchone()
        yield bool(allowed and not closed)


def verify_origin(store,project,session,run,state_root):
    row=store.db.execute('''SELECT s.mode,t.state FROM sessions s LEFT JOIN session_states t USING(project,session,run)
      WHERE s.project=? AND s.session=? AND s.run=?''',(project,session,run)).fetchone()
    if not row or row['state']!='active':
        raise CoordinationError('coordination-origin-not-active')
    verify_pilot_binding(project,run,session,state_root,row['mode'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=ACTIONS)
    parser.add_argument("--store")
    parser.add_argument("--state-root")
    parser.add_argument("--project")
    parser.add_argument("--session")
    parser.add_argument("--run")
    parser.add_argument("--mode", choices=("direct", "piloted"))
    parser.add_argument("--mandate", choices=("SCM", "other", "unknown"), default="unknown")
    parser.add_argument("--state", choices=("active", "paused"))
    parser.add_argument("--reason", choices=("explicit", "dependency"), default="explicit")
    parser.add_argument("--generation", type=int)
    parser.add_argument("--resume-evidence")
    parser.add_argument("--decision-evidence")
    parser.add_argument("--decision-id")
    parser.add_argument("--choice",choices=('pause','stop'))
    parser.add_argument("--offset",type=int,default=0)
    parser.add_argument("--limit",type=int,default=4)
    parser.add_argument("--dependency-id")
    parser.add_argument("--kind", choices=("change", "task", "capability"))
    parser.add_argument("--subject")
    parser.add_argument("--criterion")
    parser.add_argument("--batch-code")
    parser.add_argument("--batch-change")
    parser.add_argument("--notice-id")
    parser.add_argument("--proof")
    parser.add_argument("--proof-sha256")
    parser.add_argument("--stage",choices=("candidate","tested"))
    parser.add_argument("--release-evidence")
    parser.add_argument("--recipient-session")
    parser.add_argument("--recipient-run")
    parser.add_argument("--attempt-id")
    parser.add_argument("--turn-id")
    parser.add_argument("--reservation-version", type=int)
    parser.add_argument("--controller-url")
    parser.add_argument("--codex-socket")
    parser.add_argument("--change")
    parser.add_argument("--receipt-id")
    args = parser.parse_args()
    if args.action == "version":
        print(json.dumps({"version": VERSION, "protocol": "cab-dependency-mailbox-1"}))
        return 0
    if args.action == "capabilities":
        print(json.dumps({"version": VERSION, "protocol": "cab-dependency-mailbox-1",
                          "adapter_protocol": ADAPTER_PROTOCOL, "operations": list(ACTIONS),
                          "mode_owners": {"direct": "agent", "piloted": "orchestrator"},
                          "mandate_mapping": {"SCM": "SCM", "SCMP": "SCM",
                                              "CISM": "other", "CISMP": "other",
                                              "ISM": "other", "ISMP": "other"},
                          "coder_protocol":"cab-coder-coordination-1",
                          "autonomous_mode_owners":{"direct":"coder","piloted":"coder"},
                          "delegated_transport":"verified-broker-owner-ipc",
                          "scope": "same-project-same-uid", "passive_mailbox": True,
                          "native_delivery": "per-attempt-verification", "automatic_resume": False},
                         sort_keys=True))
        return 0
    state_root = args.state_root or os.environ.get("OC_Codex_RUNTIME_STATE_ROOT") or os.environ.get("OC_CGPT_RUNTIME_STATE_ROOT") or str(Path.home() / ".local/state")
    if args.action == 'check-close':
        if not args.project or not args.run or args.store:
            parser.error('check-close requires --project, --run and runtime state root')
        try:
            print(json.dumps(check_close(args.project,args.run,state_root,args.session),sort_keys=True))
            return 0
        except (CoordinationError,OSError) as exc:
            print(json.dumps({'error':str(exc) if isinstance(exc,CoordinationError) else 'coordination-closure-check-unavailable'}),file=sys.stderr)
            return 1
    if args.state_root:
        parser.error('--state-root is reserved for check-close')
    if not all((args.project, args.session, args.run)):
        parser.error("--project, --session et --run sont obligatoires")
    native_session = os.environ.get('CODEX_THREAD_ID')
    if native_session and native_session != args.session:
        print(json.dumps({"error": "coordination-native-session-mismatch"}), file=sys.stderr)
        return 1
    if not args.store and not Path(state_root).is_absolute():
        parser.error("runtime state root must be absolute")
    directory = args.store or str(Path(state_root) / "cab-approval-bridge/dependencies")
    try:
        if args.action == 'notify-piloted' and not all((args.recipient_session, args.recipient_run, args.dependency_id,
                args.notice_id, args.attempt_id, args.turn_id, args.reservation_version, args.controller_url, args.codex_socket)):
            raise CoordinationError('coordination-native-arguments-invalid')
        if args.action == 'notify-direct' and not args.controller_url:
            raise CoordinationError('coordination-native-arguments-invalid')
        if args.action=='discover-turn' and not all((args.recipient_session,args.recipient_run,args.dependency_id,
                                                     args.notice_id,args.controller_url,args.codex_socket)):
            raise CoordinationError('coordination-native-arguments-invalid')
        if args.action=='notify-all' and (not args.notice_id or (args.codex_socket and not args.controller_url)):
            raise CoordinationError('coordination-native-arguments-invalid')
        if args.action in ('notify-direct','reconcile-piloted','reconcile-direct') and not all((args.recipient_session, args.recipient_run, args.dependency_id,
                args.notice_id, args.attempt_id, args.turn_id, args.codex_socket)):
            raise CoordinationError('coordination-native-arguments-invalid')
        if args.action == 'cancel-prepared' and not all((args.recipient_session,args.recipient_run,args.dependency_id,args.notice_id,args.attempt_id)):
            raise CoordinationError('coordination-native-arguments-invalid')
        if args.action in ('notify-piloted','notify-direct','notify-all','close-direct','reopen-direct') and (not Path(state_root).is_absolute() or
                Path(directory).absolute() != Path(state_root) / 'cab-approval-bridge/dependencies'):
            raise CoordinationError('coordination-native-store-mismatch')
        if args.action == 'close-direct':
            check=check_close(args.project,args.run,state_root,args.session)
            if check['status']=='absent':
                print(json.dumps({'status':'absent','retained':False}));return 0
            if check['status']=='pending':
                raise CoordinationError('coordination-delivery-unresolved')
        store = DependencyStore(directory)
        try:
            identity = (args.project, args.session, args.run)
            if args.action == "register":
                result = store.register(*identity, args.mode, args.mandate)
                if args.mode=='direct' and args.codex_socket:
                    socket_path=Path(args.codex_socket)
                    if not socket_path.is_absolute() or socket_path.lstat().st_uid!=os.getuid():raise CoordinationError('coordination-native-socket-invalid')
                    store.db.execute('INSERT OR REPLACE INTO coder_direct_transports VALUES(?,?,?,?)',(*store._identity(*identity),str(socket_path)))

            elif args.action == "state":
                result = store.set_session_state(*identity, args.state, args.generation, args.reason, args.resume_evidence,args.decision_evidence)
            elif args.action == 'decide':
                result = store.record_dependency_decision(*identity,args.decision_id,args.choice,args.decision_evidence)
            elif args.action == 'decisions':
                result = store.decisions(*identity)
            elif args.action == 'close-direct':
                result = store.close_direct_verified(args.project,args.session,args.run,args.change,args.receipt_id,state_root)
            elif args.action == 'reopen-direct':
                result = store.reopen_direct_verified(args.project,args.session,args.run,state_root)
            elif args.action == "subscribe":
                result = store.subscribe(*identity, args.dependency_id, args.kind, args.subject, args.criterion, args.batch_code, args.batch_change)
            elif args.action == "publish":
                if args.stage:
                    from cab_coder_coordination import proof_state
                    if proof_state(args.project,args.proof,args.proof_sha256)!='fresh':raise CoordinationError('coordination-proof-not-fresh')
                result = store.publish(*identity, args.notice_id, args.kind, args.subject, args.proof, args.proof_sha256)
                if args.stage:
                    old=store.db.execute('SELECT stage,actor_session FROM coder_notice_states WHERE project=? AND notice_id=?',(str(Path(args.project).resolve()),args.notice_id)).fetchone()
                    if old and (old['stage']!=args.stage or old['actor_session']!=args.session):raise CoordinationError('coordination-notice-conflict')
                    store.db.execute('INSERT OR IGNORE INTO coder_notice_states VALUES(?,?,?,?)',(str(Path(args.project).resolve()),args.notice_id,args.session,args.stage))
                if args.controller_url:
                    try:result['coder_delivery']=request_coder_pump(str(Path(args.project).resolve()),args.controller_url)
                    except (CoordinationError,OSError,ValueError):result['native_notification']='unavailable'

            elif args.action == "inbox":
                result = store.inbox(*identity)
            elif args.action == 'outbox':
                result = store.outbox(*identity,args.notice_id)
            elif args.action == 'release-notice':
                result = store.release_notice(*identity,args.notice_id,args.release_evidence)
            elif args.action == 'discover-turn':
                project,session,run=store._identity(*identity)
                routes=store.outbox(project,session,run,args.notice_id)['recipients']
                matches=[r for r in routes if (r['recipient_session'],r['recipient_run'],r['dependency_id']) ==
                         (args.recipient_session,args.recipient_run,args.dependency_id)]
                if len(matches)!=1:raise CoordinationError('coordination-recipient-unverified')
                target=matches[0]
                result=discover_target(store,project,session,run,args.notice_id,target,state_root,args.controller_url,args.codex_socket)
            elif args.action == 'notify-all':
                project,session,run=store._identity(*identity)
                if args.offset<0 or not 1<=args.limit<=20:
                    raise CoordinationError('coordination-batch-range-invalid')
                routes=store.outbox(project,session,run,args.notice_id)['recipients']
                groups={}
                for route in routes:
                    groups.setdefault((route['recipient_session'],route['recipient_run']),[]).append(route)
                entries=list(groups.items());results=[]
                for (recipient,recipient_run),members in entries[args.offset:args.offset+args.limit]:
                    pending=[row for row in members if not row['acknowledged']]
                    if not pending:
                        results.append({'session':recipient,'run':recipient_run,'status':'acknowledged'});continue
                    target=pending[0]
                    binding=store.db.execute('SELECT actor_session FROM coder_bindings WHERE project=? AND run=?',(project,recipient_run)).fetchone()
                    if binding:
                        results.append({'session':binding['actor_session'],'run':recipient_run,**discover_target(store,project,session,run,args.notice_id,target,state_root,args.controller_url,args.codex_socket)});continue
                    if target['delivery_state']!='not-attempted':
                        results.append({'session':recipient,'run':recipient_run,'status':target['delivery_state'],
                                        'attempt_id':target['attempt_id'],'turn_id':target['turn_id'],
                                        'delivery_dependency_id':target['delivery_dependency_id'],
                                        'observation_sha256':target['observation_sha256']});continue
                    if target['session_state']!='active':
                        reason={'paused':'recipient-paused','closed':'recipient-closed'}.get(target['session_state'],'recipient-not-active')
                        results.append({'session':recipient,'run':recipient_run,'status':'waiting','reason':reason});continue
                    if not args.codex_socket:
                        results.append({'session':recipient,'run':recipient_run,'status':'waiting','reason':'native-transport-unavailable'});continue
                    try:
                        found=discover_target(store,project,session,run,args.notice_id,target,state_root,args.controller_url,args.codex_socket)
                        if found['status']!='ready':
                            results.append({'session':recipient,'run':recipient_run,**found});continue
                        lock=store._session_lock((project,session,run)) if run!=recipient_run else nullcontext()
                        with lock:
                            closed=store.db.execute('SELECT 1 FROM session_closures WHERE project=? AND session=? AND run=?',
                                                    (project,session,run)).fetchone()
                            if closed:raise CoordinationError('coordination-session-closed')
                            verify_origin(store,project,session,run,state_root)
                            current=store.outbox(project,session,run,args.notice_id)['recipients']
                            current=[row for row in current if (row['recipient_session'],row['recipient_run'],row['dependency_id'])==
                                     (recipient,recipient_run,target['dependency_id'])]
                            if len(current)!=1:raise CoordinationError('coordination-recipient-unverified')
                            target=current[0]
                            if target['acknowledged'] or target['delivery_state']!='not-attempted':
                                raise CoordinationError('coordination-recipient-changed')
                            if found['status']=='ready':
                                if found['mode']=='piloted':
                                    def authority(run_id):
                                        verify_pilot_binding(project,run_id,recipient,state_root,'piloted')
                                        return controller_admission(args.controller_url,run_id)
                                    barrier=lambda p,s,r,t:store.pilot_delivery_barrier(p,s,r,t,found['reservation_version'],authority,state_root)
                                else:
                                    barrier=lambda p,s,r,t:store.direct_delivery_barrier(p,s,r,t,state_root,lambda:controller_admission(args.controller_url))
                                sender=codex_verified_sender(project,found['attempt_id'],lambda request:codex_proxy_exchange(request,args.codex_socket))
                                guarded=lambda p,s,r,t:origin_guarded(store,(project,session,run),barrier,p,s,r,t)
                                found=store.dispatch(project,recipient,recipient_run,target['dependency_id'],args.notice_id,
                                                     found['attempt_id'],found['turn_id'],guarded,sender)
                            results.append({'session':recipient,'run':recipient_run,**found})
                    except (CoordinationError,OSError,sqlite3.Error,ValueError,TypeError) as exc:
                        results.append({'session':recipient,'run':recipient_run,'status':'unavailable',
                                        'error':str(exc) if isinstance(exc,CoordinationError) else 'coordination-native-unavailable'})
                next_offset=args.offset+args.limit
                result={'notice_id':args.notice_id,'recipients':results,
                        'next_offset':next_offset if next_offset<len(entries) else None}
            elif args.action in ('notify-piloted','notify-direct','reconcile-piloted','reconcile-direct','cancel-prepared'):
                project, session, run = store._identity(*identity)
                sender_lock = (store._session_lock((project,session,run)) if (args.action.startswith('notify-') or args.action=='cancel-prepared') and
                               run != args.recipient_run else nullcontext())
                with sender_lock:
                    sender = store.db.execute('''SELECT n.sender_session,n.sender_run FROM notices n
                      WHERE n.project=? AND n.notice_id=? AND NOT EXISTS
                      (SELECT 1 FROM session_closures c WHERE c.project=n.project AND c.session=n.sender_session AND c.run=n.sender_run)''',
                      (project, args.notice_id)).fetchone()
                    if not sender or (sender['sender_session'], sender['sender_run']) != (session, run):
                        raise CoordinationError('coordination-notice-owner-mismatch')
                    if args.action.startswith('notify-'):
                        verify_origin(store,project,session,run,state_root)
                    exchange=lambda request: codex_proxy_exchange(request,args.codex_socket)
                    if args.action=='cancel-prepared':
                        with store._session_lock(store._identity(project,args.recipient_session,args.recipient_run)):
                            result=store.cancel_prepared(project,args.recipient_session,args.recipient_run,args.dependency_id,args.notice_id,args.attempt_id)
                    elif args.action=='notify-piloted':
                        def authority(run_id):
                            verify_pilot_binding(project,run_id,args.recipient_session,state_root)
                            return controller_admission(args.controller_url,run_id)
                        barrier = lambda p,s,r,t: store.pilot_delivery_barrier(p,s,r,t,args.reservation_version,authority,state_root)
                        sender = codex_verified_sender(project,args.attempt_id,exchange)
                        guarded=lambda p,s,r,t:origin_guarded(store,(project,session,run),barrier,p,s,r,t)
                        result = store.dispatch(project,args.recipient_session,args.recipient_run,args.dependency_id,
                                                args.notice_id,args.attempt_id,args.turn_id,guarded,sender)
                    elif args.action=='notify-direct':
                        barrier = lambda p,s,r,t: store.direct_delivery_barrier(p,s,r,t,state_root,
                                                                                lambda: controller_admission(args.controller_url))
                        sender = codex_verified_sender(project,args.attempt_id,exchange)
                        guarded=lambda p,s,r,t:origin_guarded(store,(project,session,run),barrier,p,s,r,t)
                        result = store.dispatch(project,args.recipient_session,args.recipient_run,args.dependency_id,
                                                args.notice_id,args.attempt_id,args.turn_id,guarded,sender)
                    else:
                        verify_pilot_binding(project,args.recipient_run,args.recipient_session,state_root,
                                             'direct' if args.action=='reconcile-direct' else 'piloted')
                        result = store.observe_uncertain_delivery(project,args.recipient_session,args.recipient_run,
                            args.dependency_id,args.notice_id,args.attempt_id,args.turn_id,exchange)
            else:
                result = store.acknowledge(*identity, args.dependency_id, args.notice_id)
            print(json.dumps(result, ensure_ascii=False, sort_keys=True))
            return 0
        finally:
            store.close()
    except (CoordinationError, OSError, sqlite3.Error) as exc:
        print(json.dumps({"error": str(exc) if isinstance(exc, CoordinationError) else "coordination-storage-error"}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
