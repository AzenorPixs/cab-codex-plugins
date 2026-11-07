import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('reporting',Path(__file__).resolve().parents[1]/'plugins/cab-approval-bridge/broker/cgpt_approval_bridge_reporting.py')
reporting=importlib.util.module_from_spec(spec);spec.loader.exec_module(reporting)


class BrokerReportingTest(unittest.TestCase):
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
