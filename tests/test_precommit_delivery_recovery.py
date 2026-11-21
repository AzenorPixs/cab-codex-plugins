"""Qualification isolée du bootstrap ; aucun reçu/source de livraison réel modifié."""
import os,sys,json,uuid,copy,hashlib,tempfile,importlib.util,types,threading
from pathlib import Path
from unittest.mock import patch,Mock
import unittest
sys.path.insert(0,os.environ.get('CAB_TEST_SOURCE',str(Path(__file__).resolve().parents[1]/'src')));os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django;django.setup()
from django.db import transaction,connection,close_old_connections
import cab_platform
from cab_platform import session_delivery as d,delivery_recovery as r
from cab_platform.core import commands as c
from cab_platform.core import models as m
from cab_platform.git_commit_remove import context
from cab_platform.session_git import _index_path
sys.path.insert(0,str(Path.cwd()/'tests'))
import test_git_commit_metadata as fixture

class MetadataTests(unittest.TestCase):
 def test_only_declared_version_changes_are_equal(self):
  cases=[('pyproject.toml',b'[project]\nversion = "3.2.24"\nname="example"\n'),('src/pkg/__init__.py',b'__version__ = "3.2.24"\n'),('frontend/package.json',b'{"name":"example","version":"3.2.24","dependencies":{"dep":"1.0.0"}}\n'),('frontend/package-lock.json',b'{"version":"3.2.24","packages":{"":{"version":"3.2.24"},"dep":{"version":"1.2.3"}}}\n'),('integrations/foo/.codex-plugin/plugin.json',b'{"name":"FOO","version":"3.2.24"}\n'),('a/skills/foo/SKILL.md',b'---\nname: FOO\n---\n\n# FOO 3.2.24\n\nTexte stable.\n'),('commands/FOO.md',b'---\nversion: 3.2.24\ndescription: Exemple\n---\nTexte stable.\n')]
  for path,old in cases:
   new=old.replace(b'3.2.24',b'3.2.25');left=r.metadata(old,path);right=r.metadata(new,path)
   with self.subTest(path=path):self.assertIsNotNone(left);self.assertEqual(left[1:],right[1:]);self.assertEqual(right[0],'3.2.25')
 def test_unsupported_metadata_structure_is_refused_without_unexpected_error(self):
  for path,raw in [('package.json',b'[]'),('package-lock.json',b'{"version":"3.2.25","packages":[]}'),('pyproject.toml',b'project="unsupported"\n')]:
   with self.subTest(path=path):self.assertIsNone(r.metadata(raw,path))
 def test_dependency_and_other_content_change_are_not_erased(self):
  old=b'{"version":"3.2.24","dependencies":{"dep":{"version":"3.2.24"}}}'
  new=old.replace(b'3.2.24',b'3.2.25')
  self.assertNotEqual(r.metadata(old,'package.json')[1:],r.metadata(new,'package.json')[1:])
  self.assertIsNone(r.metadata(b'const version="3.2.25"','src/code.ts'))
  self.assertNotEqual(r.metadata(b'__version__="3.2.24"\nX=1\n','__init__.py')[1:],r.metadata(b'__version__="3.2.25"\nX=2\n','__init__.py')[1:])

class RecoveryTests(unittest.TestCase):
 def setUp(self):
  self.tx=transaction.atomic();self.tx.__enter__();self.addCleanup(self.rollback)
  self.git=fixture.MetadataTests('test_dates_et_signatures_protegees');self.git.setUp();self.addCleanup(self.git.doCleanups)
  self.root=self.git.root;self.path='src/example/__init__.py';self.manual_path='approved.txt';p=self.root/self.path;p.parent.mkdir(parents=True);p.write_text('__version__ = "3.2.18"\n')
  (self.root/self.manual_path).write_text('base18\n');self.git.git('add',self.path,self.manual_path);self.git.git('commit','-m','base');self.base=self.git.git('rev-parse','HEAD').strip()
  p.write_text('__version__ = "3.2.24"\n');(self.root/self.manual_path).write_text('head24\n');self.git.git('add',self.path,self.manual_path);self.git.git('commit','-m','head24');self.head=self.git.git('rev-parse','HEAD').strip();p.write_text('__version__ = "3.2.25"\n');(self.root/self.manual_path).write_text('reviewed25\n')
  (self.root/'project.env').write_text('PROJECT_VERSION="3.2.25"\n');key=uuid.uuid4().hex
  self.project=m.Project.objects.create(pk=key,root=str(self.root),owner_uid=os.getuid(),owner_gid=os.getgid(),public_metadata={'values':{'PROJECT_VERSION':'3.2.25','GIT_USER_NAME':'Fixture','GIT_USER_EMAIL':'fixture@example.invalid'}})
  self.actor=m.Actor.objects.create(pk=key,uid=os.getuid(),agent='fixture',token_hash=key);self.actor.projects.add(self.project)
  self.admin=m.Actor.objects.get(pk='system-admin')
  self.run=c.begin_run(self.actor,{'project_id':key,'run_id':'FIXTURE','session_id':'SID-'+key,'mode':'direct','change':'fixture','paths':[self.path,self.manual_path],'criteria':['fixture'],'decisions_resolved':True,'finalization':{'checks':[{'id':'unit','argv':['/bin/true'],'criteria':['fixture']}]}})
  self.run.mandate={**self.run.mandate,'native_source':{'source_file':str(self.root/'native.jsonl'),'uid':os.getuid()}};self.run.save()
  resolver=patch.object(c,'resolve_native',side_effect=lambda actor,project,sid,data,run=None:run.mandate['native_source']);resolver.start();self.addCleanup(resolver.stop)
  self.index=m.GitSessionIndex.objects.create(change=self.run.change_record,session=self.run.coding_session,initial_run=self.run,base_head=self.base,state='OPEN')
  self.options,self.env=context(self.project);path=_index_path(self.project,self.index,self.options,self.env);self.index.index_path=path;self.index.save();self.own={**self.env,'GIT_INDEX_FILE':path}
  self.assertEqual(d._git(self.project,self.options,self.own,'read-tree',self.base).returncode,0)
  self.assertEqual(d._git(self.project,self.options,self.own,'add','--',self.path).returncode,0)
  m.GitFileReservation.objects.create(project=self.project,git_index=self.index,path=self.path,path_digest=hashlib.sha256(self.path.encode()).hexdigest())
  receipt={'exit_code':0,'output':'fixture'};m.Operation.objects.create(run=self.run,request_id='fixture-proof',input_digest='fixture',source_revision=self.run.source_revision,state='COMPLETED',receipt=receipt,receipt_digest=c.digest(receipt))
  self.row=m.GitDelivery.objects.create(project=self.project,run=self.run,git_index=self.index,version='3.2.25',state='PARTIAL',executor=__import__('cab_platform.connector_process',fromlist=['identity']).identity(os.getpid()),plan={'source_revision':self.run.source_revision,'git':{'head':self.head,'branch':'refs/heads/main','index_digest':d._index_digest(path,os.getuid())}})
  sha=hashlib.sha256((self.root/'project.env').read_bytes()).hexdigest()
  for name,state,receipt in [('version','COMPLETED',{'after_sha256':sha}),('version-projection','COMPLETED',{'verified':True}),('commit','FAILED',{'error':'session-delivery-rebase-conflict'}),('build:debian','PENDING',{})]:m.GitDeliveryStep.objects.create(delivery=self.row,key=name,state=state,receipt=receipt)
  self.failed=m.GitSessionEffect.objects.create(run=self.run,git_index=self.index,request_id='delivery-'+str(self.row.pk)+'-commit',request_digest='original',state='FAILED',receipt={})
  self.basic={'project_id':key,'run_id':self.run.run_id,'delivery_id':self.row.pk}
 def rollback(self):
  if getattr(self,'committed_fixture',False):return
  transaction.set_rollback(True);self.tx.__exit__(None,None,None)
 def inspect(self):return r.dispatch(self.admin,{'action':'inspect_precommit',**self.basic})['expected_state']
 def request(self):return {'action':'resume_precommit',**self.basic,'request_id':'fixture-resume','expected_state':self.inspect(),'reason':'Qualification explicite de la reprise de fixture.'}
 def manual_resolution(self):
  self.assertEqual(d._git(self.project,self.options,self.own,'add','--',self.manual_path).returncode,0)
  m.GitFileReservation.objects.create(project=self.project,git_index=self.index,path=self.manual_path,path_digest=hashlib.sha256(self.manual_path.encode()).hexdigest())
  self.row.plan['git']['index_digest']=d._index_digest(self.index.index_path,self.project.owner_uid);self.row.save()
  diff=d._git(self.project,self.options,self.own,'diff','--cached','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',self.head,'--',self.manual_path)
  return {self.manual_path:{'head':r.entry(self.project,self.options,self.env,self.head,self.manual_path),'staged':r.entry(self.project,self.options,self.own,':',self.manual_path),'diff_sha256':hashlib.sha256(diff.stdout).hexdigest()}}
 def manual_request(self,resolutions):
  state=r.dispatch(self.admin,{'action':'inspect_precommit',**self.basic,'resolutions':resolutions})['expected_state']
  return {'action':'resume_precommit',**self.basic,'request_id':'fixture-manual','expected_state':state,'reason':'Résolution manuelle explicite relue sur fixture.','resolution_approval':{'paths_digest':c.digest(resolutions),'owner_reference':'fixture-owner-review-of-exact-blobs','reviewer_reference':'fixture-reviewer-review-of-exact-blobs'}}
 def test_manual_resolution_requires_review_and_exact_blob_scope(self):
  resolutions=self.manual_resolution();data=self.manual_request(resolutions)
  without={k:v for k,v in data.items() if k!='resolution_approval'}
  with patch.object(r,'launch') as launch:
   with self.assertRaisesRegex(c.Refused,'approval-required'):r.dispatch(self.admin,without)
   launch.assert_not_called()
  stale=copy.deepcopy(resolutions);stale[self.manual_path]['staged']['oid']='0'*40
  with self.assertRaisesRegex(c.Refused,'resolution-stale'):self.manual_request(stale)
  outside={'outside.txt':resolutions[self.manual_path]}
  with self.assertRaisesRegex(c.Refused,'outside-scope'):self.manual_request(outside)
 def test_manually_reviewed_resolution_only_changes_private_candidate(self):
  resolutions=self.manual_resolution();data=self.manual_request(resolutions)
  with tempfile.TemporaryDirectory() as folder:
   own={**self.env,'GIT_INDEX_FILE':str(Path(folder)/'candidate')};d._git(self.project,self.options,own,'read-tree',self.head)
   names=d._changed_paths(self.project,self.options,self.own,self.base);before=Path(self.index.index_path).read_bytes()
   r.rebase_index(self.project,self.options,self.env,self.own,own,self.base,self.head,names,'3.2.25',manual=resolutions)
   self.assertEqual(d._git(self.project,self.options,own,'show',':'+self.manual_path).stdout,b'reviewed25\n')
   self.assertEqual(before,Path(self.index.index_path).read_bytes());self.assertEqual(self.git.git('rev-parse','HEAD').strip(),self.head)
  with patch.object(r,'launch'):r.dispatch(self.admin,data)
  event=m.Event.objects.get(run=self.run,kind='precommit-recovery-admitted')
  self.assertEqual(event.data['resolution_approval'],data['resolution_approval']);self.assertEqual(event.data['original_failed_state']['resolutions'],resolutions)
  def commit(*args,**kwargs):
   self.assertEqual(r._MANUAL.get(),resolutions);return {'commit':'a'*40,'tag_oid':'b'*40}
  with patch('django.db.close_old_connections'),patch.object(d,'commit_session',side_effect=commit) as actual,patch.object(d,'_continue_after_commit'):
   r._worker(self.row.pk,event.pk,event.data['receipt']['attempt_request_id']);self.assertEqual(actual.call_count,1)
  self.assertIsNone(r._MANUAL.get())
 def test_inspection_is_read_only_and_metadata_resolution_is_bounded(self):
  before=(self.git.git('rev-parse','HEAD'),Path(self.index.index_path).read_bytes(),(self.root/self.path).read_bytes())
  data=self.inspect();self.assertEqual(set(data['metadata_overlays']),{self.path});self.assertFalse(data['mutation_dispatched'])
  self.assertEqual(before,(self.git.git('rev-parse','HEAD'),Path(self.index.index_path).read_bytes(),(self.root/self.path).read_bytes()))
  self.failed.refresh_from_db();self.assertEqual((self.failed.state,self.failed.receipt),('FAILED',{}))
 def full_statistics_conflict(self):
  from cab_platform.session_git import shared_scope_digest
  path='STATISTICS.md'
  report=self.root/path
  report.write_text('rapport figé\n')
  paths=[path,self.path]
  old_digest=shared_scope_digest(self.project,self.options,self.env,paths)
  with tempfile.TemporaryDirectory() as folder:
   candidate={**self.env,'GIT_INDEX_FILE':str(Path(folder)/'candidate')}
   self.assertEqual(d._git(self.project,self.options,candidate,'read-tree',self.head).returncode,0)
   self.assertEqual(d._git(self.project,self.options,candidate,'add','--',*paths).returncode,0)
   tree=d._git(self.project,self.options,candidate,'write-tree').stdout.decode().strip()
  self.row.plan.update(scope='project')
  self.row.plan['git'].update(paths=paths,full={'head':self.head,'tree':tree,'paths':paths,'adoption':{'complete':True,'paths':paths,'shared_digest':old_digest}})
  self.row.save(update_fields=['plan'])
  m.GitDeliveryStep.objects.filter(delivery=self.row,key='commit').update(receipt={'error':'session-delivery-shared-index-conflict'})
  report.write_text('rapport CAB actualisé\n')
  self.git.git('add','--',path)
  return report

 def attest_fixture_report(self, report):
  sha=hashlib.sha256(report.read_bytes()).hexdigest()
  return m.StatisticsJob.objects.create(pk=uuid.uuid4().hex,project=self.project,request_id='fixture-statistics',action='sync',state='COMPLETED',owner_pid=os.getpid(),owner_start='',result={'indexed_documents':{'STATISTICS.md':{'state':'COMPLETED','sha256':sha}}})

 def test_full_recovery_keeps_original_plan_and_dispatches_frozen_scope(self):
  report=self.full_statistics_conflict()
  witness=self.attest_fixture_report(report)
  original=copy.deepcopy(self.row.plan)
  observed=self.inspect()
  self.assertEqual(observed['full']['tree'],original['git']['full']['tree'])
  self.assertNotEqual(observed['full']['adoption']['shared_digest'],original['git']['full']['adoption']['shared_digest'])
  self.assertEqual([item['job_id'] for item in observed['statistics_witnesses']],[witness.pk])
  request=self.request()
  with patch.object(r,'launch'): receipt=r.dispatch(self.admin,request)
  attempt=receipt['admission']['attempt_request_id']
  event=m.Event.objects.get(run=self.run,kind='precommit-recovery-admitted')
  with patch('django.db.close_old_connections'),patch.object(d,'commit_session',return_value={'commit':'a'*40,'tag_oid':'b'*40}) as commit,patch.object(d,'_continue_after_commit') as continuation:
   r._worker(self.row.pk,event.pk,attempt)
   self.assertEqual(commit.call_args.kwargs['full'],observed['full'])
   continuation.assert_called_once()
  self.row.refresh_from_db();self.failed.refresh_from_db()
  self.assertEqual(self.row.plan,original)
  self.assertEqual((self.failed.state,self.failed.receipt),('FAILED',{}))
  self.assertFalse(receipt['admission']['version_replayed'])
  self.assertFalse(receipt['admission']['version_projection_replayed'])

 def test_full_recovery_refuses_unattested_statistics_or_indexed_code(self):
  report=self.full_statistics_conflict()
  with self.assertRaisesRegex(c.Refused,'statistics-proof-required'):self.inspect()
  self.attest_fixture_report(report)
  self.git.git('add','--',self.manual_path)
  with self.assertRaisesRegex(c.Refused,'shared-index-code-divergent'):self.inspect()
  self.assertFalse(m.Event.objects.filter(run=self.run,kind='precommit-recovery-admitted').exists())

 def test_full_recovery_refuses_working_code_drift_against_frozen_tree(self):
  report=self.full_statistics_conflict()
  self.attest_fixture_report(report)
  (self.root/self.path).write_text('future file\n')
  with self.assertRaisesRegex(c.Refused,'precommit-source-changed'):self.inspect()
  self.assertFalse(m.Event.objects.filter(run=self.run,kind='precommit-recovery-admitted').exists())

 def test_real_rebase_metadata_preserves_source_index_and_other_head_files(self):
  with tempfile.TemporaryDirectory() as folder:
   own={**self.env,'GIT_INDEX_FILE':str(Path(folder)/'index')};self.assertEqual(d._git(self.project,self.options,own,'read-tree',self.head).returncode,0)
   old=Path(self.index.index_path).read_bytes();result=r.rebase_index(self.project,self.options,self.env,self.own,own,self.base,self.head,[self.path],'3.2.25')
   self.assertEqual(set(result),{self.path});self.assertEqual(d._git(self.project,self.options,own,'show',':'+self.path).stdout,b'__version__ = "3.2.25"\n');self.assertEqual(Path(self.index.index_path).read_bytes(),old)
   self.assertEqual(self.git.git('rev-parse','HEAD').strip(),self.head)
 def test_real_prepare_commit_builds_only_candidate_without_moving_refs(self):
  before=Path(self.index.index_path).read_bytes();plan=d.prepare_commit(self.project,self.index,'3.2.25',[self.path])
  try:
   self.assertEqual(plan['head'],self.head);self.assertEqual(plan['paths'],[self.path])
   self.assertEqual(d._git(self.project,self.options,self.env,'show',plan['commit']+':'+self.path).stdout,b'__version__ = "3.2.25"\n')
   self.assertEqual(self.git.git('rev-parse','HEAD').strip(),self.head)
   self.assertEqual(d._git(self.project,self.options,self.env,'show-ref','--verify','--quiet','refs/tags/3.2.25').returncode,1)
   self.assertEqual(Path(self.index.index_path).read_bytes(),before)
  finally:
   for name in plan['temporary']:Path(name).unlink()
 def test_real_concurrent_code_change_is_refused(self):
  path='code.txt';(self.root/path).write_text('base\n');self.git.git('add',path);self.git.git('commit','-m','code-base');base=self.git.git('rev-parse','HEAD').strip()
  (self.root/path).write_text('ours\n');self.git.git('add',path);self.git.git('commit','-m','ours');head=self.git.git('rev-parse','HEAD').strip();(self.root/path).write_text('theirs\n')
  with tempfile.TemporaryDirectory() as folder:
   source={**self.env,'GIT_INDEX_FILE':str(Path(folder)/'source')};own={**self.env,'GIT_INDEX_FILE':str(Path(folder)/'target')}
   d._git(self.project,self.options,source,'read-tree',base);d._git(self.project,self.options,source,'add','--',path);d._git(self.project,self.options,own,'read-tree',head)
   with self.assertRaisesRegex(c.Refused,'rebase-conflict'):r.rebase_index(self.project,self.options,self.env,source,own,base,head,[path],'3.2.25')
 def test_duplicate_lost_reply_dispatches_one_attempt_and_preserves_original(self):
  data=self.request()
  with patch.object(r,'launch') as launch:
   first=r.dispatch(self.admin,data);second=r.dispatch(self.admin,data);self.assertEqual(first['admission'],second['admission']);self.assertEqual(launch.call_count,1)
  event=m.Event.objects.get(run=self.run,kind='precommit-recovery-admitted');self.assertEqual(event.data['original_failed_state']['original_effect']['state'],'FAILED')
  self.failed.refresh_from_db();self.assertEqual(self.failed.receipt,{});self.assertEqual(self.failed.state,'FAILED')
  with self.assertRaisesRegex(c.Refused,'request-conflict'):r.dispatch(self.admin,{**data,'reason':'Autorisation différente et donc demande différente.'})
 def test_state_unknown_closed_lease_and_downstream_are_protected(self):
  for state in ['CLOSED','BLOCKED','FINALIZING']:
   m.Run.objects.filter(pk=self.run.pk).update(state=state)
   with self.subTest(state=state),self.assertRaisesRegex(c.Refused,'run-protected'):self.inspect()
  m.Run.objects.filter(pk=self.run.pk).update(state='WORKING')
  self.failed.state='UNKNOWN';self.failed.save()
  with self.assertRaisesRegex(c.Refused,'effect-protected'):self.inspect()
  self.failed.state='FAILED';self.failed.save()
  resource=m.Resource.objects.create(key='fixture-lease-'+uuid.uuid4().hex);lease=m.Lease.objects.create(run=self.run,resource=resource,fencing=1)
  with self.assertRaisesRegex(c.Refused,'effects-protected'):self.inspect()
  lease.delete()
  step=m.GitDeliveryStep.objects.get(delivery=self.row,key='build:debian');step.state='RUNNING';step.save()
  with self.assertRaisesRegex(c.Refused,'downstream-dispatched'):self.inspect()
 def test_cas_change_before_admission_refuses_without_dispatch(self):
  data=self.request();(self.root/self.path).write_text('__version__ = "3.2.26"\n')
  with patch.object(r,'launch') as launch:
   with self.assertRaises(c.Refused):r.dispatch(self.admin,data)
   launch.assert_not_called()
 def changed_after_admission(self,change):
  data=self.request()
  with patch.object(r,'launch'):r.dispatch(self.admin,data)
  event=m.Event.objects.get(run=self.run,kind='precommit-recovery-admitted');change()
  with patch('django.db.close_old_connections'),patch.object(d,'commit_session') as commit,patch.object(d,'update_version') as version,patch('cab_platform.project_metadata.synchronize') as projection:
   r._worker(self.row.pk,event.pk,event.data['receipt']['attempt_request_id']);commit.assert_not_called();version.assert_not_called();projection.assert_not_called()
  self.row.refresh_from_db();self.assertEqual(self.row.state,'PARTIAL')
 def test_source_changed_after_admission_refuses_before_commit(self):
  self.changed_after_admission(lambda:(self.root/self.path).write_text('__version__ = "3.2.26"\n'))
 def test_env_changed_after_admission_refuses_before_commit(self):
  self.changed_after_admission(lambda:(self.root/'project.env').write_text('PROJECT_VERSION="3.2.26"\n'))
 def test_head_changed_after_admission_refuses_before_commit(self):
  self.changed_after_admission(lambda:self.git.git('commit','--allow-empty','-m','concurrent'))
 def test_normal_pending_delivery_runs_version_projection_and_full_continuation_once(self):
  self.failed.delete();self.row.state='PENDING';self.row.plan={**self.row.plan,'env_sha256':'fixture','forges':[{'name':'FIXTURE','remote':{},'signature':'fixture','branch':'main'}],'debian':True,'docker':False,'defer_releases':True};self.row.save()
  m.GitDeliveryStep.objects.filter(delivery=self.row).update(state='PENDING',receipt={})
  for key in ['forge:FIXTURE','release:FIXTURE','verify:FIXTURE','retire']:m.GitDeliveryStep.objects.create(delivery=self.row,key=key)
  trace=[]
  def mark(name,value):
   def call(*args,**kwargs):trace.append(name);return value
   return call
  def push(project,name,version,commit,tag,before,*rest):before({'fixture':'intent'});trace.append('forge');return {'verified':True}
  def build(project,kind,version,before):before({'fixture':'intent'});trace.append('build');return {'exit_code':0}
  def retire(pk):trace.append('retire');d._set_step(pk,'retire','RUNNING');d._set_step(pk,'retire','COMPLETED',{'verified':True})
  with patch('django.db.close_old_connections'),patch.object(d,'update_version',side_effect=mark('version',{'version':'3.2.25'})),patch('cab_platform.project_metadata.synchronize',side_effect=mark('projection',None)),patch.object(d,'commit_session',side_effect=mark('commit',{'commit':'a'*40,'tag_oid':'b'*40})),patch.object(d,'push_version',side_effect=push),patch.object(d,'execute_native_build',side_effect=build),patch.object(d,'verify_version',side_effect=mark('verify',{'verified':True})),patch.object(d,'_retire_index',side_effect=retire),patch.object(d,'attest_delivery',side_effect=mark('attest',None)):
   d._delivery_worker(self.row.pk);d._delivery_worker(self.row.pk)
  self.assertEqual(trace,['version','projection','commit','forge','build','verify','retire','attest'])
  self.row.refresh_from_db();self.assertEqual(self.row.state,'COMPLETED')
  self.assertEqual(m.GitDeliveryStep.objects.get(delivery=self.row,key='release:FIXTURE').state,'SKIPPED')
 def test_two_concurrent_admin_resumes_admit_exactly_one_attempt(self):
  data=self.manual_request(self.manual_resolution());self.tx.__exit__(None,None,None);self.committed_fixture=True
  project_id=self.project.pk;actor_id=self.actor.pk;seen=set()
  def cleanup(obj):
   key=(obj._meta.label,obj.pk)
   if key in seen or not type(obj).objects.filter(pk=obj.pk).exists():return
   seen.add(key)
   if hasattr(obj,'project_id') and obj.project_id!=project_id:raise RuntimeError('fixture-cleanup-scope-divergent')
   for relation in obj._meta.related_objects:
    if relation.many_to_many:continue
    for child in relation.related_model.objects.filter(**{relation.field.attname:obj.pk}):cleanup(child)
   obj.delete()
  def cleanup_project():
   cleanup(m.Project.objects.get(pk=project_id));m.Actor.objects.filter(pk=actor_id).delete()
   self.assertFalse(m.Project.objects.filter(pk=project_id).exists());self.assertFalse(m.Actor.objects.filter(pk=actor_id).exists())
  self.addCleanup(cleanup_project)
  barrier=threading.Barrier(2);results=[];errors=[]
  def invoke():
   close_old_connections()
   try:barrier.wait(timeout=5);results.append(r.dispatch(self.admin,copy.deepcopy(data)))
   except BaseException as error:errors.append(error)
   finally:close_old_connections()
  with patch.object(r,'launch') as launch:
   threads=[threading.Thread(target=invoke) for _ in range(2)]
   for thread in threads:thread.start()
   for thread in threads:thread.join(timeout=15)
   self.assertTrue(all(not thread.is_alive() for thread in threads));self.assertEqual(errors,[])
   self.assertEqual(len(results),2);self.assertEqual(results[0]['admission'],results[1]['admission']);self.assertEqual(launch.call_count,1)
  self.failed.refresh_from_db();self.assertEqual((self.failed.state,self.failed.receipt),('FAILED',{}))
 def test_worker_only_commits_and_continues_never_replays_version(self):
  data=self.request()
  with patch.object(r,'launch') as launch:r.dispatch(self.admin,data)
  event=m.Event.objects.get(run=self.run,kind='precommit-recovery-admitted')
  def downstream(delivery_id,receipt):d._set_delivery_state(delivery_id,'COMPLETED')
  with patch('django.db.close_old_connections'),patch.object(d,'commit_session',return_value={'commit':'a'*40,'tag_oid':'b'*40}) as commit,patch.object(d,'_continue_after_commit',side_effect=downstream) as tail,patch.object(d,'update_version') as version,patch('cab_platform.project_metadata.synchronize') as projection:
   r._worker(self.row.pk,event.pk,event.data['receipt']['attempt_request_id'])
   self.assertEqual(commit.call_count,1);self.assertEqual(tail.call_count,1);version.assert_not_called();projection.assert_not_called()
  self.row.refresh_from_db();self.assertEqual(self.row.state,'COMPLETED')
  with patch.object(r,'launch') as launch:r.dispatch(self.admin,data);launch.assert_not_called()
  self.failed.refresh_from_db();self.assertEqual(self.failed.state,'FAILED');self.assertEqual(self.failed.receipt,{})

if __name__=='__main__':unittest.main(verbosity=2)
