"""Catalogue des comptes d'agent, sans lecture de leurs configurations."""
from pathlib import Path
from django.db import transaction
from .core.commands import Refused,require
from .core.models import Agent,AgentUser


def local_account(username):
    require(isinstance(username,str) and 0<len(username)<=128 and not any(c in username for c in ':\r\n\0/'),'agent-account-invalid',400)
    matches=[]
    try:
        with Path('/etc/passwd').open(encoding='utf-8') as stream:
            for line in stream:
                fields=line.rstrip('\n').split(':')
                if len(fields)==7 and fields[0]==username:matches.append(fields)
    except (OSError,UnicodeError):raise Refused('agent-account-source-unavailable',503) from None
    require(bool(matches),'agent-account-missing',400)
    require(len(matches)==1,'agent-account-ambiguous',409)
    fields=matches[0]
    try:uid=int(fields[2]);gid=int(fields[3])
    except ValueError:raise Refused('agent-account-invalid',400) from None
    require(uid>=0 and gid>=0,'agent-account-invalid',400)
    home=Path(fields[5])
    require(bool(fields[5]) and home.is_absolute() and home.is_dir(),'agent-home-missing',400)
    return {'username':username,'uid':uid,'gid':gid,'home':str(home)}


def list_users(agent):
    from django.db.models.functions import Lower
    require(Agent.objects.filter(pk=agent).exists(),'agent-not-found',404)
    return {'users':list(AgentUser.objects.filter(agent_id=agent).order_by(Lower('username'),'username').values('id','username','home','config_present','config_path','mcp_declared','config_error','reconcile_state'))}


@transaction.atomic
def register_user(agent,username):
    account=local_account(username)
    try:owner=Agent.objects.select_for_update().get(pk=agent)
    except Agent.DoesNotExist:raise Refused('agent-not-found',404) from None
    row=AgentUser.objects.select_for_update().filter(agent=owner,uid=account['uid']).first()
    if row is not None:
        require(row.username==username and row.home==account['home'],'agent-account-identity-changed',409)
        return {'id':row.pk,'username':row.username,'home':row.home}
    require(not AgentUser.objects.filter(agent=owner,username=username).exists(),'agent-account-identity-changed',409)
    row=AgentUser.objects.create(agent=owner,uid=account['uid'],username=username,home=account['home'])
    return {'id':row.pk,'username':row.username,'home':row.home}


@transaction.atomic
def remove_user(agent,user_id):
    require(Agent.objects.filter(pk=agent).exists(),'agent-not-found',404)
    require(type(user_id) is int and user_id>0,'agent-user-invalid',400)
    row=AgentUser.objects.select_for_update().filter(agent_id=agent,pk=user_id).first()
    if row is None:return {'removed':False}
    require(row.reconcile_state not in ('RUNNING','UNCERTAIN'),'agent-config-busy',409)
    row.delete()
    return {'removed':True}


@transaction.atomic
def request_reconciliation(agent):
    require(Agent.objects.filter(pk=agent).exists(),'agent-not-found',404)
    rows=AgentUser.objects.select_for_update().filter(agent_id=agent)
    queued=0
    for row in rows:
        if row.reconcile_state in ('IDLE','FAILED'):
            row.reconcile_state='PENDING';row.save(update_fields=['reconcile_state']);queued+=1
    return {'queued':queued}

