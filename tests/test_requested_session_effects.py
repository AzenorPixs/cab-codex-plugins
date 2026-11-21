"""Versions, autorité et effets sur Git réel ; PostgreSQL exclusivement isolé."""
import copy
import hashlib
import json
import os
from pathlib import Path
import tempfile
import types
import unittest
import uuid
from unittest.mock import MagicMock,patch

if os.environ.get('CAB_EFFECTS_FIXTURE')=='1':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
    import django
    django.setup()
import test_git_commit_metadata as fixtures
from cab_platform import package_versions as versions,requested_effects as effects,session_delivery as delivery
from cab_platform.core import commands as c


class VersionAndAuthorityTests(unittest.TestCase):
    def test_json_rewrite_keeps_dependency_versions(self):
        raw=b'{"version":"3.9.3","packages":{"":{"version":"3.9.3"},"dependency":{"version":"3.9.3"}}}'
        result=json.loads(versions.rewritten(raw,'frontend/package-lock.json','3.9.4'))
        self.assertEqual(result['version'],'3.9.4')
        self.assertEqual(result['packages']['']['version'],'3.9.4')
        self.assertEqual(result['packages']['dependency']['version'],'3.9.3')

    def test_scalar_rewrite_preserves_unrelated_content(self):
        cases=[('pyproject.toml',b'[project]\nversion = "3.9.3"\nname="cab"\n'),('src/cab_platform/__init__.py',b'"""Module."""\n__version__ = \'3.9.3\'\n'),('integrations/commands/CAB.md',b'---\nversion: 3.9.3\n---\nTexte3.9.3 conserve\n')]
        for name,raw in cases:
            with self.subTest(name=name):
                updated=versions.rewritten(raw,name,'3.9.4')
                self.assertEqual(versions.value(updated,name),'3.9.4')
                self.assertEqual(updated.replace(b'3.9.4',b'3.9.3'),raw)

    def test_inconsistent_lock_is_refused(self):
        with self.assertRaises(c.Refused):versions.value(b'{"version":"3.9.3","packages":{"":{"version":"3.9.2"}}}','frontend/package-lock.json')

    def test_missing_package_profile_does_not_assume_cab(self):
        with tempfile.TemporaryDirectory() as root:self.assertEqual(versions.require_aligned(root,'3.9.4')['versions'],{})

    def test_preflight_detects_divergent_version(self):
        with tempfile.TemporaryDirectory() as root:
            path=Path(root)/'pyproject.toml';path.write_text('[project]\nversion="3.9.3"\n')
            with patch.object(versions,'paths',return_value=['pyproject.toml']):
                with self.assertRaisesRegex(c.Refused,'package-source-version-not-aligned'):versions.require_aligned(root,'3.9.4')

    def test_piloted_coder_cannot_self_approve(self):
        actor=types.SimpleNamespace(pk='coder',active=True,role='coder')
        run=types.SimpleNamespace(actor_id='coder',mode='piloted',mandate={'orchestrator_id':'parent'})
        effects.coding_authority(actor,run)
        with self.assertRaisesRegex(c.Refused,'approval-required'):effects.approval_authority(actor,run)
        effects.approval_authority(types.SimpleNamespace(pk='parent',active=True,role='orchestrator'),run)

    def test_unknown_or_running_step_is_not_recoverable(self):
        for state in ('UNKNOWN','RUNNING'):
            row=types.SimpleNamespace(state='PARTIAL',steps=types.SimpleNamespace(values_list=lambda *args:[('commit','COMPLETED'),('build:debian','FAILED'),('release:GITHUB',state)]))
            self.assertFalse(effects.inactive_partial(row))

    def test_generic_metadata_diagnostic_does_not_expose_child_output(self):
        from cab_platform import artifact_builders as b
        marked=[]
        code=b.execute(['/usr/bin/python3.13','-c','raise RuntimeError("locked-python-vendor-required")'],marked.append,diagnostic_phase='payload-preparation')
        self.assertNotEqual(code,0)
        self.assertEqual(marked[-1]['diagnostic']['code'],'locked-python-vendor-required')
        self.assertNotIn('Traceback',json.dumps(marked))


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE')=='1','dedicated-postgresql-fixture-required')
class RequestedEffectsIntegrationTests(unittest.TestCase):
    def setUp(self):
        from django.conf import settings
        self.assertTrue(settings.DATABASES['default']['NAME'].startswith('cab_effects_fixture_'))
        from cab_platform.core import models as m
        self.m=m
        self.git=fixtures.MetadataTests('test_dates_et_signatures_protegees');self.git.setUp();self.addCleanup(self.git.doCleanups)
        self.root=self.git.root;self.git.git('reset','--hard','HEAD');(self.root/'libre.txt').unlink()
        self.path='requested.txt';(self.root/self.path).write_text('Changement qualifié\n')
        key=uuid.uuid4().hex
        self.project=m.Project.objects.create(pk=key,root=str(self.root),owner_uid=os.getuid(),owner_gid=os.getgid(),public_metadata={'values':{'PROJECT_VERSION':'3.9.4','GIT_USER_NAME':'Fixture','GIT_USER_EMAIL':'fixture@example.invalid'}})
        self.actor=m.Actor.objects.create(pk=key,uid=os.getuid(),agent='fixture',token_hash=key);self.actor.projects.add(self.project)
        self.run=c.begin_run(self.actor,{'project_id':key,'run_id':'FIXTURE-'+key,'session_id':'SID-'+key,'mode':'direct','change':'fixture','paths':[self.path],'criteria':['fixture'],'decisions_resolved':True,'finalization':{'checks':[{'id':'unit','argv':['/bin/true'],'criteria':['fixture']}]}})
        self.index=m.GitSessionIndex.objects.create(change=self.run.change_record,session=self.run.coding_session,initial_run=self.run,base_head=self.git.head,state='OPEN')
        from cab_platform.git_commit_remove import context
        from cab_platform.session_git import _index_path
        self.options,self.env=context(self.project);self.index.index_path=_index_path(self.project,self.index,self.options,self.env);self.index.save()
        self.own={**self.env,'GIT_INDEX_FILE':self.index.index_path}
        self.assertEqual(delivery._git(self.project,self.options,self.own,'read-tree',self.git.head).returncode,0)
        self.assertEqual(delivery._git(self.project,self.options,self.own,'add','--',self.path).returncode,0)
        tree=delivery._git(self.project,self.options,self.own,'write-tree').stdout.decode().strip()
        self.index.keep_ref='refs/cab/session-index/'+Path(self.index.index_path).stem;self.index.keep_oid=tree;self.index.save()
        self.git.git('update-ref',self.index.keep_ref,tree)
        self.m.GitFileReservation.objects.create(project=self.project,git_index=self.index,path=self.path,path_digest=hashlib.sha256(self.path.encode()).hexdigest())
        self.basic={'project_id':key,'run_id':self.run.run_id}
        self.validate()

    def validate(self):
        key=uuid.uuid4().hex
        self.m.Operation.objects.create(run=self.run,request_id=key,input_digest=key,state='COMPLETED',source_revision=c.revision(self.run),request={'phase':'test'},receipt={'exit_code':0})

    def authorized(self,kind='commit'):
        effects.authorize(self.actor,{**self.basic,'request_id':'approval','kind':kind,'authorization':'Validation développeur explicite de cet effet de fixture.'})
        return {**self.basic,'request_id':'effect','kind':kind,'mode':'requested','approval_id':'approval','version':'3.9.4'}

    def admit(self,data):
        with patch.object(effects,'launch') as launch:
            value=effects.request(self.actor,data)
            self.assertEqual(value['state'],'INTENT');launch.assert_called_once()
        return self.m.Event.objects.get(run=self.run,kind='session-effect-admitted',data__request_id=data['request_id'])

    def partial(self):
        self.git.git('tag','-a','3.9.4','-m','fixture')
        self.index.state='COMMITTED';self.index.save()
        row=self.m.GitDelivery.objects.create(project=self.project,run=self.run,git_index=self.index,version='3.9.4',state='PARTIAL',commit_oid=self.git.head,tag_oid=self.git.git('rev-parse','3.9.4').strip(),plan={'scope':'change','forges':[],'docker':False,'debian':True})
        for key,state in [('version','COMPLETED'),('version-projection','COMPLETED'),('commit','COMPLETED'),('build:debian','FAILED'),('retire','PENDING')]:
            receipt={'fixture_original':key}
            if key=='commit':receipt.update(commit=row.commit_oid,tag_oid=row.tag_oid,session_index_digest=delivery._index_digest(self.index.index_path,self.project.owner_uid))
            self.m.GitDeliveryStep.objects.create(delivery=row,key=key,state=state,receipt=receipt)
        return row

    def open(self,row):
        return effects.open_recovery(self.actor,{**self.basic,'request_id':'editing','delivery_id':row.pk,'scope':'project','authorization':'Le développeur autorise la reprise CICDF de cette livraison de fixture.'})

    def test_requested_commit_is_real_and_does_not_create_tag(self):
        data=self.authorized();intent=self.admit(data);tags=self.git.git('tag')
        result=effects.execute(intent.pk)
        self.assertEqual(result['state'],'COMPLETED',result)
        self.assertIsNone(result['tag']);self.assertEqual(self.git.git('tag'),tags)
        self.assertEqual(self.git.git('show','HEAD:'+self.path),'Changement qualifié\n')
        self.assertNotEqual(self.git.git('rev-parse','HEAD').strip(),self.git.head)
        self.assertFalse(self.index.reservations.filter(active=True).exists())
        with patch.object(effects,'launch') as launch:self.assertEqual(effects.request(self.actor,data),result);launch.assert_not_called()
        self.assertEqual(effects.execute(intent.pk),result)

    def test_commit_without_approval_is_refused(self):
        with self.assertRaisesRegex(c.Refused,'approval-required'):effects.request(self.actor,{**self.basic,'request_id':'no-approval','kind':'commit','mode':'requested','version':'3.9.4'})

    def test_changed_source_after_inspect_is_refused_without_effect(self):
        data=self.authorized();data['expected_state']=effects.inspect(self.actor,data)['expected_state']
        (self.root/self.path).write_text('Divergence\n')
        self.validate()
        with self.assertRaisesRegex(c.Refused,'cas-changed'):effects.request(self.actor,data)
        self.assertFalse(self.m.Event.objects.filter(run=self.run,kind='session-effect-admitted').exists())
        self.assertEqual(self.git.git('rev-parse','HEAD').strip(),self.git.head)

    def test_unknown_intent_keeps_other_effects_protected(self):
        data=self.authorized();intent=self.admit(data)
        effects.result(intent,'UNKNOWN',{'error':'fixture-unknown'})
        self.assertTrue(effects.pending(self.run))
        with self.assertRaisesRegex(c.Refused,'session-effect-unresolved'):effects.inspect(self.actor,{**data,'request_id':'other'})

    def test_conflicting_id_does_not_dispatch_again(self):
        data=self.authorized();self.admit(data)
        with patch.object(effects,'launch') as launch:
            with self.assertRaisesRegex(c.Refused,'request-conflict'):effects.request(self.actor,{**data,'message':'Autre message'})
            launch.assert_not_called()

    def test_recovery_requires_matching_failed_step(self):
        row=self.partial();self.open(row);self.run.refresh_from_db()
        with self.assertRaisesRegex(c.Refused,'failed-step-required'):effects.inspect(self.actor,{**self.basic,'kind':'commit','mode':'recovery','delivery_id':row.pk})

    def test_opening_recovery_preserves_original_receipts_and_unrelated_run(self):
        row=self.partial();original=effects.snapshot(row)
        before=list(self.m.Run.objects.exclude(pk=self.run.pk).values('pk','state','mandate','configuration'))
        self.open(row);self.run.refresh_from_db();self.index.refresh_from_db();row.refresh_from_db()
        self.assertEqual(effects.snapshot(row),original)
        self.assertEqual(self.index.state,'OPEN');self.assertEqual(effects.editable_delivery(self.run),row.pk)
        self.assertEqual(before,list(self.m.Run.objects.exclude(pk=self.run.pk).values('pk','state','mandate','configuration')))

    def test_postcommit_remediation_and_full_snapshot_are_required(self):
        row=self.partial();self.open(row);self.run.refresh_from_db()
        data={**self.basic,'kind':'resume','mode':'recovery','delivery_id':row.pk}
        with self.assertRaisesRegex(c.Refused,'session-remediation-required'):effects.inspect(self.actor,data)
        receipt=effects.remediate(self.actor,{**self.basic,'delivery_id':row.pk,'request_id':'remediate'})
        self.assertEqual(receipt['state'],'SOURCE_QUALIFICATION_REQUIRED')
        # Le banc ne contacte aucune forge réelle.
        with patch('cab_platform.closure_git.remote_plan',return_value=[]):
            state=effects.inspect(self.actor,data)['expected_state']
        self.assertIn('full',state['git']);self.assertEqual(state['remediation']['state'],'VERIFIED')

    def test_requested_native_build_keeps_own_receipt(self):
        data=self.authorized('build:debian');intent=self.admit(data)
        with patch.object(delivery,'execute_native_build',return_value={'exit_code':0,'kind':'debian','version':'3.9.4'}) as build:
            result=effects.execute(intent.pk)
        self.assertEqual(result['state'],'COMPLETED');build.assert_called_once()

    def test_postcommit_resume_creates_supplementary_commit_and_preserves_failed_receipt(self):
        row=self.partial();original=effects.snapshot(row);self.open(row);self.run.refresh_from_db()
        self.index.reservations.update(active=False)
        effects.remediate(self.actor,{**self.basic,'delivery_id':row.pk,'request_id':'remediate'})
        data={**self.basic,'request_id':'resume','kind':'resume','mode':'recovery','delivery_id':row.pk}
        with patch('cab_platform.closure_git.remote_plan',return_value=[]):intent=self.admit(data)
        def finish(delivery_id,receipt):
            self.m.GitDelivery.objects.filter(pk=delivery_id).update(state='COMPLETED')
        with patch.object(delivery,'_continue_after_commit',side_effect=finish) as continuation:
            result=effects.execute(intent.pk)
        self.assertEqual(result['state'],'COMPLETED',result);continuation.assert_called_once()
        row.refresh_from_db()
        self.assertNotEqual(row.commit_oid,self.git.head)
        self.assertEqual(self.git.git('rev-parse','3.9.4^{commit}').strip(),row.commit_oid)
        self.assertEqual(self.git.git('rev-parse','HEAD^').strip(),self.git.head)
        event=self.m.Event.objects.get(run=self.run,kind='session-postcommit-recovery-started')
        self.assertEqual(event.data['original'],original)

    def test_requested_publication_uses_native_publisher(self):
        data=self.authorized('publish:FORGEJO')
        plan={'forges':[{'name':'FORGEJO'}]}
        with patch.object(delivery,'delivery_preflight',return_value=plan):intent=self.admit(data)
        with patch.object(delivery,'execute_native_publication',return_value={'version':'3.9.4','published':True}) as publish:
            result=effects.execute(intent.pk)
        self.assertEqual(result['state'],'COMPLETED');publish.assert_called_once()

    def test_failed_commit_can_be_recovered_by_its_owner(self):
        row=self.partial();self.git.git('tag','-d','3.9.4')
        row.commit_oid='';row.tag_oid='';row.plan['git']={'head':self.git.head};row.save()
        self.index.state='OPEN';self.index.save()
        self.m.GitDeliveryStep.objects.filter(delivery=row,key='commit').update(state='FAILED')
        self.m.GitDeliveryStep.objects.filter(delivery=row,key='build:debian').update(state='PENDING')
        data={**self.basic,'request_id':'recover-commit','kind':'commit','mode':'recovery','delivery_id':row.pk}
        intent=self.admit(data)
        def finish(delivery_id,receipt):self.m.GitDelivery.objects.filter(pk=delivery_id).update(state='COMPLETED')
        with patch.object(delivery,'_continue_after_commit',side_effect=finish):answer=effects.execute(intent.pk)
        self.assertEqual(answer['state'],'COMPLETED',answer)
        self.assertEqual(self.git.git('rev-parse','3.9.4^{commit}').strip(),self.git.git('rev-parse','HEAD').strip())
        event=self.m.Event.objects.get(run=self.run,kind='session-commit-recovery-started')
        self.assertEqual(next(s['state'] for s in event.data['original']['steps'] if s['key']=='commit'),'FAILED')

    def test_unchanged_sources_resume_without_another_commit(self):
        self.git.git('add',self.path);self.git.git('commit','-m','Source déjà publiée')
        self.git.head=self.git.git('rev-parse','HEAD').strip()
        row=self.partial();self.open(row);self.run.refresh_from_db()
        effects.remediate(self.actor,{**self.basic,'delivery_id':row.pk,'request_id':'remediate'})
        data={**self.basic,'request_id':'resume-unchanged','kind':'resume','mode':'recovery','delivery_id':row.pk}
        with patch('cab_platform.closure_git.remote_plan',return_value=[]):intent=self.admit(data)
        self.assertTrue(intent.data['observed']['git']['reuse_commit'])
        def finish(delivery_id,receipt):
            self.assertEqual(effects.execute(intent.pk)['state'],'INTENT')
            self.m.GitDelivery.objects.filter(pk=delivery_id).update(state='COMPLETED')
        with patch.object(delivery,'commit_session') as commit,patch.object(delivery,'_continue_after_commit',side_effect=finish):answer=effects.execute(intent.pk)
        self.assertEqual(answer['state'],'COMPLETED',answer);commit.assert_not_called()
        self.assertEqual(self.git.git('rev-parse','HEAD').strip(),self.git.head)

    def test_version_preparation_is_reserved_and_requires_fresh_qualification(self):
        files={'src/cab_platform/__init__.py':'__version__ = "3.9.3"\n','packaging/prepare.py':'# fixture\n','pyproject.toml':'[project]\nversion="3.9.3"\n','frontend/package.json':'{"version":"3.9.3"}\n','frontend/package-lock.json':'{"version":"3.9.3","packages":{"":{"version":"3.9.3"}}}\n'}
        for name in versions.PLUGINS:
            files['integrations/codex/'+name+'/.codex-plugin/plugin.json']='{"version":"3.9.3"}\n'
            files['integrations/commands/'+name.upper()+'.md']='---\nversion: 3.9.3\n---\n'
        for name,text in files.items():
            path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
        data={**self.basic,'request_id':'prepare-version','version':'3.9.4'}
        result=versions.prepare(self.actor,data)
        self.assertEqual(len(result['updated_paths']),16)
        self.assertFalse(versions.inspect(self.root,'3.9.4')['mismatches'])
        self.assertEqual(result,versions.prepare(self.actor,data))
        self.run.refresh_from_db()
        self.assertNotEqual(c.revision(self.run),self.m.Operation.objects.filter(run=self.run).first().source_revision)
        self.assertEqual(self.index.reservations.filter(active=True,path__in=result['updated_paths']).count(),16)

    def test_failed_supplementary_commit_keeps_the_published_base_editable(self):
        row=self.partial();original=effects.snapshot(row);self.open(row);self.run.refresh_from_db()
        self.m.Event.objects.create(project=self.project,run=self.run,kind='session-postcommit-recovery-started',data={'original':original})
        self.m.GitDeliveryStep.objects.filter(delivery=row,key='commit').update(state='FAILED',receipt={'error':'session-git-reservation-required'})
        self.assertEqual(effects.editable_delivery(self.run),row.pk)
        # Une autre base n'est jamais assimilée au commit publié d'origine.
        row.commit_oid='0'*40;row.save()
        self.assertIsNone(effects.editable_delivery(self.run))

    def test_statistics_updates_do_not_change_the_code_cas(self):
        before=effects.project_source(self.run)
        report=self.root/'STATISTICS.md';report.write_text('Rapport CAB\n');self.git.git('add','STATISTICS.md')
        self.assertEqual(effects.project_source(self.run),before)
        (self.root/self.path).write_text('Code divergent\n')
        self.assertNotEqual(effects.project_source(self.run),before)

    def test_full_statistics_refresh_requires_receipts_and_preserves_code(self):
        row=self.partial();self.open(row);self.run.refresh_from_db()
        effects.remediate(self.actor,{**self.basic,'delivery_id':row.pk,'request_id':'remediate'})
        report=self.root/'STATISTICS.md';report.write_text('Rapport initial\n');self.git.git('add','STATISTICS.md')
        data={**self.basic,'kind':'resume','mode':'recovery','delivery_id':row.pk}
        with patch('cab_platform.closure_git.remote_plan',return_value=[]):old=effects.inspect(self.actor,data)['expected_state']['git']
        report.write_text('Rapport actualisé\n');self.git.git('add','STATISTICS.md')
        with self.assertRaisesRegex(c.Refused,'statistics-not-attested'):effects.refresh_full_statistics(self.run,row,old,0)
        sha=hashlib.sha256(report.read_bytes()).hexdigest()
        self.m.StatisticsJob.objects.create(pk=uuid.uuid4().hex,project=self.project,request_id='attested-report',action='sync',state='COMPLETED',owner_pid=0,owner_start='',result={'indexed_documents':{'STATISTICS.md':{'state':'COMPLETED','sha256':sha}}})
        fresh=effects.refresh_full_statistics(self.run,row,old,0)
        self.assertNotEqual(fresh['full']['tree'],old['full']['tree'])
        self.assertEqual(delivery._git(self.project,self.options,self.env,'show',fresh['full']['tree']+':'+self.path).stdout,b'Changement qualifi\xc3\xa9\n')
        self.assertEqual(self.git.git('rev-parse','HEAD').strip(),self.git.head)


if __name__=='__main__':unittest.main()
