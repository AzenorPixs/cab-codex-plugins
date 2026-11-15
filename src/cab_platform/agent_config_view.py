"""Lecture bornée des configurations associées, sans journaliser leur contenu."""
import os,stat
from pathlib import Path
from .agent_users import local_account
from .core.commands import Refused,require
from .core.models import AgentUser


def read_configuration(agent,user_id):
    require(agent in ('codex_desktop','codex','opencode'),'agent-not-found',404)
    require(type(user_id) is int and user_id>0,'agent-user-invalid',400)
    row=AgentUser.objects.filter(agent_id=agent,pk=user_id).first()
    require(row is not None,'agent-user-not-found',404)
    account=local_account(row.username)
    require(account['uid']==row.uid and account['home']==row.home,'agent-account-identity-changed',409)
    home=Path(row.home);require(home.is_absolute() and home.resolve()==home,'agent-config-unsafe',409)
    target=home/('.config/opencode/opencode.json' if agent=='opencode' else '.codex/config.toml')
    parent=target.parent
    while parent!=home:
        require(not parent.is_symlink() and parent.is_dir() and parent.resolve()==parent,'agent-config-unsafe',409)
        parent=parent.parent
    try:fd=os.open(target,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    except FileNotFoundError:raise Refused('agent-config-absent',404) from None
    except OSError:raise Refused('agent-config-unreadable',403) from None
    try:
        info=os.fstat(fd)
        require(stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_uid==row.uid and info.st_size<=4194304,'agent-config-unsafe',409)
        with os.fdopen(os.dup(fd),'rb') as stream:raw=stream.read(4194305)
        require(len(raw)<=4194304,'agent-config-too-large',409)
        try:return raw.decode('utf-8')
        except UnicodeError:raise Refused('agent-config-invalid-encoding',409) from None
    finally:os.close(fd)
