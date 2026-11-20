"""Surveillance persistante de la version et des canaux MCP réellement nécessaires."""
from collections import defaultdict
from datetime import timedelta
import os
from pathlib import Path
from uuid import uuid4

from django.db import transaction
from django.utils import timezone

from . import __version__
from .agent_runtime import pipes
from .connector_process import alive
from .core import commands as c, native_control
from .core.models import Actor, McpConnector, McpConvergence, McpDisconnectRecovery, NativeReload
from .mcp_disconnect_recovery import active_owner, enqueue, FRESH, update_in_progress
from .notifications import publish

RETRY = timedelta(seconds=60)


def attachment(row, cache):
    """Chaque extrémité du canal doit appartenir au même client vérifié."""
    owner=row.recovery_anchor.get('owner',{})
    if not owner or not active_owner(owner,row.agent):
        return None
    relay=Path('/proc',str(row.process['pid']))
    try:
        incoming=os.readlink(relay/'fd/0')
        outgoing=os.readlink(relay/'fd/1')
    except OSError:
        return None
    if incoming==outgoing or not all(item.startswith('pipe:[') for item in (incoming,outgoing)):
        return None
    pid=owner['pid']
    if pid not in cache:
        cache[pid]=set(pipes({'proc':Path('/proc',str(pid))},exclude_log=False) or [])
    if not alive(row.process) or not active_owner(owner,row.agent):
        return None
    ends=cache[pid]
    can_write=any((incoming,mode) in ends for mode in (os.O_WRONLY,os.O_RDWR))
    can_read=any((outgoing,mode) in ends for mode in (os.O_RDONLY,os.O_RDWR))
    return (incoming,outgoing) if can_write and can_read else None


def verified(row, now):
    return (row.seen>=now-FRESH and row.state in ('READY','BUSY') and not row.uncertain
            and row.loaded_version==row.catalog_version==__version__ and alive(row.worker))


def conditions(rows, now):
    outdated=[row for row in rows if not verified(row,now)]
    crowded=False
    if len(rows)>1:
        cache={}
        channels=[attachment(row,cache) for row in rows]
        crowded=not (all(channels) and len({end for pair in channels for end in pair})==2*len(rows))
    return outdated,crowded


def try_version(rows, now):
    for row in rows:
        with transaction.atomic():
            Actor.objects.select_for_update().get(pk=row.actor_id)
            current=McpConnector.objects.get(pk=row.pk)
            if verified(current,now) or not alive(current.process) or current.pending or current.uncertain:
                continue
            if not active_owner(current.recovery_anchor.get('owner',{}),current.agent):
                continue
            if (McpDisconnectRecovery.objects.filter(connector=current,finished__isnull=True).exists()
                    or NativeReload.objects.filter(actor=current.actor,state__in=native_control.PENDING).exists()):
                continue
            prior=McpDisconnectRecovery.objects.filter(connector=current,finished__isnull=False).order_by('-finished').first()
            if prior and now < prior.finished+RETRY:
                continue
            if prior and prior.report.get('method')=='DISPATCHED' and prior.state=='FAILED':
                # Un relais muet peut avoir reçu l'ordre : attendre une nouvelle
                # preuve de dialogue sans effet protégé avant une autre demande.
                coherent=(current.seen>prior.finished and current.state in ('READY','BUSY')
                          and bool(current.loaded_version) and current.loaded_version==current.catalog_version)
                if not coherent:
                    continue
            enqueue(current,purpose='convergence')


def try_topology(scope, rows, incident, now):
    previous=incident.get('topology_request')
    if previous and NativeReload.objects.filter(pk=previous,state__in=native_control.PENDING).exists():
        return
    if incident.get('topology_retry_at','')>now.isoformat():
        return
    incident['topology_retry_at']=(now+RETRY).isoformat()
    for row in rows:
        owner=row.recovery_anchor.get('owner',{})
        if row.pending or row.uncertain or not active_owner(owner,row.agent):
            continue
        if McpDisconnectRecovery.objects.filter(connector=row,finished__isnull=True).exists():
            continue
        try:
            native_control.boundary(row.actor,owner)
            result=native_control.request(row.actor,{'request_id':'MCP-TOPOLOGY-'+uuid4().hex},
                                          expected=owner,convergence_scope=scope)
        except c.Refused:
            continue
        incident['topology_request']=result['request_id']
        return


def admit_topology(native):
    if update_in_progress():
        return False
    actor=native.actor
    scope=native.result['convergence_scope']
    if scope!=f'{actor.agent}:{actor.uid}':
        return False
    rows=[row for row in watched_rows().filter(agent=actor.agent,actor__uid=actor.uid)
          if alive(row.process)]
    return conditions(rows,timezone.now())[1]


@transaction.atomic
def inspect(scope, rows, now):
    current=McpConvergence.objects.select_for_update().filter(pk=scope).first()
    if not rows:
        # L'absence de preuve n'annonce pas une reconnexion.
        return
    outdated,crowded=conditions(rows,now)
    incident=dict(current.incident) if current else {}
    if not outdated and not crowded:
        if incident and not incident.get('finished'):
            incident['finished']=now.isoformat()
            current.incident=incident
            current.save(update_fields=['incident'])
            publish(f"mcp-convergence:{incident['id']}:end",title='MCP : état attendu confirmé',
                    body=f"Agent : {rows[0].agent}\nFin : {incident['finished']}\n"
                         f"{len(rows)} liaison(s) vérifiée(s), moteur et catalogue {__version__}.")
        return
    new=not incident or bool(incident.get('finished'))
    if new:
        incident={'id':uuid4().hex,'started':now.isoformat()}
    before=dict(incident)
    incident.update(count=len(rows),outdated=[row.pk for row in outdated],topology_unproven=crowded)
    if new:
        details=[]
        if outdated:
            versions=', '.join(sorted({f'{row.loaded_version or "?"}/{row.catalog_version or "?"}' for row in outdated}))
            details.append(f'Version attendue : {__version__}. Moteur/catalogue observés : {versions}.')
        if crowded:details.append(f'{len(rows)} liaisons sans preuve de canaux indépendants.')
        publish(f"mcp-convergence:{incident['id']}:start",title='MCP : début de remédiation',
                body=f"Agent : {rows[0].agent}\nDébut : {incident['started']}\n"+'\n'.join(details))
    if not update_in_progress():
        try_version(outdated,now)
        if crowded:try_topology(scope,rows,incident,now)
    if new or incident!=before:
        McpConvergence.objects.update_or_create(pk=scope,defaults={'incident':incident})


def watched_rows():
    return (McpConnector.objects.filter(actor__active=True).select_related('actor')
            .exclude(state__in=['OBSERVED','SUPERSEDED','DISCONNECTED']))


def sweep():
    now=timezone.now()
    groups=defaultdict(list)
    for row in watched_rows().iterator():
        if alive(row.process):
            groups[f'{row.agent}:{row.actor.uid}'].append(row)
    for scope,rows in groups.items():
        inspect(scope,rows,now)
