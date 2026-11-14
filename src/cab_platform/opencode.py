"""Adaptateur OpenCode V2 ; credentials locaux, aucune règle métier côté transport."""
import json
import os
from pathlib import Path
import stat
from urllib.parse import urlsplit,quote
import httpx
from .core.commands import require

def connection(actor):
    profile=actor.native;url=profile.get('url','http://127.0.0.1:4096');parsed=urlsplit(url)
    require(all(key in profile for key in ('pid','start_time','password_file')),'native-profile-required')
    require(parsed.scheme=='http' and parsed.hostname in ('127.0.0.1','localhost','::1') and not parsed.username and not parsed.password and not parsed.query and not parsed.fragment,'native-url-invalid')
    pid=int(profile['pid']);process=Path('/proc')/str(pid)
    require(process.stat().st_uid==actor.uid and process.joinpath('stat').read_text().split(') ',1)[1].split()[19]==str(profile['start_time']),'native-process-divergent')
    path=Path(profile['password_file']);fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    with os.fdopen(fd,'r') as stream:
        info=os.fstat(stream.fileno());require(stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_size<65536,'native-credential-unsafe')
        password=stream.read().strip()
    return httpx.Client(base_url=url,auth=(profile.get('username','opencode'),password),timeout=30,follow_redirects=False)

def request(actor,method,path,*,directory,body=None,params=None):
    with connection(actor) as client:
        response=client.request(method,path,params=params,json=body,headers={'x-opencode-directory':directory})
        require(response.status_code in (200,201,202,204),'native-request-refused')
        require(len(response.content)<=8*1024*1024,'native-response-too-large')
        return response.json() if response.content else {'accepted':True}

def session(run):
    result=request(run.actor,'GET','/api/session/'+quote(run.session_id,safe=''),directory=run.project.root)
    data=result.get('data',{})
    require(data.get('id')==run.session_id and data.get('location',{}).get('directory',data.get('directory'))==run.project.root,'native-session-divergent')
    return data

def control(run,data):
    action=data['native_action'];sid=quote(run.session_id,safe='')
    if action=='create':
        body={'id':run.session_id,'title':data.get('title',run.run_id),'location':{'directory':run.project.root},'permissions':[{'action':'shell','resource':'*','effect':'deny'},{'action':'edit','resource':'*','effect':'deny'}]}
        if run.mandate.get('model'):body['model']=run.mandate['model']
        result=request(run.actor,'POST','/api/session',directory=run.project.root,body=body,params={'directory':run.project.root})
        session(run)
    elif action=='prompt':
        session(run)
        result=request(run.actor,'POST','/api/session/'+sid+'/prompt',directory=run.project.root,body={'text':data['text'],'resume':True})
    elif action=='interrupt':
        session(run);request(run.actor,'POST','/api/session/'+sid+'/interrupt',directory=run.project.root)
    else:raise ValueError('native-action-invalid')
    # Aucun prompt, credential ou texte de réponse n’est journalisé.
    return {'accepted':True,'action':action,'session_id':run.session_id}

def messages(run):
    session(run);result=[];cursor=None;seen=set()
    for _ in range(100):
        params={'limit':'200',**({'cursor':cursor} if cursor else {'order':'asc'})}
        page=request(run.actor,'GET','/api/session/'+quote(run.session_id,safe='')+'/message',directory=run.project.root,params=params)
        require(isinstance(page.get('data'),list) and isinstance(page.get('cursor'),dict),'native-messages-invalid')
        result.extend(page['data']);cursor=page['cursor'].get('next')
        if cursor is None:return result
        require(cursor not in seen,'native-pagination-invalid');seen.add(cursor)
    raise ValueError('native-pagination-limit')
