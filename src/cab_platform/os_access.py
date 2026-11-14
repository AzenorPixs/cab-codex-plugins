"""Demande l'accès au noyau sous le compte effectif, sans interpréter les modes."""
import os
import pwd
import subprocess
import sys

def accessible(path,uid:int,flags:int) -> bool:
    if uid==os.getuid():return os.access(path,flags,effective_ids=True)
    if os.getuid()!=0:return False
    try:user=pwd.getpwuid(uid)
    except KeyError:return False
    result=subprocess.run([sys.executable,'-c','import os,sys;sys.exit(0 if os.access(sys.argv[1],int(sys.argv[2]),effective_ids=True) else 1)',str(path),str(flags)],user=uid,group=user.pw_gid,extra_groups=os.getgrouplist(user.pw_name,user.pw_gid),env={'PATH':os.defpath,'LANG':'C.UTF-8'},cwd='/',stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=5)
    return result.returncode==0
