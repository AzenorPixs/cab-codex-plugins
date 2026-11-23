"""Commit local des seuls rapports CAB ; aucun code, aucun tag ni envoi."""
import hashlib
import os
from pathlib import Path
from .core import commands as c
from .core.models import Event
from .preexisting_git import git_guard
from .git_commit_remove import context
from . import session_delivery as git


def report_path(path):
    return git.managed_statistics_path(path) or path.startswith('openspec/changes/') and path.rsplit('/',1)[-1]=='BLOCKERS.md'


def commit(run,paths,request_id,*,expected_hashes):
    c.require(paths and all(report_path(p) for p in paths),'report-commit-path-invalid')
    c.require(set(paths)==set(expected_hashes),'report-commit-proof-missing')
    key=c.identifier(request_id);fingerprint=c.digest(expected_hashes)
    with git_guard():
        old=Event.objects.filter(run=run,kind='reports-local-commit-finished',data__request_id=key).first()
        if old:
            c.require(old.data['fingerprint']==fingerprint,'report-commit-request-conflict');return old.data['receipt']
        c.require(not Event.objects.filter(run=run,kind='reports-local-commit-started',data__request_id=key).exists(),'report-commit-outcome-unknown')
        options,env=context(run.project);branch,head=git._head(run.project,options,env)
        hashes={}
        for path in paths:
            file=c.safe_path(Path(run.project.root),path)
            hashes[path]=hashlib.sha256(file.read_bytes()).hexdigest()
        c.require(hashes==expected_hashes,'report-commit-source-changed')
        c.event(run,'reports-local-commit-started',{'request_id':key,'fingerprint':fingerprint,'head':head,'paths':hashes})
        index=git._temp_index(str(git._gitdir(run.project,options,env)/'cab-session-index'),run.project)
        os.unlink(index);own={**env,'GIT_INDEX_FILE':index,'GIT_LITERAL_PATHSPECS':'1'}
        shared=None;dispatched=False;plan=None
        try:
            c.require(git._git(run.project,options,own,'read-tree',head).returncode==0,'report-commit-index-invalid')
            c.require(git._git(run.project,options,own,'add','--',*paths).returncode==0,'report-commit-index-invalid')
            changed=git._changed_paths(run.project,options,own,head)
            c.require(set(changed).issubset(paths),'report-commit-scope-changed')
            if not changed:
                receipt={'state':'NO_CHANGE','commit':None,'head':head,'paths':[],'local_only':True}
            else:
                tree=git._git(run.project,options,own,'write-tree');c.require(tree.returncode==0,'report-commit-index-invalid')
                values=run.project.public_metadata.get('values',{})
                identity={**own,'GIT_AUTHOR_NAME':values.get('GIT_USER_NAME',''),'GIT_AUTHOR_EMAIL':values.get('GIT_USER_EMAIL',''),'GIT_COMMITTER_NAME':values.get('GIT_USER_NAME',''),'GIT_COMMITTER_EMAIL':values.get('GIT_USER_EMAIL','')}
                c.require(identity['GIT_AUTHOR_NAME'] and identity['GIT_AUTHOR_EMAIL'],'project-git-identity-missing')
                value=git._git(run.project,options,identity,'commit-tree',tree.stdout.decode().strip(),'-p',head,'-m','Statistiques CAB du change '+run.change)
                c.require(value.returncode==0,'report-commit-unavailable');commit_id=value.stdout.decode().strip()
                plan={'branch':branch,'head':head,'commit':commit_id,'paths':changed,'gitdir':str(git._gitdir(run.project,options,env)),'report_only':True}
                shared=git._prepare_shared_index(run.project,options,env,plan)
                c.require(all(hashlib.sha256(c.safe_path(Path(run.project.root),p).read_bytes()).hexdigest()==sha for p,sha in hashes.items()),'report-commit-source-changed')
                c.event(run,'reports-local-commit-prepared',{'request_id':key,'commit':commit_id,'head':head,'paths':changed})
                git._verify_shared_index(shared);dispatched=True
                result=git._git(run.project,options,env,'update-ref',branch,commit_id,head)
                c.require(result.returncode==0,'report-commit-outcome-unknown')
                git._verify_shared_index(shared);git._finish_shared_index(shared)
                receipt={'state':'COMPLETED','commit':commit_id,'previous':head,'paths':changed,'local_only':True}
            c.event(run,'reports-local-commit-finished',{'request_id':key,'fingerprint':fingerprint,'receipt':receipt})
            return receipt
        except (OSError,c.Refused) as error:
            c.event(run,'reports-local-commit-error',{'request_id':key,'state':'UNKNOWN' if dispatched else 'FAILED','error':getattr(error,'code',type(error).__name__)})
            raise
        finally:
            if shared:
                if not dispatched:git._remove_own_lock(shared)
                for name in (shared['temp'],):
                    try:os.unlink(name)
                    except FileNotFoundError:pass
            try:os.unlink(index)
            except FileNotFoundError:pass
