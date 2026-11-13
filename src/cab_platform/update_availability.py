"""Cache public de la release officielle ; réseau sur un worker séparé."""
from datetime import timedelta
import json
import re
import secrets
from urllib.request import Request,urlopen
from django.db import transaction
from django.utils import timezone
from . import __version__
from .core.models import UpdateAvailability

def version_tuple(value):
    if not isinstance(value,str) or not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)',value) or len(value)>100:return None
    return tuple(int(part) for part in value.split('.'))

def view():
    from .paths import runtime_config
    if not runtime_config().get('initialized'):return {'current_version':__version__,'latest_version':None,'update_available':False,'checked_at':None,'next_check_at':None,'error':None}
    cached=UpdateAvailability.objects.filter(pk=1).first()
    latest=cached.latest_version if cached else ''
    return {'current_version':__version__,'latest_version':latest or None,'update_available':bool(version_tuple(latest) and version_tuple(latest)>version_tuple(__version__)),'checked_at':cached.checked_at.isoformat() if cached and cached.checked_at else None,'next_check_at':cached.next_check_at.isoformat() if cached and cached.next_check_at else None,'error':cached.error or None if cached else None}

def request_check(force=False):
    cached,_=UpdateAvailability.objects.get_or_create(pk=1)
    if not force and cached.checked_at and timezone.now()-cached.checked_at<timedelta(hours=24):return view()
    UpdateAvailability.objects.filter(pk=cached.pk).update(**({'requested':True,'forced':True} if force else {'requested':True}))
    return view()

def check():
    now=timezone.now()
    with transaction.atomic():
        UpdateAvailability.objects.get_or_create(pk=1)
        cached=UpdateAvailability.objects.select_for_update().get(pk=1)
        if cached.checking_until and cached.checking_until>now:return
        if not cached.requested and cached.next_check_at and cached.next_check_at>now:return
        # Limite commune à tous les clients, y compris les rechargements Web.
        if not cached.forced and cached.checked_at and now-cached.checked_at<timedelta(hours=24):return
        cached.checking_until=now+timedelta(seconds=60);cached.requested=False;cached.forced=False;cached.save(update_fields=['checking_until','requested','forced'])
    version='';error=''
    try:
        request=Request('https://api.github.com/repos/AzenorPixs/cab-codex-plugins/releases/latest',headers={'Accept':'application/vnd.github+json','User-Agent':'CAB/'+__version__})
        with urlopen(request,timeout=15) as response:
            raw=response.read(1024*1024+1)
        if len(raw)>1024*1024:raise ValueError('release-too-large')
        release=json.loads(raw)
        if not isinstance(release,dict):raise ValueError('release-invalid')
        tag=release.get('tag_name','')
        if not isinstance(tag,str) or not tag.startswith('v') or not version_tuple(tag[1:]) or release.get('draft') or release.get('prerelease'):raise ValueError('release-invalid')
        version=tag[1:]
    except (OSError,ValueError,TypeError):error='github-version-check-unavailable'
    with transaction.atomic():
        cached=UpdateAvailability.objects.select_for_update().get(pk=1)
        if version:cached.latest_version=version
        cached.error=error;cached.checked_at=timezone.now();cached.next_check_at=cached.checked_at+timedelta(hours=24,seconds=secrets.randbelow(86401));cached.checking_until=None
        cached.save(update_fields=['latest_version','error','checked_at','next_check_at','checking_until'])
