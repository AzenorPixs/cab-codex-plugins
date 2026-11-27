"""Reprise administrative d'un commit jamais dispatché ; reçus originaux intacts."""
import ast
import copy
import json
import re
import threading
import tomllib
from contextvars import ContextVar
from pathlib import Path
from django.db import connection,transaction
from .core import commands as c
from .core.models import Actor,Event,GitDelivery,GitDeliveryStep,GitSessionEffect,GitFileReservation,GitSessionIndex,Operation,Lease,Maintenance
from . import session_delivery as delivery
from .connector_process import identity

VERSION=r'(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){0,6}'
ACTIONS={'inspect_precommit','resume_precommit','status_precommit'}
_MANUAL=ContextVar('cab_precommit_manual_resolutions',default=None)

def metadata(raw,path):
    """Normalisation comparatrice seulement ; aucun octet de fichier n'est réécrit."""
    if len(raw)>1048576:return None
    try:
        text=raw.decode('utf-8');name=Path(path).name;value=None;normalized=None
        if name in ('package.json','package-lock.json') or path.endswith('/.codex-plugin/plugin.json'):
            data=json.loads(text);value=data.get('version')
            if not isinstance(value,str) or not re.fullmatch(VERSION,value):return None
            rest=copy.deepcopy(data);rest['version']='CAB_VERSION'
            if name=='package-lock.json':
                if rest.get('packages',{}).get('',{}).get('version')!=value:return None
                rest['packages']['']['version']='CAB_VERSION'
            normalized=re.sub(r'("version"\s*:\s*)"'+VERSION+r'"',r'\1"CAB_VERSION"',text)
            return value,normalized.encode(),rest
        if name=='pyproject.toml':
            data=tomllib.loads(text);value=data.get('project',{}).get('version')
            matches=list(re.finditer(r'(?m)^version\s*=\s*([\'"])('+VERSION+r')\1\s*$',text))
        elif name=='__init__.py':
            tree=ast.parse(text);values=[ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='__version__' for t in n.targets)]
            if len(values)!=1:return None
            value=values[0];matches=list(re.finditer(r'(?m)^__version__\s*=\s*([\'"])('+VERSION+r')\1\s*$',text))
        elif name=='SKILL.md':
            matches=list(re.finditer(r'(?m)^# [^\n]+? ('+VERSION+r')\s*$',text))
            if len(matches)!=1:return None
            match=matches[0];return match[1],(text[:match.start(1)]+'CAB_VERSION'+text[match.end(1):]).encode(),None
        elif name.endswith('.md') and text.startswith('---\n'):
            end=text.find('\n---\n',4)
            if end<0:return None
            matches=list(re.finditer(r'(?m)^version:\s*('+VERSION+r')\s*$',text[:end]))
            if len(matches)!=1:return None
            match=matches[0];return match[1],(text[:match.start(1)]+'CAB_VERSION'+text[match.end(1):]).encode(),None
        else:return None
        if len(matches)!=1 or not isinstance(value,str) or not re.fullmatch(VERSION,value) or matches[0][2]!=value:return None
        match=matches[0];normalized=text[:match.start(2)]+'CAB_VERSION'+text[match.end(2):]
        return value,normalized.encode(),None
    except (ValueError,SyntaxError,TypeError,UnicodeError,KeyError,AttributeError):return None

def entry(project,options,env,revision,path):
    if revision==':':result=delivery._git(project,options,{**env,'GIT_LITERAL_PATHSPECS':'1'},'ls-files','--stage','-z','--',path)
    else:result=delivery._git(project,options,{**env,'GIT_LITERAL_PATHSPECS':'1'},'ls-tree','-z',revision,'--',path)
    c.require(result.returncode==0,'precommit-entry-unavailable')
    rows=[r for r in result.stdout.split(b'\0') if r]
    if not rows:return None
    c.require(len(rows)==1,'precommit-entry-ambiguous')
    header,name=rows[0].split(b'\t',1);fields=header.split()
    c.require(name.decode()==path and len(fields)==3 and (fields[2]==b'0' if revision==':' else fields[1]==b'blob'),'precommit-entry-invalid')
    return {'mode':fields[0].decode(),'oid':fields[1 if revision==':' else 2].decode()}

def overlays(project,options,env,head,names,version):
    result={}
    for path in names:
        current=entry(project,options,env,head,path);staged=entry(project,options,env,':',path)
        if not current or not staged or current==staged or current['mode']!=staged['mode'] or current['mode'] not in ('100644','100755'):continue
        parts=[]
        for item in (current,staged):
            size=delivery._git(project,options,env,'cat-file','-s',item['oid'])
            if size.returncode!=0 or int(size.stdout)>1048576:break
            blob=delivery._git(project,options,env,'cat-file','blob',item['oid'])
            if blob.returncode!=0:break
            parts.append(metadata(blob.stdout,path))
        if len(parts)==2 and all(parts) and parts[1][0]==version and parts[0][1:]==parts[1][1:]:result[path]={'head':current,'staged':staged,'previous_version':parts[0][0],'version':version}
    return result

def validate_resolutions(project,options,source_env,head,names,resolutions):
    c.require(isinstance(resolutions,dict) and len(resolutions)<=128 and all(isinstance(path,str) for path in resolutions),'precommit-resolutions-invalid')
    checked={}
    for path,item in sorted(resolutions.items()):
        c.require(isinstance(path,str) and path in names and isinstance(item,dict) and set(item)=={'head','staged','diff_sha256'},'precommit-resolution-outside-scope')
        c.safe_path(Path(project.root),path,exists=False)
        current=entry(project,options,source_env,head,path);staged=entry(project,options,source_env,':',path)
        c.require(current and staged and current['mode'] in ('100644','100755') and staged['mode'] in ('100644','100755') and current==item['head'] and staged==item['staged'],'precommit-resolution-stale')
        diff=delivery._git(project,options,{**source_env,'GIT_LITERAL_PATHSPECS':'1'},'diff','--cached','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',head,'--',path)
        c.require(diff.returncode==0 and len(diff.stdout)<=33554432 and __import__('hashlib').sha256(diff.stdout).hexdigest()==item['diff_sha256'],'precommit-resolution-stale')
        checked[path]=item
    return checked

def rebase_index(project,options,env,source_env,own_env,base,head,names,version,manual=None):
    selected=overlays(project,options,source_env,head,names,version)
    manual=validate_resolutions(project,options,source_env,head,names,manual if manual is not None else _MANUAL.get() or {})
    c.require(not set(selected)&set(manual),'precommit-resolution-ambiguous')
    selected.update(manual)
    normal=[path for path in names if path not in selected]
    if normal:
        patch=delivery._git(project,options,{**source_env,'GIT_LITERAL_PATHSPECS':'1'},'diff','--cached','--binary','--full-index','--no-ext-diff','--no-textconv','--no-renames',base,'--',*normal,timeout=60)
        c.require(patch.returncode==0 and len(patch.stdout)<=33554432,'session-delivery-rebase-unavailable')
        applied=delivery._git(project,options,own_env,'apply','--cached','--3way','--whitespace=nowarn','-',data=patch.stdout,timeout=60)
        c.require(applied.returncode==0,'session-delivery-rebase-conflict')
    for path,item in selected.items():
        staged=item['staged'];added=delivery._git(project,options,own_env,'update-index','--add','--cacheinfo',staged['mode']+','+staged['oid']+','+path)
        c.require(added.returncode==0,'session-delivery-rebase-conflict')
    changed=set(delivery._changed_paths(project,options,own_env,head))
    c.require(changed.issubset(set(names)),'session-delivery-rebase-conflict')
    for path in set(names)-changed:
        c.require(entry(project,options,source_env,':',path)==entry(project,options,env,head,path),'session-delivery-rebase-conflict')
    return selected


def admin(actor):c.require(actor.active and actor.pk=='system-admin' and actor.uid==0 and actor.role=='admin','precommit-local-administrator-required',403)

def attest_statistics_only_full_recovery(current, options, env, head):
    """Conserve l'arbre CICDF et atteste les seules entrées partagées variables."""
    import copy
    import hashlib
    from .core.models import StatisticsJob
    from .git_commit_remove import OID
    from .session_git import shared_scope_digest

    git_plan = current.plan['git']
    frozen = git_plan.get('full')
    c.require(current.plan.get('scope') == 'project' and isinstance(frozen, dict)
              and frozen.get('head') == head and OID.fullmatch(frozen.get('tree', ''))
              and frozen.get('paths') == git_plan['paths'],
              'precommit-closed-full-plan-required')
    adoption = frozen.get('adoption') or {}
    c.require(adoption.get('complete') is True and adoption.get('paths') == frozen['paths'],
              'precommit-closed-full-plan-required')
    project = current.project
    cat = delivery._git(project, options, env, 'cat-file', '-t', frozen['tree'])
    c.require(cat.returncode == 0 and cat.stdout.strip() == b'tree',
              'precommit-frozen-tree-unavailable')
    staged = delivery._changed_paths(project, options, env, head)
    c.require(staged and all(p in adoption['paths'] and delivery.managed_statistics_path(p) for p in staged),
              'precommit-shared-index-code-divergent')
    witnesses = []
    for path in sorted(staged):
        blob = delivery._git(project, options, env, 'show', ':' + path)
        c.require(blob.returncode == 0, 'precommit-statistics-proof-required')
        sha = hashlib.sha256(blob.stdout).hexdigest()
        job = StatisticsJob.objects.filter(
            project=project, state='COMPLETED',
            result__indexed_documents__contains={path: {'state': 'COMPLETED', 'sha256': sha}},
        ).order_by('pk').first()
        c.require(job is not None, 'precommit-statistics-proof-required')
        witnesses.append({'path':path,'sha256':sha,'job_id':job.pk,'request_id':job.request_id})

    filemode_result=delivery._git(project,options,env,'config','--bool','--get','core.filemode')
    c.require(filemode_result.returncode==1 or filemode_result.returncode==0 and filemode_result.stdout.strip() in (b'true',b'false'),'precommit-full-filemode-unavailable')
    use_filemode = filemode_result.stdout.strip() != b'false'
    root = Path(project.root)
    for path in frozen['paths']:
        if delivery.managed_statistics_path(path):
            continue
        target = c.safe_path(root,path,exists=False)
        tree = delivery._git(project,options,env,'ls-tree',frozen['tree'],'--',path)
        c.require(tree.returncode == 0,'precommit-frozen-tree-unavailable')
        fields = tree.stdout.split(b'\t',1)[0].split()
        if not fields:
            c.require(not target.exists(),'precommit-full-working-tree-changed')
            continue
        c.require(len(fields)==3 and fields[0] in (b'100644', b'100755')
                  and fields[1]==b'blob' and target.is_file(),
                  'precommit-full-working-tree-changed')
        file = delivery._git(project,options,env,'hash-object','--no-filters','--',path)
        c.require(file.returncode==0 and file.stdout.strip()==fields[2]
                  and (not use_filemode or bool(target.stat().st_mode & 0o100)==(fields[0]==b'100755')),
                  'precommit-full-working-tree-changed')
    current_digest=shared_scope_digest(project,options,env,adoption['paths'])
    candidate=copy.deepcopy(frozen)
    candidate['adoption']['shared_digest']=current_digest
    return {'full':candidate,'statistics_witnesses':witnesses,'observed_filemode':use_filemode}


def snapshot(current,admission=None,resolutions=None):
    """CAS en lecture seule ; le PID d'un service vivant n'est pas un état de thread."""
    from .git_commit_remove import context
    from .core.native_access import root_for
    run=current.run;index=current.git_index;version=current.version
    root_for(run);c.require(run.state in ('WORKING','FINALIZATION_PENDING'),'precommit-run-protected');c.require(run.actor.active and not run.suspension and not run.review and not run.mandate.get('native_frozen_at') and not run.mandate.get('legacy_snapshot_id'),'precommit-run-protected')
    c.require(current.state==('RUNNING' if admission else 'PARTIAL') and not current.commit_oid and not current.tag_oid and index.state=='OPEN','precommit-state-protected')
    steps=list(current.steps.order_by('key'));by={s.key:s for s in steps}
    c.require(by['version'].state==by['version-projection'].state=='COMPLETED','precommit-step-protected')
    if admission:
        expected={'recovery_event':admission.pk,'attempt_request_id':admission.data['receipt']['attempt_request_id'],'original_failed_effect_id':admission.data['receipt']['original_effect_id']}
        c.require(by['commit'].state=='RUNNING' and by['commit'].receipt==expected,'precommit-step-protected')
        failed_commit=next(item['receipt'] for item in admission.data['original_failed_state']['steps'] if item['key']=='commit')
    else:
        c.require(by['commit'].state=='FAILED','precommit-step-protected')
        failed_commit=by['commit'].receipt
    statistics_only=failed_commit=={'error':'session-delivery-shared-index-conflict'} and current.plan.get('scope')=='project'
    c.require(statistics_only or failed_commit=={'error':'session-delivery-rebase-conflict'},'precommit-step-protected')
    c.require(all(s.state=='PENDING' and not s.receipt for s in steps if s.key not in ('version','version-projection','commit')),'precommit-downstream-dispatched')
    failed=GitSessionEffect.objects.get(run=run,request_id='delivery-'+str(current.pk)+'-commit')
    c.require(failed.git_index_id==index.pk and failed.state=='FAILED' and not failed.receipt,'precommit-original-effect-protected')
    c.require(not Operation.objects.filter(run__project_id=current.project_id).exclude(state__in=c.TERMINAL).exists() and not Lease.objects.filter(run__project_id=current.project_id,state='HELD').exists(),'precommit-effects-protected')
    c.require(not GitSessionEffect.objects.filter(git_index__change__project_id=current.project_id,state__in=['INTENT','RUNNING','UNKNOWN']).exists() and not Maintenance.objects.filter(state__in=['PREPARED','INSTALLING']).exists(),'precommit-effects-protected')
    c.require(c.revision(run)==current.plan['source_revision'],'precommit-source-changed')
    validations=[op for op in Operation.objects.filter(run=run,state='COMPLETED',source_revision=current.plan['source_revision']).order_by('pk') if op.receipt.get('exit_code')==0 and op.receipt_digest==c.digest(op.receipt)]
    c.require(validations,'precommit-validation-missing')
    native=c.resolve_native(run.actor,run.project,run.session_id,{'source_file':run.mandate['native_source']['source_file']},run=run)
    c.require(native==run.mandate['native_source'],'native-source-resume-required')
    options,env=context(current.project);branch,head=delivery._head(current.project,options,env)
    c.require(head==current.plan['git']['head'] and branch==current.plan['git']['branch'],'precommit-head-changed')
    digest=delivery._index_digest(index.index_path,current.project.owner_uid)
    c.require(digest==current.plan['git']['index_digest'],'precommit-index-changed')
    from hashlib import sha256
    from .session_git import delivery_files
    reservations=[{'path':path,'path_digest':sha256(path.encode()).hexdigest(),'git_index_id':index.pk}
                  for path in delivery_files(index)]
    names=delivery._changed_paths(current.project,options,{**env,'GIT_INDEX_FILE':index.index_path},index.base_head)
    c.require(names and set(names).issubset({r['path'] for r in reservations}),'precommit-reservations-changed')
    from .session_git import git_snapshot,shared_scope_digest
    if not statistics_only:
        c.require(not (delivery.unstaged_code_paths(git_snapshot(current.project,index.index_path))&{r['path'] for r in reservations}),'precommit-source-changed')
    c.require(delivery._git(current.project,options,env,'show-ref','--verify','--quiet','refs/tags/'+version).returncode==1,'precommit-tag-present')
    from .project_metadata import read_metadata
    c.require(read_metadata(current.project.root,project=current.project).get('values',{}).get('PROJECT_VERSION')==version,'precommit-version-changed')
    import hashlib
    env_sha=hashlib.sha256((Path(current.project.root)/'project.env').read_bytes()).hexdigest()
    c.require(env_sha==by['version'].receipt['after_sha256'],'precommit-version-changed')
    c.require((current.project.public_metadata or {}).get('values',{}).get('PROJECT_VERSION')==version,'precommit-projection-changed')
    source_env={**env,'GIT_INDEX_FILE':index.index_path}
    if admission:resolutions=admission.data['original_failed_state']['resolutions']
    full_recovery={}
    if statistics_only:
        c.require(not resolutions,'precommit-full-manual-overlay-forbidden')
        resolved={}
        chosen={}
        full_recovery=attest_statistics_only_full_recovery(current,options,env,head)
    else:
        resolved=validate_resolutions(current.project,options,source_env,head,names,resolutions or {})
        chosen=overlays(current.project,options,source_env,head,names,version)
        c.require(not set(resolved)&set(chosen),'precommit-resolution-ambiguous')
    return {'delivery_id':current.pk,'project_id':current.project_id,'project_root':current.project.root,'owner_uid':current.project.owner_uid,'owner_gid':current.project.owner_gid,'run_id':run.run_id,'session_id':run.session_id,'actor_id':run.actor_id,'generation':run.generation,'run_state':run.state,'version':version,'policy_digest':run.finalization_plan.digest,'framing_digest':run.mandate['framing_digest'],'source_revision':current.plan['source_revision'],'plan_digest':c.digest(current.plan),'native_source':native,'validations':[{'id':op.pk,'receipt_digest':op.receipt_digest} for op in validations],'head':head,'branch':branch,'base_head':index.base_head,'index_id':index.pk,'index_path':index.index_path,'index_digest':digest,'reservations':reservations,'shared_digest':shared_scope_digest(current.project,options,env,names),'version_file_sha256':env_sha,'steps':[next(item for item in admission.data['original_failed_state']['steps'] if item['key']=='commit') if admission and s.key=='commit' else {'id':s.pk,'key':s.key,'state':s.state,'receipt':s.receipt} for s in steps],'original_effect':{'id':failed.pk,'state':failed.state,'receipt':failed.receipt,'request_id':failed.request_id,'request_digest':failed.request_digest},'metadata_overlays':chosen,'resolutions':resolved,'mutation_dispatched':False,**full_recovery}

def _worker(delivery_id,event_id,request_id):
    from django.db import close_old_connections
    close_old_connections()
    try:
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
        token=None
        try:
            current=GitDelivery.objects.select_related('run__actor','run__project','project','git_index').get(pk=delivery_id)
            admission=Event.objects.get(pk=event_id,run=current.run,kind='precommit-recovery-admitted')
            observed=snapshot(current,admission)
            c.require(c.digest(observed)==admission.data['receipt']['expected_state_digest'],'precommit-cas-changed')
            token=_MANUAL.set(observed['resolutions'])
            scope = {'full':observed['full']} if 'full' in observed else {}
            if 'publication_reports' in current.plan['git']:
                scope['publication_reports']=current.plan['git']['publication_reports']
            receipt=delivery.commit_session(current.run.actor,{'project_id':current.project_id,'run_id':current.run.run_id,'request_id':request_id,'version':current.version,'expected_index_digest':current.plan['git']['index_digest']},**scope)
        except c.Refused as error:
            uncertain=error.code in ('session-delivery-result-unknown','session-git-effect-unresolved')
            delivery._set_step(delivery_id,'commit','UNKNOWN' if uncertain else 'FAILED',{'error':error.code,'recovery_event':event_id,'attempt_request_id':request_id})
            delivery._set_delivery_state(delivery_id,'UNKNOWN' if uncertain else 'PARTIAL');return
        finally:
            if token is not None:_MANUAL.reset(token)
            with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])
        with transaction.atomic():
            row=GitDelivery.objects.select_for_update().get(pk=delivery_id)
            row.commit_oid=receipt['commit'];row.tag_oid=receipt['tag_oid'];row.save(update_fields=['commit_oid','tag_oid','updated'])
        delivery._set_step(delivery_id,'commit','COMPLETED',{**receipt,'recovery_event':event_id,'attempt_request_id':request_id})
        delivery._continue_after_commit(delivery_id,receipt)
    except Exception as error:
        delivery._set_delivery_state(delivery_id,'UNKNOWN')
        current=GitDelivery.objects.select_related('run').get(pk=delivery_id)
        c.event(current.run,'precommit-recovery-interrupted',{'admission_event':event_id,'error_type':type(error).__name__,'replay':False})
    finally:close_old_connections()

def launch(delivery_id,event_id,request_id):
    try:threading.Thread(target=_worker,args=(delivery_id,event_id,request_id),name='cab-precommit-recovery',daemon=True).start()
    except RuntimeError:delivery._set_delivery_state(delivery_id,'UNKNOWN')

def dispatch(actor,data):
    admin(actor)
    basic={'action','project_id','run_id','delivery_id'};action=data.get('action')
    required=basic if action=='inspect_precommit' else basic|{'request_id'} if action=='status_precommit' else basic|{'request_id','expected_state','reason'}
    optional={'resolutions'} if action=='inspect_precommit' else {'resolution_approval'} if action=='resume_precommit' else set()
    c.require(action in ACTIONS and required<=set(data)<=required|optional and type(data['delivery_id']) is int,'precommit-fields-invalid',400)
    if action!='inspect_precommit':c.identifier(data['request_id'])
    if action=='resume_precommit':c.require(isinstance(data['expected_state'],dict) and isinstance(data['reason'],str) and 20<=len(data['reason'])<=4000,'precommit-authorization-required',400)
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    admitted=None
    try:
        with transaction.atomic():
            current=GitDelivery.objects.select_for_update(of=('self',)).select_related('run__actor','run__project','project','git_index').get(pk=data['delivery_id'])
            c.require(current.project_id==data['project_id'] and current.run.run_id==data['run_id'],'precommit-identity-divergent')
            c.scope(actor,current.project)
            if action!='inspect_precommit':
                prior=Event.objects.filter(run=current.run,kind='precommit-recovery-admitted',data__request_id=data['request_id']).first()
                if action=='status_precommit':
                    c.require(prior is not None and prior.data['delivery_id']==current.pk,'precommit-recovery-not-found')
                    return {'admission':prior.data['receipt'],'delivery':delivery._delivery_view(current),'replay':False}
                digest=c.digest(data)
                if prior:
                    c.require(prior.data.get('request_digest')==digest,'precommit-request-conflict')
                    return {'admission':prior.data['receipt'],'delivery':delivery._delivery_view(current),'replay':False}
            resolutions=data.get('resolutions',{}) if action=='inspect_precommit' else data['expected_state'].get('resolutions',{})
            observed=snapshot(current,resolutions=resolutions)
            if action=='inspect_precommit':return {'expected_state':observed,'effects_issued':False}
            c.require(c.digest(observed)==c.digest(data['expected_state']),'precommit-cas-changed')
            approval=data.get('resolution_approval')
            if observed['resolutions']:
                c.require(isinstance(approval,dict) and set(approval)=={'paths_digest','owner_reference','reviewer_reference'} and approval['paths_digest']==c.digest(observed['resolutions']) and all(isinstance(approval[k],str) and 10<=len(approval[k])<=4000 for k in ('owner_reference','reviewer_reference')),'precommit-resolution-approval-required')
            else:c.require(approval is None,'precommit-resolution-approval-invalid')
            request_id='RECOVER-'+c.digest([current.pk,data['request_id'],observed])[:64]
            receipt={'delivery_id':current.pk,'request_id':data['request_id'],'attempt_request_id':request_id,'original_effect_id':observed['original_effect']['id'],'expected_state_digest':c.digest(observed),'version_replayed':False,'version_projection_replayed':False}
            c.event(current.run,'precommit-recovery-admitted',{'delivery_id':current.pk,'request_id':data['request_id'],'request_digest':digest,'authority':actor.pk,'reason':data['reason'],'resolution_approval':approval,'original_failed_state':observed,'receipt':receipt})
            event=Event.objects.filter(run=current.run,kind='precommit-recovery-admitted',data__request_id=data['request_id']).get()
            current.state='RUNNING';current.executor=identity(__import__('os').getpid());current.save(update_fields=['state','executor','updated'])
            step=GitDeliveryStep.objects.select_for_update().get(delivery=current,key='commit')
            original_commit=next(item['receipt'] for item in observed['steps'] if item['key']=='commit')
            c.require(step.state=='FAILED' and step.receipt==original_commit,'precommit-step-protected')
            step.state='RUNNING';step.receipt={'recovery_event':event.pk,'attempt_request_id':request_id,'original_failed_effect_id':observed['original_effect']['id']};step.save(update_fields=['state','receipt','updated'])
            admitted=(current.pk,event.pk,request_id)
        launch(*admitted)
        return {'admission':receipt,'state':'ADMITTED','replay':False}
    finally:
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])
