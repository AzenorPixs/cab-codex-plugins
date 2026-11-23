"""Édition locale de métadonnées, sans index ni fichiers de travail modifiés."""
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from django.db import connection,DatabaseError
from .core.commands import Refused,require
from .core.models import Configuration,Project
from .git_commit_remove import OID,context,inspect,run
from .git_tag_edit import run as write,valid_new_name
from .project_git import _refresh_status

PREFIX='git-commit-edit:'
AUTHOR=re.compile(rb'(.+) <([^<>\n]*)> (-?[0-9]+) ([+-][0-9]{4})\Z')


def author_fields(line):
    match=AUTHOR.fullmatch(line)
    require(match is not None,'git-commit-edit-encoding',409)
    name,email,seconds,offset=match.groups()
    # Reconstituer l'heure du fuseau enregistré sans adopter celui du serveur.
    from datetime import timezone,timedelta
    sign=1 if offset[:1]==b'+' else -1
    zone=timezone(sign*timedelta(hours=int(offset[1:3]),minutes=int(offset[3:])))
    stamp=datetime.fromtimestamp(int(seconds),zone)
    return name.decode('utf-8'),email.decode('utf-8'),stamp.isoformat()


def author_line(name,email,date):
    require(isinstance(name,str) and 0<len(name.strip())<=300 and not any(c in name for c in '<>\r\n\0'),'git-commit-edit-author-invalid',400)
    require(isinstance(email,str) and len(email)<=300 and re.fullmatch(r'[^\s<>]+@[^\s<>]+',email) is not None,'git-commit-edit-author-invalid',400)
    require(isinstance(date,str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})',date) is not None,'git-commit-edit-date-invalid',400)
    try:stamp=datetime.fromisoformat(date.replace('Z','+00:00'))
    except ValueError:raise Refused('git-commit-edit-date-invalid',400) from None
    return (name+' <'+email+'> '+str(int(stamp.timestamp()))+' '+stamp.strftime('%z')).encode('utf-8')


def raw_commit(project,options,env,oid):
    result=run(project,options,env,'cat-file','commit',oid)
    require(result.returncode==0 and len(result.stdout)<=4194304 and b'\n\n' in result.stdout,'git-commit-edit-unavailable',409)
    return result.stdout


def tag_rows(project,options,env):
    result=run(project,options,env,'for-each-ref','--format=%(refname)%00%(objectname)%00%(objecttype)','refs/tags/')
    require(result.returncode==0 and len(result.stdout)<=4194304,'git-commit-edit-unavailable',409)
    rows=[]
    for line in result.stdout.splitlines():
        ref,oid,kind=line.decode('utf-8').split('\0')
        target=run(project,options,env,'rev-parse','--verify','--quiet',ref+'^{commit}')
        rows.append({'name':ref.removeprefix('refs/tags/'),'oid':oid,'kind':kind,'target':target.stdout.decode('ascii').strip() if target.returncode==0 else None})
    digest=hashlib.sha256(result.stdout).hexdigest()
    return rows,digest


def tag_content(project,options,env,row):
    if row['kind']=='commit':return None,''
    result=run(project,options,env,'cat-file','tag',row['oid'])
    require(result.returncode==0 and len(result.stdout)<=65536 and b'\n\n' in result.stdout,'git-commit-edit-unavailable',409)
    header,message=result.stdout.split(b'\n\n',1)
    require(b'type commit' in header.split(b'\n') and b'-----BEGIN' not in message,'git-commit-edit-signed',409)
    return header,message.decode('utf-8')


def preview(project,commit,expected_head=''):
    require(isinstance(commit,str) and OID.fullmatch(commit),'git-commit-edit-invalid',400)
    options,env=context(project);state=inspect(project)
    require(not expected_head or state['head']==expected_head,'git-commit-edit-changed',409)
    require(run(project,options,env,'merge-base','--is-ancestor',commit,state['head']).returncode==0,'git-commit-edit-changed',409)
    raw=raw_commit(project,options,env,commit);header,message=raw.split(b'\n\n',1)
    require(all(not line.startswith(b'encoding ') or line.lower()==b'encoding utf-8' for line in header.split(b'\n')),'git-commit-edit-encoding',409)
    authors=[line[7:] for line in header.split(b'\n') if line.startswith(b'author ')]
    require(len(authors)==1,'git-commit-edit-unavailable',409)
    name,email,author_date=author_fields(authors[0])
    committers=[line[10:] for line in header.split(b'\n') if line.startswith(b'committer ')]
    require(len(committers)==1,'git-commit-edit-unavailable',409)
    _,_,date=author_fields(committers[0]);rows,digest=tag_rows(project,options,env)
    tags=[]
    for row in rows:
        if row['target']==commit:
            _,description=tag_content(project,options,env,row)
            tags.append({'name':row['name'],'description':description})
    return {'head':state['head'],'branch':state['branch'],'commit':commit,'author':name,'email':email,'date':date,'author_date':author_date,'message':message.decode('utf-8'),'tags':tags,'refs_digest':digest}


def rewrite(raw,parents,author=None,message=None,committer=None):
    header,old_message=raw.split(b'\n\n',1);lines=header.split(b'\n')
    require(lines[0].startswith(b'tree '),'git-commit-edit-unavailable',409)
    old_parents=[line[7:] for line in lines if line.startswith(b'parent ')]
    old_author=next(line[7:] for line in lines if line.startswith(b'author '))
    old_committer=next(line[10:] for line in lines if line.startswith(b'committer '))
    if parents==old_parents and (author is None or author==old_author) and (message is None or message==old_message) and (committer is None or committer==old_committer):return raw
    require(not any(line.startswith((b'gpgsig ',b'gpgsig-sha256 ',b'mergetag ')) for line in lines),'git-commit-edit-signed',409)
    tail=[(b'author '+author if author is not None and line.startswith(b'author ') else b'committer '+committer if committer is not None and line.startswith(b'committer ') else line) for line in lines[1:] if not line.startswith(b'parent ')]
    return b'\n'.join([lines[0],*[b'parent '+parent for parent in parents],*tail])+b'\n\n'+(old_message if message is None else message)


def _edit(project,data):
    options,env=context(project);before=preview(project,data['commit'],data['expected_head'])
    require(before['branch']==data['expected_branch'] and before['refs_digest']==data['refs_digest'],'git-commit-edit-changed',409)
    for name in ['MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD','rebase-merge','rebase-apply','sequencer','index.lock']:
        p=run(project,options,env,'rev-parse','--git-path',name)
        path=Path(p.stdout.decode().strip())
        if not path.is_absolute():path=Path(project.root)/path
        require(p.returncode==0 and not path.exists(),'git-commit-edit-operation-active',409)
    chosen=data['tag_name'];new_name=data['new_tag'];description=data['tag_description']
    rows,_=tag_rows(project,options,env);names={row['name'] for row in rows}
    require(not chosen or chosen in {tag['name'] for tag in before['tags']},'git-commit-edit-changed',409)
    require(isinstance(description,str) and len(description)<=16000 and '\0' not in description and (new_name or not description),'git-tag-invalid',400)
    if new_name:
        if new_name==chosen:
            from .git_tag_edit import valid_name
            valid_name(project,options,env,new_name)
        else:valid_new_name(project,options,env,new_name)
        require(new_name==chosen or new_name not in names,'git-tag-exists',409)
    timestamp=author_line(data['author'],data['email'],data['date']).rsplit(b'> ',1)[1]
    author=author_line(data['author'],data['email'],before['author_date'])
    require(isinstance(data['message'],str) and len(data['message'])<=65536 and '\0' not in data['message'],'git-commit-edit-message-invalid',400)
    result=run(project,options,env,'rev-list','--reverse','--topo-order','--parents',before['head'])
    require(result.returncode==0 and len(result.stdout)<=16777216,'git-commit-edit-unavailable',409)
    mapping={}
    for line in result.stdout.splitlines():
        parts=line.decode('ascii').split();oid=parts[0];parents=parts[1:]
        require(all(OID.fullmatch(p) for p in parts) and all(p in mapping for p in parents),'git-commit-edit-unavailable',409)
        new_parents=[mapping[p].encode('ascii') for p in parents]
        if oid!=data['commit'] and new_parents==[p.encode('ascii') for p in parents]:mapping[oid]=oid;continue
        raw=raw_commit(project,options,env,oid)
        committer=None
        if oid==data['commit']:
            old_committer=next(line[10:] for line in raw.split(b'\n\n',1)[0].split(b'\n') if line.startswith(b'committer '))
            committer=old_committer.rsplit(b'> ',1)[0]+b'> '+timestamp
        body=rewrite(raw,new_parents,author if oid==data['commit'] else None,data['message'].encode('utf-8') if oid==data['commit'] else None,committer)
        if body==raw:mapping[oid]=oid;continue
        made=write(project,options,env,'hash-object','-t','commit','-w','--stdin',data=body)
        new=made.stdout.decode('ascii').strip();require(made.returncode==0 and OID.fullmatch(new),'git-commit-edit-unavailable',409);mapping[oid]=new
    refs={}
    if mapping[before['head']]!=before['head']:refs['refs/heads/'+before['branch']]=(mapping[before['head']],before['head'])
    for row in rows:
        selected=row['name']==chosen
        target=mapping.get(row['target'],row['target'])
        if not selected and target==row['target']:continue
        if selected and not new_name:refs['refs/tags/'+chosen]=(None,row['oid']);continue
        header,old_description=tag_content(project,options,env,row)
        name=new_name if selected else row['name'];text=description if selected else old_description
        obj=target
        if header is not None or text:
            tagger=next((line[7:] for line in (header or b'').split(b'\n') if line.startswith(b'tagger ')),author)
            body=b'object '+target.encode('ascii')+b'\ntype commit\ntag '+name.encode('utf-8')+b'\ntagger '+tagger+b'\n\n'+text.encode('utf-8')
            made=write(project,options,env,'mktag',data=body);obj=made.stdout.decode('ascii').strip();require(made.returncode==0 and OID.fullmatch(obj),'git-commit-edit-unavailable',409)
        if name!=row['name']:
            refs['refs/tags/'+row['name']]=(None,row['oid']);refs['refs/tags/'+name]=(obj,None)
        elif obj!=row['oid']:refs['refs/tags/'+name]=(obj,row['oid'])
    if not chosen and new_name:
        target=mapping[data['commit']];obj=target
        if description:
            body=b'object '+target.encode('ascii')+b'\ntype commit\ntag '+new_name.encode('utf-8')+b'\ntagger '+author+b'\n\n'+description.encode('utf-8')
            made=write(project,options,env,'mktag',data=body);obj=made.stdout.decode('ascii').strip();require(made.returncode==0 and OID.fullmatch(obj),'git-commit-edit-unavailable',409)
        refs['refs/tags/'+new_name]=(obj,None)
    latest=inspect(project);_,digest=tag_rows(project,options,env)
    require(latest['head']==before['head'] and latest['branch']==before['branch'] and digest==before['refs_digest'],'git-commit-edit-changed',409)
    commands=['start']
    for ref,(new,old) in refs.items():commands.append(('delete '+ref+' '+old) if new is None else ('create '+ref+' '+new) if old is None else ('update '+ref+' '+new+' '+old))
    if refs:
        commands+=['prepare','commit']
        # La frontière d'effet est persistée avant la transaction des références.
        data['_dispatch']()
        updated=write(project,options,env,'update-ref','-m','CAB: édition des métadonnées','--stdin',data=('\n'.join(commands)+'\n').encode('utf-8'))
        require(updated.returncode==0,'git-commit-edit-uncertain',409)
    return {'saved':True,'head':mapping[before['head']],'commit':mapping[data['commit']],'rewritten':sum(old!=new for old,new in mapping.items()),'tags_changed':len(refs)-(1 if 'refs/heads/'+before['branch'] in refs else 0)}


def edit(project_id,data):
    required={'request_id','commit','expected_head','expected_branch','refs_digest','author','email','date','message','tag_name','new_tag','tag_description'}
    require(set(data)==required and isinstance(data['request_id'],str) and re.fullmatch(r'[A-Za-z0-9-]{1,100}',data['request_id']),'git-commit-edit-invalid',400)
    require(isinstance(data['expected_head'],str) and OID.fullmatch(data['expected_head']),'git-commit-edit-invalid',400)
    fingerprint=hashlib.sha256(json.dumps(data,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    key=PREFIX+hashlib.sha256((project_id+':'+data['request_id']).encode()).hexdigest()
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_lock(%s,%s)',[7348501,7348502])
    row=None;dispatched=False;admitted=False
    try:
        row=Configuration.objects.filter(pk=key).first()
        if row:
            require(row.value.get('fingerprint')==fingerprint,'git-commit-edit-request-conflict',409)
            if row.value.get('state')=='COMPLETED':return row.value['result']
            raise Refused('git-commit-edit-uncertain' if row.value.get('state') in ('RUNNING','UNKNOWN') else row.value.get('error','git-commit-edit-unavailable'),409)
        require(not Configuration.objects.filter(key__startswith=PREFIX,value__project_id=project_id,value__state__in=['RUNNING','UNKNOWN']).exists(),'git-commit-edit-uncertain',409)
        project=Project.objects.get(pk=project_id)
        row=Configuration.objects.create(key=key,value={'state':'RUNNING','fingerprint':fingerprint,'project_id':project_id});admitted=True
        def dispatch():
            nonlocal dispatched
            row.value={**row.value,'dispatched':True};row.save(update_fields=['value','updated']);dispatched=True
        result=_edit(project,{**data,'_dispatch':dispatch})
        row.value={**row.value,'state':'COMPLETED','result':result};row.save(update_fields=['value','updated'])
    except (Refused,UnicodeError,OSError) as error:
        if admitted and row is not None and row.value.get('state')=='RUNNING':
            row.value={**row.value,'state':'UNKNOWN' if dispatched else 'FAILED','error':getattr(error,'code','git-commit-edit-unavailable')};row.save(update_fields=['value','updated'])
        if isinstance(error,Refused):raise
        raise Refused('git-commit-edit-uncertain' if dispatched else 'git-commit-edit-unavailable',409) from None
    finally:
        with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_unlock(%s,%s)',[7348501,7348502])

    try:_refresh_status(project_id)
    except (OSError,ValueError,Refused,DatabaseError):result={**result,'refresh_pending':True}
    return result
