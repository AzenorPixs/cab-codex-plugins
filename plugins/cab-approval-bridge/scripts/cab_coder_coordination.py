"""Controller-owned coordination mailbox; callers arrive through verified IPC."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from cab_session_dependencies import DependencyStore, CoordinationError, project_root, token, encoded, codex_active_turn, codex_proxy_exchange, codex_verified_sender, controller_admission, verify_pilot_binding

VERSION='2.7.0'
PROTOCOL='cab-coder-coordination-1'
STAGES=('candidate','tested','accepted','delivered','activated')


def proof_state(project,reference,expected):
    path=Path(reference)
    forbidden={'.git','.opencode','.codex','.ssh','.gnupg','node_modules','logs'}
    if (path.is_absolute() or any(part in forbidden or part in ('.','..') or
        re.search(r'\.env(?:\.|$)|\.(?:key|pem|p12|pfx|crt|cer|der)$|^(?:credentials|secrets)\.(?:json|yaml)$|^id_(?:rsa|ed25519)$',part) for part in path.parts)):
        raise CoordinationError('coordination-proof-protected')
    target=Path(project)/path
    try:
        if not target.is_file() or target.resolve()!=target or target.stat().st_size>16*1024*1024 or target.stat().st_nlink!=1:return 'unavailable'
        actual=hashlib.sha256(target.read_bytes()).hexdigest()
        return 'fresh' if actual==expected else 'stale'
    except OSError:return 'unavailable'


class CoderMailbox:
    def __init__(self,directory):self.store=DependencyStore(directory);self.db=self.store.db
    def close(self):self.store.close()
    def binding(self,project,run):
        row=self.db.execute('SELECT * FROM coder_bindings WHERE project=? AND run=?',(project_root(project),token(run))).fetchone()
        return dict(row) if row else None
    def adopt(self,project,run,owner,actor,generation,context,change,replace=False):
        project=project_root(project);run,owner,actor,change=map(token,(run,owner,actor,change))
        if type(generation) is not int or generation<1 or type(context) is not int or context<1:raise CoordinationError('coordination-generation-invalid')
        previous=self.binding(project,run)
        if previous:
            same=all(previous[k]==v for k,v in {'storage_session':owner,'actor_session':actor,'generation':generation,'context_id':context,'change_id':change}.items())
            if same:return {'status':'adopted',**previous}
            if not replace or previous['storage_session']!=owner or generation<=previous['generation'] or context<previous['context_id'] or previous['change_id']!=change:
                raise CoordinationError('coordination-binding-conflict')
            def rebind():
                if self.db.execute("SELECT 1 FROM coder_deliveries WHERE project=? AND run=? AND state IN ('prepared','unknown')",(project,run)).fetchone():raise CoordinationError('coordination-delivery-unresolved')
                self.db.execute('INSERT INTO coder_binding_history VALUES(?,?,?,?)',(project,run,previous['generation'],encoded(previous)))
                self.db.execute('UPDATE coder_bindings SET actor_session=?,generation=?,context_id=? WHERE project=? AND run=?',(actor,generation,context,project,run))
                return {'status':'adopted',**self.binding(project,run)}
            return self.store._transaction(rebind)
        rows=self.db.execute('SELECT session,mode FROM sessions WHERE project=? AND run=?',(project,run)).fetchall()
        if len(rows)>1 or rows and (rows[0]['session']!=owner or rows[0]['mode']!='piloted'):raise CoordinationError('coordination-owner-ambiguous')
        if not rows:self.store.register(project,owner,run,'piloted','other')
        state=self.db.execute('SELECT state FROM session_states WHERE project=? AND session=? AND run=?',(project,owner,run)).fetchone()
        if state and state['state']!='active':raise CoordinationError('coordination-recipient-paused')
        if not state:self.store.set_session_state(project,owner,run,'active',1)
        def apply():
            if self.db.execute("SELECT 1 FROM deliveries WHERE project=? AND run=? AND state IN ('prepared','unknown')",(project,run)).fetchone():raise CoordinationError('coordination-delivery-unresolved')
            self.db.execute('INSERT INTO coder_bindings VALUES(?,?,?,?,?,?,?)',(project,run,owner,actor,generation,context,change))
            return {'status':'adopted',**self.binding(project,run)}
        return self.store._transaction(apply)
    def identity(self,payload):
        project=project_root(payload['project']);run=token(payload['run']);b=self.binding(project,run)
        if not b or any(b[k]!=payload[v] for k,v in [('actor_session','session'),('generation','generation'),('context_id','context')]):raise CoordinationError('coordination-binding-stale')
        self.store.actor_session=b['actor_session']
        return (project,b['storage_session'],run)
    def execute(self,payload):
        if payload['action'] in ('adopt','routes','prepare-delivery','finish-delivery','notify-direct','metrics'):
            return self.apply(payload)
        identity=self.identity(payload);request=token(payload['request_id'])
        state=self.db.execute('SELECT state FROM session_states WHERE project=? AND session=? AND run=?',identity).fetchone()
        if payload['action'] in ('subscribe','publish','ack') and (not state or state['state']!='active'):raise CoordinationError('coordination-origin-not-active')
        digest=hashlib.sha256(encoded(payload).encode()).hexdigest()
        def prepare():
            prior=self.db.execute('SELECT * FROM coder_requests WHERE project=? AND run=? AND request_id=?',(identity[0],identity[2],request)).fetchone()
            if prior and prior['payload_sha256']!=digest:raise CoordinationError('coordination-request-conflict')
            if not prior:self.db.execute('INSERT INTO coder_requests VALUES(?,?,?,?,NULL)',(identity[0],identity[2],request,digest))
            return dict(prior) if prior else None
        prior=self.store._transaction(prepare)
        if prior and prior['result_json'] and payload['action'] in ('subscribe','publish','ack'):
            return json.loads(prior['result_json'])
        result=self.apply(payload)
        if payload['action'] in ('subscribe','publish','ack'):
            self.db.execute('UPDATE coder_requests SET result_json=? WHERE project=? AND run=? AND request_id=?',(encoded(result),identity[0],identity[2],request))
        return result
    def apply(self,payload):
        action=payload['action'];project=project_root(payload['project'])
        if action=='adopt':return self.adopt(project,payload['run'],payload['owner'],payload['session'],payload['generation'],payload['context'],payload['change'],payload.get('replace',False))
        if action=='metrics':return self.metrics(project,payload['run'])
        if action=='routes':return self.routes(project,payload.get('offset',0))
        if action=='notify-direct':return self.notify_direct(payload)
        if action in ('prepare-delivery','finish-delivery'):return self.delivery(payload)
        identity=self.identity(payload);args=payload.get('args',{});b=self.binding(project,payload['run'])
        if action=='subscribe':
            result=self.store.subscribe(*identity,args['dependency_id'],args['kind'],args['subject'],args['criterion'])
            return {**result,'cycles':self.cycles(project)}
        if action=='publish':
            stage=args['stage']
            if stage not in STAGES:raise CoordinationError('coordination-stage-invalid')
            if proof_state(project,args['proof'],args['proof_sha256'])!='fresh':raise CoordinationError('coordination-proof-not-fresh')
            prior=self.db.execute('SELECT stage,actor_session FROM coder_notice_states WHERE project=? AND notice_id=?',(project,args['notice_id'])).fetchone()
            if prior and (prior['stage']!=stage or prior['actor_session']!=payload['session']):raise CoordinationError('coordination-notice-conflict')
            result=self.store.publish(*identity,args['notice_id'],args['kind'],args['subject'],args['proof'],args['proof_sha256'])
            self.db.execute('INSERT OR IGNORE INTO coder_notice_states VALUES(?,?,?,?)',(project,args['notice_id'],payload['session'],stage))
            return {**result,'stage':stage,'actor_session':payload['session'],'dependency_verified':False}
        if action=='inbox':
            rows=self.store.inbox(*identity)['notices']
            for row in rows:
                meta=self.db.execute('SELECT stage,actor_session FROM coder_notice_states WHERE project=? AND notice_id=?',(project,row['notice_id'])).fetchone()
                row.update(dict(meta) if meta else {'stage':'legacy-unclassified','actor_session':row.get('sender_session')})
                row['proof_state']=proof_state(project,row['proof'],row.get('proof_sha256'))
            return {'items':rows,'actor_session':b['actor_session']}
        if action=='ack':return self.store.acknowledge(*identity,args['dependency_id'],args['notice_id'])
        if action=='outbox':
            result=self.store.outbox(*identity,args['notice_id'])
            for row in result['recipients']:
                binding=self.binding(project,row['recipient_run'])
                if binding:row['actor_session']=binding['actor_session']
                delivery=self.db.execute('SELECT state,attempt_id,native_message_id FROM coder_deliveries WHERE project=? AND session=? AND run=? AND notice_id=?',(project,row['recipient_session'],row['recipient_run'],args['notice_id'])).fetchone()
                if delivery:row.update(dict(delivery));row['delivery_state']=delivery['state']
            return result
        if action=='status':return {'binding':b,'cycles':self.cycles(project)}
        raise CoordinationError('coordination-action-invalid')
    def metrics(self,project,run):
        binding=self.binding(project,run)
        if not binding:raise CoordinationError('coordination-binding-stale')
        identity=(project,binding['storage_session'],run)
        count=lambda sql,args:self.db.execute(sql,args).fetchone()[0]
        return {'subscriptions':count('SELECT count(*) FROM subscriptions WHERE project=? AND session=? AND run=?',identity),
          'received':count('SELECT count(*) FROM inbox WHERE project=? AND session=? AND run=?',identity),
          'acknowledged':count('SELECT count(*) FROM inbox WHERE project=? AND session=? AND run=? AND acknowledged=1',identity),
          'nativeAccepted':count("SELECT count(*) FROM coder_deliveries WHERE project=? AND session=? AND run=? AND state IN ('accepted','observed')",identity),
          'nativeUncertain':count("SELECT count(*) FROM coder_deliveries WHERE project=? AND session=? AND run=? AND state IN ('prepared','unknown')",identity),
          'cycles':self.cycles(project),'coverage':'mailbox-native-receipts'}
    def routes(self,project,offset=0):
        if type(offset) is not int or not 0<=offset<=1000000:raise CoordinationError('coordination-range-invalid')
        rows=self.db.execute('''SELECT i.session,i.run,i.notice_id,i.dependency_id,n.sender_run,n.proof,n.proof_sha256,
          b.actor_session,b.generation,b.context_id,t.socket_path,st.state AS session_state,d.state,d.attempt_id,d.native_message_id
          FROM inbox i JOIN notices n USING(project,notice_id)
          LEFT JOIN session_states st ON st.project=i.project AND st.session=i.session AND st.run=i.run
          LEFT JOIN coder_bindings b ON b.project=i.project AND b.run=i.run
          LEFT JOIN coder_direct_transports t ON t.project=i.project AND t.session=i.session AND t.run=i.run
          LEFT JOIN coder_deliveries d ON d.project=i.project AND d.session=i.session AND d.run=i.run AND d.notice_id=i.notice_id
          LEFT JOIN session_closures c ON c.project=i.project AND c.session=i.session AND c.run=i.run
          WHERE i.project=? AND i.acknowledged=0 AND c.session IS NULL
          AND (d.state IS NULL OR d.state IN ('prepared','unknown'))
          ORDER BY i.rowid LIMIT 100 OFFSET ?''',(project,offset)).fetchall()
        unique={}
        for row in rows:unique.setdefault((row['session'],row['run'],row['notice_id']),dict(row))
        return {'routes':list(unique.values()),'next_offset':offset+100 if len(rows)==100 else None}
    def notify_direct(self,p):
        project=project_root(p['project']);run,session,notice,dependency=map(token,(p['run'],p['session'],p['notice_id'],p['dependency_id']))
        transport=self.db.execute('SELECT socket_path FROM coder_direct_transports WHERE project=? AND session=? AND run=?',(project,session,run)).fetchone()
        if not transport:return {'status':'unavailable','reason':'native-direct-transport-not-registered'}
        path=transport['socket_path'];exchange=lambda request:codex_proxy_exchange(request,path)
        previous=self.db.execute('SELECT * FROM deliveries WHERE project=? AND session=? AND run=? AND notice_id=?',(project,session,run,notice)).fetchone()
        if previous:
            if previous['state'] in ('accepted','rejected'):return {'status':previous['state']}
            return self.store.observe_uncertain_delivery(project,session,run,previous['dependency_id'],notice,previous['attempt_id'],previous['turn_id'],exchange)
        state=self.db.execute('SELECT state FROM session_states WHERE project=? AND session=? AND run=?',(project,session,run)).fetchone()
        if not state or state['state']!='active':return {'status':'waiting','reason':'recipient-paused'}
        verify_pilot_binding(project,run,session,p['state_root'],'direct')
        turn=codex_active_turn(project,session,exchange)['turn_id']
        attempt='coder-'+hashlib.sha256(encoded([project,session,run,notice]).encode()).hexdigest()
        barrier=lambda a,b,c,d:self.store.direct_delivery_barrier(a,b,c,d,p['state_root'],lambda:controller_admission(p['controller_url']))
        return self.store.dispatch(project,session,run,dependency,notice,attempt,turn,barrier,codex_verified_sender(project,attempt,exchange))

    def delivery(self,p):
        project=project_root(p['project']);session,run,notice,attempt=map(token,(p['storage_session'],p['run'],p['notice_id'],p['attempt_id']))
        key=(project,session,run,notice)
        def apply():
            if not self.db.execute('SELECT 1 FROM inbox WHERE project=? AND session=? AND run=? AND notice_id=?',key).fetchone():raise CoordinationError('coordination-recipient-unverified')
            prior=self.db.execute('SELECT * FROM coder_deliveries WHERE project=? AND session=? AND run=? AND notice_id=?',key).fetchone()
            if prior and prior['attempt_id']!=attempt:raise CoordinationError('coordination-delivery-conflict')
            if p['action']=='prepare-delivery':
                if prior:return {'status':prior['state'],'send':False}
                self.db.execute('INSERT INTO coder_deliveries VALUES(?,?,?,?,?,?,?)',(*key,attempt,'prepared',None));return {'status':'prepared','send':True}
            if not prior:raise CoordinationError('coordination-delivery-not-found')
            state=p['state'];message=p.get('native_message_id')
            if state not in ('accepted','unknown','observed') or state in ('accepted','observed') and not isinstance(message,str):raise CoordinationError('coordination-delivery-proof-invalid')
            if prior['state'] in ('accepted','observed'):
                if prior['state']!=state or prior['native_message_id']!=message:raise CoordinationError('coordination-delivery-terminal-conflict')
                return {'status':state}
            self.db.execute('UPDATE coder_deliveries SET state=?,native_message_id=? WHERE project=? AND session=? AND run=? AND notice_id=?',(state,message,*key))
            return {'status':state}
        return self.store._transaction(apply)
    def cycles(self,project):
        rows=self.db.execute('''SELECT s.run,s.subject,s.kind,b.change_id FROM subscriptions s
           JOIN coder_bindings b ON b.project=s.project AND b.run=s.run WHERE s.project=?''',(project,)).fetchall()
        owners={r['change_id']:r['run'] for r in rows};edges={}
        for r in rows:
            target=owners.get(r['subject'].split('/')[0])
            if target and target!=r['run']:edges.setdefault(r['run'],set()).add(target)
        index={};low={};stack=[];active=set();found=[]
        def visit(node):
            index[node]=low[node]=len(index);stack.append(node);active.add(node)
            for target in edges.get(node,()):
                if target not in index:visit(target);low[node]=min(low[node],low[target])
                elif target in active:low[node]=min(low[node],index[target])
            if low[node]==index[node]:
                component=[]
                while True:
                    item=stack.pop();active.remove(item);component.append(item)
                    if item==node:break
                if len(component)>1:found.append(sorted(component))
        if len(edges)>500:raise CoordinationError('coordination-graph-limit')
        for node in edges:
            if node not in index:visit(node)
        return sorted(found)



def main():
    try:
        p=json.loads(sys.stdin.read(256*1024));root=Path(p['state_root'])/'cab-approval-bridge/dependencies'
        box=CoderMailbox(root)
        try:result=box.execute(p)
        finally:box.close()
        print(json.dumps(result,ensure_ascii=False))
    except (CoordinationError,KeyError,ValueError,TypeError,OSError) as error:
        print(json.dumps({'error':str(error) if isinstance(error,CoordinationError) else 'coordination-input-invalid'}));return 1
    return 0
if __name__=='__main__':raise SystemExit(main())
