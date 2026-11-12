import hashlib
import hmac
from django.contrib.auth.models import AnonymousUser
from .models import Actor
from .commands import Refused
from cab_platform.paths import secret,runtime_config as config

def principal(request,*,admin=False):
    if not config().get('initialized'):raise Refused('initialization-required',503)
    peer=getattr(request,'cab_peer',None)
    header=request.headers.get('Authorization','')
    if peer and peer['uid']==0 and hmac.compare_digest(request.headers.get('X-CAB-Admin',''),secret('admin-token')):
        actor,_=Actor.objects.get_or_create(pk='system-admin',defaults={'uid':0,'agent':'cab-cli','role':'admin','token_hash':hashlib.sha256(secret('admin-token').encode()).hexdigest()})
    elif header.startswith('Bearer '):
        actor=Actor.objects.filter(token_hash=hashlib.sha256(header[7:].encode()).hexdigest(),active=True).first()
        if not actor or not peer or peer['uid']!=actor.uid:raise Refused('actor-authorization-required',401)
    elif request.user.is_authenticated and request.user.is_superuser:
        actor,_=Actor.objects.get_or_create(pk='web-admin-'+str(request.user.pk),defaults={'uid':0,'agent':'web','role':'admin','token_hash':hashlib.sha256(('web:'+secret('django-secret')+str(request.user.pk)).encode()).hexdigest()})
    else:raise Refused('authentication-required',401)
    if not peer and request.method not in ('GET','HEAD','OPTIONS'):
        from .api import csrf_check
        csrf_check(request)
    if admin and actor.role!='admin':raise Refused('administrator-required',403)
    return actor
