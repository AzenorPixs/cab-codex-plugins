"""Admission, reçus et contrôles GitHub sur le PostgreSQL de qualification."""
import io
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from datetime import timedelta
if os.environ.get('CAB_TEST_FIXTURE')!='1' or not Path('/.dockerenv').exists():raise RuntimeError('dedicated-container-required')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from django.db import transaction
from django.utils import timezone
from cab_platform import system_updates as u,update_availability as a
from cab_platform.core.models import Actor,SystemUpdate,UpdateAvailability
from cab_platform.core.commands import Refused
from cab_platform.client import ClientError

class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.atomic=transaction.atomic();self.atomic.__enter__();self.tmp=tempfile.TemporaryDirectory();self.state=patch.object(u,'STATE',Path(self.tmp.name));self.state.start()
        SystemUpdate.objects.all().delete()
        self.actor=Actor.objects.create(pk='updater-any-account',uid=34567,agent='fixture',role='coder',token_hash='updater-fixture-hash')
        self.other=Actor.objects.create(pk='updater-other-account',uid=45678,agent='fixture',role='coder',token_hash='updater-other-hash')
    def tearDown(self):self.state.stop();transaction.set_rollback(True);self.atomic.__exit__(None,None,None);self.tmp.cleanup()
    def queued(self):return u.request(self.actor,'UPDATE-FIXTURE','3.2.1')
    def dispatched(self):
        self.queued();SystemUpdate.objects.filter(pk='UPDATE-FIXTURE').update(state='DISPATCHED')
    def test_account_agnostic_admission_and_same_request(self):
        first=self.queued();self.assertEqual(u.request(self.actor,'UPDATE-FIXTURE','3.2.1'),first);self.assertEqual(SystemUpdate.objects.count(),1)
        with self.assertRaisesRegex(Refused,'update-request-conflict'):u.request(self.actor,'UPDATE-FIXTURE','3.2.2')
    def test_foreign_read_and_repeat_are_refused(self):
        self.queued()
        with self.assertRaisesRegex(Refused,'update-not-authorized'):u.status(self.other,'UPDATE-FIXTURE')
        with self.assertRaisesRegex(Refused,'update-not-authorized'):u.request(self.other,'UPDATE-FIXTURE','3.2.1')
    def test_concurrency_and_arbitrary_target_are_refused(self):
        for version in ['https://example.org/payload','../file','3.2.1;id','3.2',None]:
            with self.assertRaises(Refused):u.request(self.actor,'INVALID',version)
        self.queued()
        with self.assertRaisesRegex(Refused,'update-already-active'):u.request(self.other,'SECOND','3.2.1')
    def test_inactive_actor_is_refused(self):
        self.actor.active=False
        with self.assertRaises(Refused):self.queued()
    def test_dispatch_calls_only_fixed_separate_unit_once(self):
        self.queued()
        with patch.object(u.subprocess,'run',return_value=SimpleNamespace(returncode=0)) as run:
            u.dispatch();u.dispatch();self.assertEqual(run.call_count,1)
            self.assertEqual(run.call_args.args[0],['/usr/bin/systemctl','start','--no-block','cab-update.service'])
        self.assertEqual(SystemUpdate.objects.get().state,'DISPATCHED')
    def test_running_oneshot_is_not_mistaken_for_disappeared_worker(self):
        self.dispatched();SystemUpdate.objects.filter(pk='UPDATE-FIXTURE').update(updated=timezone.now()-timedelta(seconds=180))
        with patch.object(u.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout='activating\n')):u.dispatch()
        self.assertEqual(SystemUpdate.objects.get().state,'DISPATCHED')
    def test_worker_publishes_ok_only_for_verified_version_and_once(self):
        self.dispatched()
        def actual_stub(**args):
            self.assertEqual(args['version'],'3.2.1');args['progress']('INSTALLING');return {'version':'3.2.1','verified':True,'package_sha256':'a'*64}
        with patch('cab_platform.update.update',side_effect=actual_stub) as update:
            result=u.worker();self.assertEqual(result['state'],'OK');self.assertEqual(result['version'],'3.2.1')
            self.assertEqual(u.worker(),{'state':'NO_PENDING_UPDATE'});self.assertEqual(update.call_count,1)
        job=SystemUpdate.objects.get();self.assertIsNone(job.active_slot);self.assertEqual(json.loads(u.receipt_path(job).read_text())['state'],'OK')
    def test_partial_failure_never_reports_ok(self):
        self.dispatched()
        with patch('cab_platform.update.update',side_effect=ClientError('debian-update-failed-preserved-receipt')):result=u.worker()
        self.assertEqual(result['state'],'FAILED');self.assertNotIn('version',result)
    def test_wrong_activation_version_is_refused(self):
        self.dispatched()
        with patch('cab_platform.update.update',return_value={'version':'3.2.0','verified':True}):self.assertEqual(u.worker()['state'],'FAILED')
    def test_timeout_remains_unknown_and_protects_admission(self):
        self.dispatched()
        with patch('cab_platform.update.update',side_effect=subprocess.TimeoutExpired('apt',1)):self.assertEqual(u.worker()['state'],'UNKNOWN')
        with self.assertRaisesRegex(Refused,'update-already-active'):u.request(self.other,'SECOND','3.2.1')
    def test_durable_receipt_recovers_without_installation(self):
        self.dispatched();job=SystemUpdate.objects.get();u.finish(job,'OK',{'version':'3.2.1','verified':True})
        SystemUpdate.objects.filter(pk=job.pk).update(state='DISPATCHED',active_slot=1,result={})
        with patch.object(u.subprocess,'run') as run:u.dispatch();run.assert_not_called()
        self.assertEqual(u.status(self.actor,job.pk)['state'],'OK')
    def test_late_probe_cannot_replace_completed_receipt(self):
        self.dispatched();job=SystemUpdate.objects.get();u.finish(job,'OK',{'version':'3.2.1','verified':True})
        result=u.finish(job,'UNKNOWN',{'error':'stale-probe'})
        self.assertEqual(result['state'],'OK');self.assertEqual(json.loads(u.receipt_path(job).read_text())['state'],'OK')

class AvailabilityTests(unittest.TestCase):
    def setUp(self):self.atomic=transaction.atomic();self.atomic.__enter__();UpdateAvailability.objects.all().delete()
    def tearDown(self):transaction.set_rollback(True);self.atomic.__exit__(None,None,None)
    def response(self,**values):return io.BytesIO(json.dumps({'tag_name':'v3.3.0','draft':False,'prerelease':False,**values}).encode())
    def test_request_does_not_contact_github(self):
        with patch.object(a,'urlopen') as fetch:a.request_check();fetch.assert_not_called()
        self.assertTrue(UpdateAvailability.objects.get().requested)
    def test_stable_release_and_random_schedule_inside_day(self):
        with patch.object(a,'urlopen',return_value=self.response()) as fetch,patch.object(a.secrets,'randbelow',return_value=86400):a.check()
        value=a.view();self.assertTrue(value['update_available']);self.assertEqual(value['latest_version'],'3.3.0')
        cached=UpdateAvailability.objects.get();self.assertEqual(cached.next_check_at-cached.checked_at,timedelta(hours=48));self.assertEqual(fetch.call_args.kwargs['timeout'],15)
    def test_simultaneous_home_requests_are_coalesced(self):
        with patch.object(a,'urlopen',return_value=self.response()) as fetch:a.check();a.request_check();a.check();self.assertEqual(fetch.call_count,1)
    def test_no_second_check_inside_rolling_day(self):
        UpdateAvailability.objects.create(pk=1,latest_version='3.3.0',checked_at=timezone.now()-timedelta(hours=23),requested=True)
        with patch.object(a,'urlopen') as fetch:a.request_check();a.check();fetch.assert_not_called()
    def test_administration_can_force_a_new_background_check(self):
        UpdateAvailability.objects.create(pk=1,latest_version='3.3.0',checked_at=timezone.now(),requested=False)
        with patch.object(a,'urlopen',return_value=self.response()) as fetch:a.request_check(force=True);fetch.assert_not_called();a.check();self.assertEqual(fetch.call_count,1)
    def test_forced_check_requires_administrator(self):
        from django.test import RequestFactory
        from cab_platform.core.api import command
        actor=Actor.objects.create(pk='force-check-coder',uid=56789,role='coder',agent='fixture',token_hash=hashlib.sha256(b'force-fixture-token').hexdigest())
        request=RequestFactory().post('/',HTTP_AUTHORIZATION='Bearer force-fixture-token');request.cab_peer={'uid':actor.uid}
        with self.assertRaisesRegex(Refused,'administrator-required'):command(request,SimpleNamespace(name='system.update.check',data={'force':True}))
    def test_failure_preserves_cached_version_and_never_blocks_view(self):
        UpdateAvailability.objects.create(pk=1,latest_version='3.3.0',requested=True)
        with patch.object(a,'urlopen',side_effect=OSError):a.check()
        value=a.view();self.assertEqual(value['latest_version'],'3.3.0');self.assertEqual(value['error'],'github-version-check-unavailable')
    def test_draft_prerelease_and_invalid_tags_are_refused(self):
        for values in ({'draft':True},{'prerelease':True},{'tag_name':'v3.3.0-beta'},{'tag_name':'garbage'}):
            UpdateAvailability.objects.all().delete()
            with patch.object(a,'urlopen',return_value=self.response(**values)):a.check()
            self.assertIsNone(a.view()['latest_version'])

if __name__=='__main__':unittest.main()
