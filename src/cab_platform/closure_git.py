"""Dernier commit de métadonnées ; état durable, jamais de rejeu incertain."""
import hashlib
import os
from pathlib import Path
from django.db import connection,transaction
from django.utils import timezone
from .connector_process import identity,alive
from .core import commands as c
from .core.models import Event,GitFileReservation,Run,TerminalGitCommit
from .git_commit_remove import context
from .session_delivery import _git,_head,_gitdir,_hooks_supported,_temp_index,_prepare_shared_index,_verify_shared_index,_finish_shared_index,_remove_own_lock
from .session_git import shared_scope_digest
from .statistics_documents import read_source


ACTIVE_STATES=('INTENT','RUNNING','UNKNOWN','FAILED')


def enabled(run):
    return run.configuration.get('terminal_git',{}).get('required') is True


def document_paths(source_path,branch):
    c.require(branch in ('TERMINÉ','BLOQUÉ'),'closure-branch-invalid',400)
    parts=Path(source_path).parts
    c.require(len(parts)>=3 and parts[:2]==('openspec','changes') and '..' not in parts,'closure-documents-invalid',400)
    paths=[source_path+'/STATISTICS.md','STATISTICS.md']
    if branch=='BLOQUÉ':paths.append(source_path+'/BLOCKERS.md')
    return paths


@transaction.atomic
def authorize(actor,data):
    c.require(actor.active and actor.role=='admin','administrator-required',403)
    c.require(set(data)=={'project_id','run_id','request_id','reason'},'closure-git-fields-invalid',400)
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    previous=Event.objects.filter(run=run,kind='terminal-git-authorized',data__request_id=key).first()
    if previous:
        c.require(previous.data.get('digest')==fingerprint,'closure-git-request-conflict',409)
        return {'enabled':True}
    c.working(run);c.require(c.no_pending(run) and not run.review and not run.mandate.get('native_frozen_at'),'closure-git-authorization-protected',409)
    c.require(isinstance(data['reason'],str) and 10<=len(data['reason'])<=4000,'closure-git-reason-required',400)
    run.configuration={**run.configuration,'terminal_git':{'required':True}}
    run.save(update_fields=['configuration','updated']);c.event(run,'terminal-git-authorized',{'request_id':key,'digest':fingerprint,'authority':actor.pk,'reason':data['reason']})
    return {'enabled':True}


def view(run):
    row=TerminalGitCommit.objects.filter(run=run).first()
    if row is None:return {'required':enabled(run),'state':'ABSENT'}
    return {'required':True,'state':row.state,'commit':row.commit_oid or None,'branch':row.branch,'receipt':row.receipt}


def frozen_documents(run,source_path,branch):
    result={}
    for path in document_paths(source_path,branch):
        c.safe_path(Path(run.project.root),path)
        foreign=GitFileReservation.objects.filter(project=run.project,path=path,active=True).exclude(git_index__session_id=run.coding_session_id).exists()
        c.require(not foreign,'closure-document-reserved',409)
        raw,info=read_source(Path(run.project.root),Path(run.project.root)/path,64*1024*1024)
        result[path]={'raw':raw,'sha256':hashlib.sha256(raw).hexdigest(),'mode':'100755' if info.st_mode&0o111 else '100644'}
    return result


def remote_plan(project,head,tag):
    from .forge_push import FORGES,context as forge_context
    from .forge_sync import refs
    from .forge_repository import identity as signature
    from .project_metadata import read_metadata
    metadata=read_metadata(project.root)
    c.require(metadata['state']=='ready','closure-git-config-invalid',409)
    targets=[]
    for forge in FORGES:
        prefix='REMOTE_'+forge+'_'
        if not any(metadata['values'].get(prefix+key) for key in ('OWNER','REPOSITORY','BRANCH')):continue
        values,owner,branch,url,group,options,env=forge_context(project,forge)
        remote,tags,_=refs(project,forge,owner,group,options,env,url,branch)
        c.require(remote==head,'closure-git-unpublished-parent',409)
        targets.append({'forge':forge,'branch':branch,'previous':remote,'signature':signature(project,values,forge),'tag':tag,'previous_tag':tags.get('refs/tags/'+tag,''),'state':'PENDING'})
    c.require(targets,'closure-git-forge-required',409)
    return targets


def send(project,target,commit,tag_oid):
    from .forge_push import context as forge_context,remote_git
    from .forge_sync import refs
    from .forge_repository import identity as signature
    from .project_metadata import read_metadata
    values,owner,branch,url,group,options,env=forge_context(project,target['forge'])
    current=read_metadata(project.root)
    c.require(current['state']=='ready' and branch==target['branch'] and signature(project,current['values'],target['forge'])==target['signature'] and signature(project,values,target['forge'])==target['signature'],'closure-git-config-changed',409)
    remote,tags,_=refs(project,target['forge'],owner,group,options,env,url,branch)
    tag_ref='refs/tags/'+target['tag']
    if remote==commit and tags.get(tag_ref)==tag_oid:return {'state':'COMPLETED','verified':True,'reconciled':True}
    c.require(remote==target['previous'] and tags.get(tag_ref,'')==target['previous_tag'],'closure-git-remote-changed',409)
    sent=remote_git(project,target['forge'],owner,group,options,env,'push','--atomic','--porcelain','--no-follow-tags','--force-with-lease=refs/heads/'+branch+':'+target['previous'],'--force-with-lease='+tag_ref+':'+target['previous_tag'],url,commit+':refs/heads/'+branch,tag_oid+':'+tag_ref,timeout=120)
    c.require(sent.returncode==0,'closure-git-push-unconfirmed',409)
    after,after_tags,_=refs(project,target['forge'],owner,group,options,env,url,branch)
    c.require(after==commit and after_tags.get(tag_ref)==tag_oid,'closure-git-push-unconfirmed',409)
    return {'state':'COMPLETED','verified':True}


def complete(run,branch,source_path):
    if not enabled(run):return None
    c.require(not connection.in_atomic_block,'closure-git-transaction-invalid',409)
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    temporary=None;shared=None;dispatched=False;row=None;admitted=False
    try:
        with transaction.atomic():
            current=Run.objects.select_for_update().select_related('project','actor').get(pk=run.pk)
            row=TerminalGitCommit.objects.select_for_update().filter(run=current).first()
            if row is not None:
                c.require(row.branch==branch,'closure-git-branch-conflict',409)
                if row.state=='COMPLETED':return row.receipt
                if row.state in ('INTENT','RUNNING') and not alive(row.executor):
                    row.state='UNKNOWN';row.receipt={**row.receipt,'error':'closure-git-worker-stopped'};row.save(update_fields=['state','receipt','updated'])
                raise c.Refused('closure-git-'+row.state.lower(),409)
            row=TerminalGitCommit.objects.create(run=current,project=current.project,branch=branch,state='INTENT',executor=identity(os.getpid()) or {},origin={'run_id':current.run_id,'session_id':current.session_id,'change':current.change})
        admitted=True
        docs=frozen_documents(current,source_path,branch)
        options,env=context(current.project);ref,head=_head(current.project,options,env);gitdir=_gitdir(current.project,options,env)
        _hooks_supported(current.project,options,env,gitdir)
        from .core.models import GitDelivery
        from .versioning import version_tag,VersionError
        from .project_metadata import read_metadata
        delivered=GitDelivery.objects.filter(run=current,state='COMPLETED').order_by('-pk').first()
        try:tag=version_tag(delivered.version if delivered else None,read_metadata(current.project.root).get('values',{}).get('PROJECT_VERSION'))
        except VersionError as error:raise c.Refused(str(error),409) from None
        tag_ref='refs/tags/'+tag
        old_tag=_git(current.project,options,env,'rev-parse','--verify','--quiet',tag_ref)
        c.require(old_tag.returncode in (0,1),'closure-git-tag-invalid',409)
        previous_tag=old_tag.stdout.decode('ascii','strict').strip() if old_tag.returncode==0 else ''
        targets=remote_plan(current.project,head,tag)
        from .session_delivery import retired_statistics_snapshots
        for removed in retired_statistics_snapshots(current.project,current.change_record_id,options,env):
            docs[removed['path']]={'raw':None,'sha256':None,'mode':'0','removed':True}
        snapshot={path:{key:value for key,value in item.items() if key!='raw'} for path,item in docs.items()}
        row.snapshot=snapshot;row.remote_plan=targets;row.base_head=head;row.state='RUNNING';row.save(update_fields=['snapshot','remote_plan','base_head','state','updated'])
        from .session_git import _index_path
        from types import SimpleNamespace
        directory=Path(_index_path(current.project,SimpleNamespace(change_id='terminal-'+str(current.pk),session_id=current.coding_session_id),options,env)).parent
        temporary=_temp_index(str(directory),current.project);row.index_path=temporary;row.save(update_fields=['index_path','updated'])
        own={**env,'GIT_INDEX_FILE':temporary}
        c.require(_git(current.project,options,own,'read-tree',head).returncode==0,'closure-git-index-invalid',409)
        from .git_commit_remove import OID
        for path,item in docs.items():
            if item.get('removed'):
                c.require(_git(current.project,options,own,'update-index','--force-remove','--',path).returncode==0,'closure-git-index-invalid',409);continue
            blob=_git(current.project,options,env,'hash-object','-w','--stdin',data=item['raw'])
            oid=blob.stdout.decode('ascii','strict').strip()
            c.require(blob.returncode==0 and OID.fullmatch(oid),'closure-git-index-invalid',409)
            c.require(_git(current.project,options,own,'update-index','--add','--cacheinfo',item['mode']+','+oid+','+path).returncode==0,'closure-git-index-invalid',409)
        tree=_git(current.project,options,own,'write-tree');c.require(tree.returncode==0,'closure-git-index-invalid',409)
        values=(current.project.public_metadata or {}).get('values',{});name=values.get('GIT_USER_NAME','');mail=values.get('GIT_USER_EMAIL','')
        c.require(name and mail and not any(char in name+mail for char in '\n\0'),'project-git-identity-missing',409)
        identity_env={**env,'GIT_AUTHOR_NAME':name,'GIT_AUTHOR_EMAIL':mail,'GIT_COMMITTER_NAME':name,'GIT_COMMITTER_EMAIL':mail}
        created=_git(current.project,options,identity_env,'commit-tree',tree.stdout.decode().strip(),'-p',head,'-m',current.change)
        commit=created.stdout.decode('ascii','strict').strip();c.require(created.returncode==0 and OID.fullmatch(commit),'closure-git-commit-invalid',409)
        ident=_git(current.project,options,identity_env,'var','GIT_COMMITTER_IDENT')
        c.require(ident.returncode==0 and bool(ident.stdout.strip()) and b'\n' not in ident.stdout.strip(),'closure-git-tag-invalid',409)
        tag_body=b'object '+commit.encode()+b'\ntype commit\ntag '+tag.encode()+b'\ntagger '+ident.stdout.strip()+b'\n\n'+tag.encode()+b'\n'
        made=_git(current.project,options,env,'mktag',data=tag_body)
        tag_oid=made.stdout.decode('ascii','strict').strip();c.require(made.returncode==0 and OID.fullmatch(tag_oid),'closure-git-tag-invalid',409)
        paths=list(docs);adoption={'paths':paths,'shared_digest':shared_scope_digest(current.project,options,env,paths)}
        plan={'gitdir':str(gitdir),'branch':ref,'head':head,'commit':commit,'paths':paths,'adoption':adoption,'global_statistics':{'entry_digest':shared_scope_digest(current.project,options,env,['STATISTICS.md'])}}
        # L'entrée globale est vérifiée comme les autres documents du snapshot.
        from .session_delivery import _prepare_shared_index
        shared=_prepare_shared_index(current.project,options,env,plan)
        keep_ref='refs/cab/terminal/'+hashlib.sha256((current.project_id+':'+str(current.pk)).encode()).hexdigest()
        row.commit_oid=commit;row.receipt={'keep_ref':keep_ref,'tag':tag,'tag_oid':tag_oid,'previous_tag_oid':previous_tag,'parent':head,'commit':commit,'documents':snapshot,'forges':targets,'index_lock':shared['lock'],'index_lock_identity':shared['lock_identity']};row.save(update_fields=['commit_oid','receipt','updated'])
        _verify_shared_index(shared)
        c.require(_head(current.project,options,env)==(ref,head),'closure-git-head-changed',409)
        dispatched=True
        update=('start\ncreate '+keep_ref+' '+commit+'\nupdate '+ref+' '+commit+' '+head+'\nupdate '+tag_ref+' '+tag_oid+' '+(previous_tag or '0'*len(tag_oid))+'\nprepare\ncommit\n').encode()
        c.require(_git(current.project,options,env,'update-ref','--stdin',data=update).returncode==0,'closure-git-commit-unconfirmed',409)
        _verify_shared_index(shared);_finish_shared_index(shared)
        row.receipt={**row.receipt,'local_confirmed':True};row.save(update_fields=['receipt','updated'])
        for target in targets:
            target['state']='RUNNING';row.remote_plan=targets;row.save(update_fields=['remote_plan','updated'])
            try:result=send(current.project,target,commit,tag_oid)
            except c.Refused as error:
                target['state']='UNKNOWN' if error.code=='closure-git-push-unconfirmed' else 'FAILED';target['error']=error.code
                row.remote_plan=targets;row.save(update_fields=['remote_plan','updated']);raise
            target.update(result);row.remote_plan=targets;row.save(update_fields=['remote_plan','updated'])
        c.require(_git(current.project,options,env,'update-ref','-d',keep_ref,commit).returncode==0,'closure-git-cleanup-unconfirmed',409)
        row.state='COMPLETED';row.receipt={'commit':commit,'parent':head,'tag':tag,'tag_oid':tag_oid,'previous_tag_oid':previous_tag,'tag_moved':bool(previous_tag),'documents':snapshot,'forges':targets,'verified':True,'at':timezone.now().isoformat()};row.save(update_fields=['state','receipt','updated'])
        c.event(current,'terminal-git-completed',{'commit':commit,'branch':branch,'tag':tag,'tag_oid':tag_oid,'documents':list(snapshot),'forges':[target['forge'] for target in targets]})
        return row.receipt
    except (OSError,UnicodeError,c.Refused) as error:
        if admitted and row is not None and row.state!='COMPLETED':
            row.state='UNKNOWN' if dispatched else 'FAILED';row.receipt={**row.receipt,'error':getattr(error,'code','closure-git-unconfirmed')};row.save(update_fields=['state','receipt','updated'])
        raise
    finally:
        try:
            if shared:
                try:os.unlink(shared['temp'])
                except FileNotFoundError:pass
                if not dispatched:_remove_own_lock(shared)
            if temporary and not dispatched:
                try:os.unlink(temporary)
                except FileNotFoundError:pass
            if temporary and row is not None and row.state=='COMPLETED':
                try:os.unlink(temporary)
                except FileNotFoundError:pass
        finally:
            with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])
