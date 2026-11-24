"""Surveillance persistante du nombre et des versions des liaisons MCP."""
from collections import defaultdict
from datetime import timedelta
from uuid import uuid4

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from . import __version__
from .connector_process import alive
from .core import commands as c, native_control
from .core.models import Actor, McpConnector, McpConvergence, McpDisconnectRecovery, NativeReload
from .mcp_disconnect_recovery import active_owner, enqueue, FRESH, update_in_progress
from .notifications import publish

RETRY = timedelta(seconds=60)


def catalog_ready(row, now):
    return (row.seen>=now-FRESH and row.state in ('READY','BUSY') and not row.uncertain
            and bool(row.loaded_version) and row.loaded_version==row.catalog_version and alive(row.worker))


def verified(row, now):
    return row.relay_version==row.loaded_version==__version__ and catalog_ready(row,now)


def conditions(rows, now):
    outdated=[row for row in rows if not verified(row,now)]
    return outdated,len(rows)>1


def topology_signature(rows, now):
    if not rows or not all(catalog_ready(row,now) for row in rows):
        return []
    return sorted([row.pk,row.generation,row.relay_version,row.catalog_version] for row in rows)


def stable_topology(incident, signature, now):
    if not signature:
        incident.pop('observation',None)
        return False
    observation=incident.get('observation',{})
    when=now.isoformat()
    if (observation.get('signature')!=signature
            or now-parse_datetime(observation['seen'])>FRESH):
        observation={'signature':signature,'since':when}
    observation['seen']=when
    incident['observation']=observation
    return now-parse_datetime(observation['since'])>=FRESH


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


def try_topology(scope, rows, incident, now, crowded):
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
        except c.Refused:
            continue
        if crowded:
            try:
                result=native_control.request(row.actor,{'request_id':'MCP-TOPOLOGY-'+uuid4().hex},
                                              expected=owner,convergence_scope=scope)
            except c.Refused:
                result={}
            if result.get('state') in native_control.PENDING:
                incident['topology_request']=result['request_id']
                return
        from .system_updates import request_topology_recovery
        request_id=request_topology_recovery(row,owner,'MCP-STDIO-'+uuid4().hex)
        if request_id:
            incident['topology_request']=request_id
            return


def admit_topology(native):
    if update_in_progress():
        return False
    actor=native.actor
    scope=native.result['convergence_scope']
    if scope!=actor.agent:
        return False
    rows=[row for row in watched_rows().filter(agent=actor.agent)
          if alive(row.process)]
    incident=McpConvergence.objects.filter(pk=scope).values_list('incident',flat=True).first() or {}
    now=timezone.now()
    signature=topology_signature(rows,now)
    return (len(rows)>1 and bool(signature) and incident.get('crowded_attempt')==native.pk
            and incident.get('observation',{}).get('signature')==signature)


@transaction.atomic
def inspect(scope, rows, now):
    current=McpConvergence.objects.select_for_update().filter(pk=scope).first()
    incident=dict(current.incident) if current else {}
    if not rows:
        if incident.pop('observation',None) is not None:
            current.incident=incident
            current.save(update_fields=['incident'])
        return
    outdated,crowded=conditions(rows,now)
    if not outdated and not crowded:
        if incident and not incident.get('finished'):
            if stable_topology(incident,topology_signature(rows,now),now):
                incident['finished']=now.isoformat()
                publish(f"mcp-convergence:{incident['id']}:end",title='MCP : état attendu confirmé',
                        body=f"Agent : {rows[0].agent}\nFin : {incident['finished']}\n"
                             f"Une liaison vérifiée ; relais, moteur et catalogue {__version__}.")
            current.incident=incident
            current.save(update_fields=['incident'])
        return
    new=not incident or bool(incident.get('finished'))
    if new:
        incident={'id':uuid4().hex,'started':now.isoformat()}
    before=dict(incident)
    incident.update(count=len(rows),outdated=[row.pk for row in outdated],too_many=crowded)
    topology_stable=stable_topology(incident,topology_signature(rows,now) if crowded else [],now)
    if new:
        details=[]
        if outdated:
            versions=', '.join(sorted({f'{row.relay_version or "?"}/{row.loaded_version or "?"}/{row.catalog_version or "?"}' for row in outdated}))
            details.append(f'Version attendue : {__version__}. Relais/moteur/catalogue observés : {versions}.')
        if crowded:details.append(f'{len(rows)} liaisons présentes ; maximum autorisé : 1.')
        publish(f"mcp-convergence:{incident['id']}:start",title='MCP : début de remédiation',
                body=f"Agent : {rows[0].agent}\nDébut : {incident['started']}\n"+'\n'.join(details))
    if not update_in_progress():
        if crowded and topology_stable and not incident.get('crowded_attempt'):
            previous=incident.get('topology_request')
            try_topology(scope,rows,incident,now,True)
            if incident.get('topology_request')!=previous:
                incident['crowded_attempt']=incident['topology_request']
        elif not crowded and any(row.relay_version!=__version__ for row in outdated):
            try_topology(scope,rows,incident,now,crowded)
        if not update_in_progress():
            try_version(outdated,now)
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
            groups[row.agent].append(row)
    open_scopes=McpConvergence.objects.exclude(incident__has_key='finished').values_list('scope',flat=True)
    for scope in sorted(set(groups).union(open_scopes)):
        inspect(scope,groups.get(scope,[]),now)
