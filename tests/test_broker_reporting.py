import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('reporting',Path(__file__).resolve().parents[1]/'plugins/cab-approval-bridge/broker/cgpt_approval_bridge_reporting.py')
reporting=importlib.util.module_from_spec(spec);spec.loader.exec_module(reporting)


class BrokerReportingTest(unittest.TestCase):
    def test_invalid_new_evidence_is_refused_before_outbox_creation(self):
        with tempfile.TemporaryDirectory(prefix='cab-reporting-fixture-') as temporary:
            reporting.configure(Path(temporary)/'owned-reporting')
            args={'incident_id':'bad','session_id':'ses_fixture','directory':temporary,'summary':'Incident','category':'protocol',
                  'evidence':[{'reference':'fixture','sha256':'abc'}]}
            with self.assertRaisesRegex(ValueError,'ccab-evidence-invalid'):
                reporting.enqueue_incident(args,lambda *_:self.fail('relay non attendu'))
            self.assertFalse((Path(temporary)/'owned-reporting').exists())

    def test_legacy_invalid_evidence_is_repaired_only_for_exact_other_fields(self):
        with tempfile.TemporaryDirectory(prefix='cab-reporting-fixture-') as temporary:
            reporting.configure(Path(temporary)/'owned-reporting')
            args={'incident_id':'legacy','session_id':'ses_fixture','directory':temporary,'summary':'Incident','category':'protocol',
                  'evidence':[{'reference':'fixture','sha256':'abc'}]}
            root=reporting.directory(temporary)/'ccab-pending';root.mkdir(mode=0o700)
            key=reporting.hashlib.sha256(args['incident_id'].encode()).hexdigest();path=root/('incident-'+key+'.json')
            original={'args':args,'reportedAt':'2026-11-06T10:00:00+00:00'};reporting.write(path,original)
            other=root/('incident-'+'f'*64+'.json');reporting.write(other,{'args':{**args,'incident_id':'peer'},'reportedAt':original['reportedAt']})
            fixed={**args,'evidence':[{'reference':'fixture','sha256':'a'*64}]}
            with self.assertRaisesRegex(ValueError,'ccab-incident-conflict'):
                reporting.enqueue_incident({**fixed,'summary':'Autre'},lambda *_:self.fail('relay non attendu'))
            self.assertEqual(json.loads(path.read_text()),original)
            def down(*_):raise ValueError('transport-unavailable')
            self.assertEqual(reporting.enqueue_incident(fixed,down)['status'],'QUEUED_LOCALLY')
            self.assertEqual(json.loads(path.read_text()),{'args':fixed,'reportedAt':original['reportedAt']})
            self.assertTrue(other.exists())
            with self.assertRaisesRegex(ValueError,'ccab-incident-conflict'):
                reporting.enqueue_incident({**fixed,'evidence':[{'reference':'fixture','sha256':'b'*64}]},lambda *_:None)
            sent=[]
            self.assertTrue(reporting.enqueue_incident(fixed,lambda route,packet:sent.append(packet) or {'accepted':True})['accepted'])
            self.assertEqual(sent[0]['reportedAt'],original['reportedAt']);self.assertFalse(path.exists());self.assertTrue(other.exists())

    def test_outbox_survives_network_loss_then_drains_without_duplicate(self):
        with tempfile.TemporaryDirectory(prefix='cab-reporting-fixture-') as temporary:
            reporting.configure(Path(temporary)/'owned-reporting')
            args={'incident_id':'fixture-incident','session_id':'ses_fixture','directory':temporary,'summary':'Incident synthétique','category':'protocol','evidence':[]}
            def down(_path,_packet):raise ValueError('transport-unavailable')
            result=reporting.enqueue_incident(args,down)
            self.assertEqual(result['status'],'QUEUED_LOCALLY')
            self.assertEqual(reporting.pending(temporary)['count'],1)
            self.assertEqual(reporting.enqueue_incident(args,down)['status'],'QUEUED_LOCALLY')
            seen=[]
            def up(path,packet):seen.append((path,packet));return {'accepted':True}
            reporting.publish(temporary,{'checked_at':'2026-11-06T10:00:00Z','pending_count':0},up)
            self.assertEqual(reporting.pending(temporary)['count'],0)
            self.assertEqual(sum(path=='/ccab/owner/report' for path,_ in seen),1)
            self.assertFalse((reporting.directory(temporary)/'statistics.json').exists())


if __name__=='__main__':unittest.main()
