"""Réconciliation manuelle bornée ; aucune permission ni opération métier."""
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))
import cgpt_approval_bridge_server as broker
import cgpt_approval_bridge_journal as journal

base = Path('/home/devops/.opencode/state/cgpt-approval-bridge')
backup = base / 'maintenance-20261020T210935Z'
os.environ['CGPT_APPROVAL_STORE'] = str(base / 'approvals.json')
os.environ['CGPT_APPROVAL_JOURNAL'] = str(base / 'events.ndjson')
evidence = json.loads(Path(__file__).with_name('cab-manual-reconciliation-evidence.json').read_text())
digest = lambda content: hashlib.sha256(content).hexdigest()

with (base / 'broker.instance.lock').open('a+') as instance_lock:
    fcntl.flock(instance_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    with broker.locked_store(broker.store_path()):
        original = (base / 'events.ndjson').read_bytes()
        assert digest(original) == '6dd82b4eb03d405ba9f25b2af34c9c267c2382968f0315bc38885c5dbc3df446'
        assert original == (backup / 'events.ndjson').read_bytes()
        store_bytes = (base / 'approvals.json').read_bytes()
        assert store_bytes == (backup / 'approvals.json').read_bytes()
        rows = original.splitlines(keepends=True)
        assert len(rows) == 19825
        prefix = b''.join(rows[:-1])
        events = [json.loads(row) for row in rows[:-1]]
        journal.calculate_chain_tip(events)
        assert journal.validate_sequences(events) == 19824
        branch = json.loads(rows[-1])
        assert branch['event_id'] == 'evt-6422a48a8145495a860317d30eee8983'
        assert branch['event_type'] == 'CONTROLLER_REMINDER_ATTEMPTED'
        assert branch['previous_hash'] == events[-3]['event_hash']
        data = broker.load_store(broker.store_path())
        before = copy.deepcopy(data['approvals'])
        decision = evidence['decision']
        installation = data['approvals'][decision['approval_id']]
        assert installation['status'] == 'PENDING'
        proof = evidence['installProof']
        assert proof['native']['state']['status'] == 'completed'
        assert proof['native']['state']['metadata']['exit'] == proof['exit'] == 0
        assert proof['native']['state']['input']['command'] == installation['commands'][0]
        assert proof['release']['state'] == 'RELEASED'
        assert proof['release']['outcome'] == 'COMPLETED'
        assert proof['release']['operationDigest'] == decision['operation_digest']
        assert broker.apply_controller_decision(installation, decision)
        request = evidence['orphanRequest']
        aid = request['approval_id']
        assert aid not in data['approvals']
        created = [e for e in events if e.get('approval_id') == aid and e['event_type'] == 'APPROVAL_CREATED']
        assert len(created) == 1
        created = created[0]
        for key in ('title', 'summary', 'files'):
            assert request[key] == created['data'][key]
        for key in ('requestId', 'change_id'):
            assert request[key] == created[key]
        assert not any(e.get('approval_id') == aid and e['event_type'] in broker.STATUS_EVENT_TYPES.values() for e in events)
        now = broker.utc_now()
        item = {key: request[key] for key in (
            'approval_id', 'requestId', 'change_id', 'title', 'summary', 'files',
            'session_id', 'directory', 'commands', 'run_id', 'reservation_version',
            'coordination_protocol', 'operation_id', 'operation_digest', 'expected_revisions', 'resources')}
        item.update(status='CANCELLED', requester='OC', reviewer='', comment='',
                    legacy_requestIds=[], created_at=created['timestamp'], updated_at=now,
                    expires_at=created['data']['expires_at'], cancelled_at=now,
                    cancelled_by='CGPT', decision_id='', decision_applied_at='', expired_at='',
                    notification_status='DELIVERED', notification_attempts=1,
                    notification_updated_at='', notification_next_retry_at='',
                    notification_lease_id='', notification_lease_until='', reminder_last_at='')
        item['manual_reconciliation'] = {
            'authorization': 'Diagnostic et correction CAB explicitement demandés par le développeur.',
            'source_event_id': created['event_id'],
            'source_native_part': 'prt_15a7e88710015GX57rfhvjzcCS',
            'created_at_source': 'APPROVAL_CREATED.timestamp ; horodatage original du magasin indisponible',
            'effect': 'Annulation sans permission native ni écriture métier ; RUN C2 reste arrêté.',
        }
        data['approvals'][aid] = item
        assert all(data['approvals'][key] == value for key, value in before.items() if key != decision['approval_id'])
        assert broker.check_request_id_uniqueness(data['approvals'])[0]
        with journal.locked_journal(str(base / 'events.ndjson')):
            quarantine = backup / 'divergent-technical-branch.ndjson'
            with quarantine.open('xb') as handle:
                os.chmod(quarantine, 0o600)
                handle.write(rows[-1]); handle.flush(); os.fsync(handle.fileno())
            temporary = base / 'events.manual-reconciliation.tmp'
            with temporary.open('xb') as handle:
                os.chmod(temporary, 0o600)
                handle.write(prefix); handle.flush(); os.fsync(handle.fileno())
            os.replace(temporary, base / 'events.ndjson')
            broker.fsync_directory(str(base / 'events.ndjson'))
        broker.save_store(broker.store_path(), data)
        journal.append_event('MANUAL_PERSISTENCE_RECONCILIATION', actor='CGPT', data={
            'authorization': 'Demande explicite de diagnostic, correction et prévention CAB.',
            'original_journal_sha256': digest(original), 'preserved_prefix_sha256': digest(prefix),
            'preserved_prefix_events': 19824, 'quarantined_technical_events': 1,
            'backup_directory': str(backup), 'restored_historical_decision': decision['approval_id'],
            'cancelled_unexecuted_orphan': aid, 'native_permissions_issued': 0,
            'business_operations_replayed': 0,
        })
        broker.ensure_terminal_event(installation)
        broker.ensure_terminal_event(item)
    integrity = journal.verify_journal()
    consistency = broker.store_journal_consistency_snapshot()
    assert integrity['ok'], integrity
    assert consistency['ok'], consistency
    result = {'journal_ok': True, 'consistency_ok': True,
              'approvals': len(data['approvals']),
              'pending': sum(x['status'] == 'PENDING' for x in data['approvals'].values()),
              'historical_decision_restored': installation['status'], 'orphan_status': item['status'],
              'other_approvals_unchanged': len(before)-1, 'replayed_operations': 0}
    (backup / 'reconciliation-result.json').write_text(json.dumps(result, indent=2)+'\n')
    os.chmod(backup / 'reconciliation-result.json', 0o600)
    print(json.dumps(result))
