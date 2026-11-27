"""Versions publiques du paquet CAB : contrôle avant Git, préparation réservée."""
import ast
import json
import re
import tomllib
from pathlib import Path
from .core import commands as c

PLUGINS=('cab','ccab','cabu','cicd','cicdf','cabd')


def paths(root):
    root=Path(root)
    recipe=root/'build/debian-package.json'
    try:profile=json.loads(recipe.read_text()) if recipe.is_file() else {}
    except (OSError,ValueError):profile={}
    cab=any(isinstance(item,dict) and item.get('destination')=='/usr/lib/cab/runtime-manifest.json' for item in profile.get('files',[]))
    if not cab and not ((root/'packaging/prepare.py').is_file() and (root/'src/cab_platform/__init__.py').is_file()):return []
    return ['src/cab_platform/__init__.py','pyproject.toml','frontend/package.json','frontend/package-lock.json',
            *['integrations/codex/'+name+'/.codex-plugin/plugin.json' for name in PLUGINS],
            *['integrations/commands/'+name.upper()+'.md' for name in PLUGINS]]


def value(raw,path):
    text=raw.decode('utf-8')
    if path.endswith('.json'):
        data=json.loads(text);version=data['version']
        if path.endswith('package-lock.json'):c.require(data['packages']['']['version']==version,'package-source-version-divergent')
        return version
    if path=='pyproject.toml':return tomllib.loads(text)['project']['version']
    if path.endswith('__init__.py'):
        rows=[ast.literal_eval(n.value) for n in ast.parse(text).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='__version__' for t in n.targets)]
        c.require(len(rows)==1,'package-source-version-invalid');return rows[0]
    header=text.split('---',2)
    c.require(len(header)==3 and not header[0].strip(),'package-source-version-invalid')
    rows=re.findall(r'(?m)^version:\s*(\S+)\s*$',header[1])
    c.require(len(rows)==1,'package-source-version-invalid');return rows[0]


def inspect(root,version):
    from .session_delivery import version_tuple
    version_tuple(version);result={}
    for path in paths(root):
        target=c.safe_path(Path(root),path)
        c.require(target.is_file() and not target.is_symlink(),'package-source-version-invalid')
        try:current=value(target.read_bytes(),path)
        except (ValueError,KeyError,TypeError,SyntaxError,UnicodeError) as error:raise c.Refused('package-source-version-invalid') from error
        result[path]=current
    return {'target':version,'versions':result,'mismatches':[name for name,current in result.items() if current!=version]}


def require_aligned(root,version):
    result=inspect(root,version)
    c.require(not result['mismatches'],'package-source-version-not-aligned',409)
    return result


def rewritten(raw,path,version):
    current=value(raw,path);text=raw.decode('utf-8')
    if current==version:return raw
    if path.endswith('.json'):
        data=json.loads(text);data['version']=version
        if path.endswith('package-lock.json'):data['packages']['']['version']=version
        return (json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode()
    pattern=(r'(?m)^(__version__\s*=\s*[\'"])'+re.escape(current)+r'([\'"]\s*)$' if path.endswith('__init__.py') else
             r'(?m)^(version\s*=\s*[\'"])'+re.escape(current)+r'([\'"]\s*)$' if path=='pyproject.toml' else
             r'(?m)^(version:\s*)'+re.escape(current)+r'(\s*)$')
    updated,count=re.subn(pattern,lambda m:m[1]+version+m[2],text)
    c.require(count==1,'package-source-version-invalid')
    return updated.encode()


def prepare(actor,data):
    from .preexisting_git import git_guard
    with git_guard():return _prepare_locked(actor,data)


def _prepare_locked(actor,data):
    from .core.models import GitFileReservation,Event
    from django.db import transaction
    c.require(set(data)=={'project_id','run_id','request_id','version'},'package-version-fields-invalid',400)
    key=c.identifier(data['request_id']);fingerprint=c.digest(data)
    with transaction.atomic():
        run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True)
        from .requested_effects import coding_authority
        coding_authority(actor,run)
        prior=Event.objects.filter(run=run,kind='package-version-prepared',data__request_id=key).first()
        if prior:
            c.require(prior.data['fingerprint']==fingerprint,'package-version-request-conflict');return prior.data['receipt']
        c.working(run)
        c.require(not Event.objects.filter(run=run,kind='package-version-preparing',data__request_id=key).exists(),'package-version-outcome-unknown')
        c.require(c.no_pending(run),'package-version-effect-protected')
        plan=inspect(run.project.root,data['version']);changes={}
        extra=[path for path in plan['mismatches'] if not any(path==base or path.startswith(base+'/') for base in run.mandate['paths'])]
        if extra:
            c.require(run.mode=='direct','package-version-orchestrator-framing-required',403)
            old=run.mandate['framing_digest'];run.mandate={**run.mandate,'paths':[*run.mandate['paths'],*extra]}
            run.mandate['framing_digest']=c.digest({k:v for k,v in run.mandate.items() if k not in ('framing_digest','native_source','native_frozen_at','native_source_home','native_source_history')})
            run.save(update_fields=['mandate','updated'])
            c.event(run,'package-version-scope-prepared',{'request_id':key,'paths':extra,'previous_framing_digest':old,'framing_digest':run.mandate['framing_digest'],'authority':actor.pk})
    from .session_git import finish_writes,reserve_files
    if plan['mismatches']:
        reserve_files(actor,{'project_id':run.project_id,'run_id':run.run_id,'request_id':'VER-'+c.digest([run.pk,key]),'paths':plan['mismatches']})
    with transaction.atomic():
        for path in plan['mismatches']:
            c.require(GitFileReservation.objects.filter(project=run.project,path=path,active=True,git_index__change_id=run.change_record_id,git_index__session_id=run.coding_session_id).exists(),'package-version-reservation-required')
            target=c.safe_path(Path(run.project.root),path);raw=target.read_bytes();changes[path]=(raw,rewritten(raw,path,data['version']))
        before={path:c.digest(raw.hex()) for path,(raw,_) in changes.items()}
        # L'intention est conservée hors transaction avant la première écriture.
    c.event(run,'package-version-preparing',{'request_id':key,'fingerprint':fingerprint,'before':before})
    for path,(raw,updated) in changes.items():
        target=c.safe_path(Path(run.project.root),path)
        c.require(target.read_bytes()==raw,'package-version-source-changed')
        with target.open('r+b') as stream:stream.write(updated);stream.truncate();stream.flush();__import__('os').fsync(stream.fileno())
    receipt={'version':data['version'],'updated_paths':list(changes),'aligned':not inspect(run.project.root,data['version'])['mismatches']}
    c.require(receipt['aligned'],'package-version-source-changed')
    with transaction.atomic():
        c.event(run,'package-version-prepared',{'request_id':key,'fingerprint':fingerprint,'receipt':receipt})
        if changes:
            finish_writes(actor,{'project_id':run.project_id,'run_id':run.run_id,
                                 'request_id':'VER-DONE-'+c.digest([run.pk,key]),'paths':list(changes)})
    return receipt
