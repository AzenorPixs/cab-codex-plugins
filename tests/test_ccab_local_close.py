"""Qualification PostgreSQL de deux récupérations administratives locales."""

import os
from pathlib import Path
import tempfile
import unittest
import uuid
from unittest.mock import patch

if os.environ.get('CAB_TEST_FIXTURE') != '1':
    raise RuntimeError('dedicated-postgresql-fixture-required')

import django
django.setup()

from cab_platform import host_completion
from cab_platform.core import commands as c, models as m
from cab_platform.core.operation_recovery import reconcile_stopped


class LocalCloseTests(unittest.TestCase):
    def setUp(self):
        work = tempfile.TemporaryDirectory(prefix='cab-local-close-run-')
        self.addCleanup(work.cleanup)
        self.root = Path(work.name)
        (self.root / 'fixture.md').write_text('scenario\n')
        key = uuid.uuid4().hex
        self.project = m.Project.objects.create(pk=key, root=str(self.root), owner_uid=os.getuid())
        self.owner = m.Actor.objects.create(pk=key, uid=os.getuid(), role='coder', token_hash=key)
        self.admin, _ = m.Actor.objects.get_or_create(
            pk='system-admin', defaults={'uid':0,'role':'admin','agent':'cab-cli','token_hash':'fixture'},
        )
        self.owner.projects.add(self.project)
        self.argv = ['/usr/bin/env','-C',str(self.root),'/opt/bin/openspec',
                     'validate','system-platform','--type','spec','--strict']
        self.run = c.begin_run(self.owner, {
            'project_id':key,'run_id':'FIXTURE','session_id':'SID-'+key,'mode':'direct',
            'change':'fixture','paths':['fixture.md'],'criteria':['specification','publication'],
            'decisions_resolved':True,
            'finalization':{'nature':'delivery','checks':[{'id':'openspec','argv':self.argv,
                'criteria':['specification']}],'requirements':[{'id':'remote','kind':'publication',
                'producer':'fixture','criteria':['publication']}]},
        })
        self.scope = {'project_id':key,'run_id':self.run.run_id}
        self.plan = m.FinalizationPlan.objects.get(run=self.run)

    def operation(self):
        request = {**self.scope,'session_id':self.run.session_id,'generation':1,'request_id':'lost',
                   'argv':self.argv,'kind':'local','host_authorization':{'administrator':'system-admin',
                    'policy_digest':self.plan.digest,'check_id':'openspec','check_revision':1}}
        receipt = {'state':'UNKNOWN','error':'OperationalError','execution_environment':'host-authorized',
                   'dispatched':True,'finished':'fixture','executor':{'pid':2147483000,'uid':os.getuid(),
                   'start':'123','boot':'fixture'},'request_id':'lost','input_digest':c.digest(request),
                   'source_revision':self.run.source_revision,'exit_code':None}
        op = m.Operation.objects.create(
            run=self.run,request_id='lost',state='UNKNOWN',request=request,input_digest=c.digest(request),
            source_revision=self.run.source_revision,dispatched=True,receipt=receipt,receipt_digest=c.digest(receipt),
        )
        c.event(self.run,'host-check-authorized',{'request_id':'lost','input_digest':op.input_digest,
                                                'administrator':'system-admin'})
        c.event(self.run,'operation-dispatched',{'request_id':'lost'})
        resource = m.Resource.objects.create(pk='file:'+str(self.root/'fixture.md'),fencing=1)
        m.Lease.objects.create(run=self.run,operation=op,resource=resource,fencing=1)
        return op, {**self.scope,'request_id':'reconcile','operation_request_id':'lost',
                    'expected_receipt_digest':op.receipt_digest,'developer_authorized':True,
                    'reason':'Arrêt de contrôle autorisé dans la fixture.'}

    def test_host_receipt_remains_immutable_and_lease_is_released(self):
        op, arguments = self.operation()
        original = op.receipt
        with patch('cab_platform.connector_process.identity',return_value=op.receipt['executor']):
            with self.assertRaisesRegex(c.Refused,'operation-executor-still-active'):
                reconcile_stopped(self.admin,arguments)
        op.refresh_from_db()
        self.assertEqual(op.state,'UNKNOWN')
        receipt = reconcile_stopped(self.admin,arguments)
        op.refresh_from_db()
        self.assertEqual((op.state,op.receipt,op.receipt_digest),('CANCELLED',original,c.digest(original)))
        self.assertFalse(receipt['work_replayed'])
        self.assertFalse(receipt['tests_passed'])
        self.assertEqual(list(m.Lease.objects.filter(operation=op).values_list('state',flat=True)),['RELEASED'])
        self.assertEqual(reconcile_stopped(self.admin,arguments),receipt)

    def test_withdrawal_preserves_checks_and_operations(self):
        op, arguments = self.operation()
        original_receipt = op.receipt, op.receipt_digest
        reconcile_stopped(self.admin,arguments)
        index = m.GitSessionIndex.objects.create(change=self.run.change_record,
            session=self.run.coding_session,initial_run=self.run,state='RELEASED')
        args = {**self.scope,'request_id':'withdraw','withdraw_delivery':True,
                'expected_policy_digest':self.plan.digest,'expected_framing_digest':self.run.mandate['framing_digest'],
                'authorization':'Le développeur retire la publication de ce mandat de fixture.'}
        original = self.plan.policy
        existing = m.GitDelivery.objects.create(project=self.project,run=self.run,git_index=index,
                                                 version='1.0.1',state='FAILED')
        with self.assertRaisesRegex(c.Refused,'host-completion-delivery-protected'):
            host_completion.declare_host_completion(self.admin,args)
        existing.delete()
        receipt = host_completion.declare_host_completion(self.admin,args)
        self.run.refresh_from_db()
        self.plan.refresh_from_db()
        self.assertTrue(receipt['delivery_withdrawn'])
        self.assertEqual(self.run.mandate['criteria'],['specification'])
        self.assertEqual(self.plan.policy['checks'],original['checks'])
        self.assertEqual(self.plan.policy['nature'],'development')
        self.assertEqual(self.plan.policy['requirements'],[])
        self.assertEqual(m.Event.objects.get(run=self.run,kind='host-completion-authorized')
                         .data['previous_delivery_policy']['policy'],original)
        op.refresh_from_db()
        index.refresh_from_db()
        self.assertEqual((op.receipt,op.receipt_digest),original_receipt)
        self.assertEqual(index.state,'RELEASED')

    def test_paused_finalization_can_prepare_local_release_before_any_git_effect(self):
        self.plan.policy = {**self.plan.policy,'nature':'development','requirements':[]}
        self.plan.digest = c.digest(self.plan.policy)
        self.plan.phase = 'FINALIZING'
        self.plan.missing = ['statistics-project-busy']
        self.plan.save()
        self.run.state = 'FINALIZING'
        self.run.suspension = 'PAUSE'
        self.run.save()
        args = {**self.scope,'request_id':'prepare','prepare_local_release':True,
                'expected_policy_digest':self.plan.digest,'expected_framing_digest':self.run.mandate['framing_digest'],
                'authorization':'Le développeur confirme la clôture locale sans publication.'}
        effect = m.TerminalGitCommit.objects.create(project=self.project,run=self.run,branch='TERMINÉ',state='FAILED')
        with self.assertRaisesRegex(c.Refused,'host-completion-delivery-protected'):
            host_completion.declare_host_completion(self.admin,args)
        effect.delete()
        result = host_completion.declare_host_completion(self.admin,args)
        self.run.refresh_from_db()
        self.assertEqual((self.run.state,self.run.suspension),('FINALIZATION_PENDING','PAUSE'))
        self.assertFalse(self.run.configuration['terminal_git']['required'])
        self.assertFalse(result['delivered'])
        self.assertEqual(host_completion.declare_host_completion(self.admin,args),result)
