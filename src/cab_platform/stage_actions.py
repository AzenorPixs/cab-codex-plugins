"""Matérialisation des seules actions observées sur un passage d’étape."""

from django.db import transaction
from django.utils import timezone

from .change_stage_metrics import PUBLICATION_KEYS, finish_iteration, refresh_total
from .core import commands as c
from .core.models import ChangeStage, ChangeStageIteration, Event, Operation, Run
from .logging import redact

AGENT_ACTIONS = {
    'initialization': {'mandats': 'Validation des mandats de la session', 'prevol': 'Prévol validé'},
    'analysis': {'constat': 'Constat validé', 'cause': 'Cause confirmée', 'impact': 'Impact vérifié'},
    'framing': {'perimetre': 'Périmètre validé', 'decision': 'Décision de cadrage confirmée'},
    'specification': {'specification': 'Spécification validée', 'criteres': 'Critères vérifiés'},
    'version-skill': {'version': 'Version contrôlée'},
    'implementation': {'unite': 'Travaux validés', 'integrite': 'Intégrité vérifiée'},
    'verification': {'resultat': 'Résultats de vérification contrôlés'},
    'review': {'revue': 'Revue effectuée', 'ecart': 'Écart vérifié'},
    'archival': {'archive': 'Archive contrôlée'},
    'statistics': {'rapport': 'Rapport statistique contrôlé'},
    'publication': {'publication': 'Publication contrôlée', 'artefact': 'Artefact contrôlé'},
    'closure': {'dossier': 'Dossier de clôture contrôlé'},
}

# Clé, libellé et étape fixe. None désigne le passage actif au moment du reçu.
CAB_EVENTS = {
    'run-created': ('run-ouvert', 'RUN enregistré', 'initialization'),
    'native-source-bound': ('liaison-native', 'Source native rattachée', 'initialization'),
    'git-files-reserved': ('reservation', 'Fichiers réservés', None),
    'git-stage-completed': ('indexation', 'Index CAB validé', None),
    'finalization-configured': ('contrat', 'Contrat de preuves enregistré', None),
    'package-version-prepared': ('alignement', 'Versions publiques alignées', 'version-skill'),
    'review-requested': ('revue-demandee', 'Dossier de revue remis', None),
    'mandate-archive-reconciled': ('rattachement', 'Archive rattachée au RUN', 'archival'),
    'statistics-inputs-frozen': ('gel', 'Données des statistiques figées', 'statistics'),
    'statistics-phase-validated': ('rapport-valide', 'Rapports statistiques validés', 'statistics'),
    'statistics-phase-failed': ('rapport-echec', 'Rapports statistiques en échec', 'statistics'),
    'stage-cab-publication-admitted': ('livraison-admise', 'Livraison prise en charge', 'publication'),
    'finalization-started': ('preuves', 'Preuves de clôture validées', 'closure'),
    'run-closed': ('sceau', 'Reçu de clôture enregistré', 'closure'),
}

AGENT_EVENTS = {
    'version-skill-acknowledged': ('lecture-version', 'Lecture du skill Version confirmée', 'version-skill'),
    'version-proposed': ('version-proposee', 'Version proposée', 'version-skill'),
    'delivery-version-selected': ('version-retenue', 'Version de livraison retenue', None),
    'review-decided': ('decision-revue', 'Décision de revue enregistrée', None),
    'exception-decided': ('decision-exception', 'Décision sur une exception enregistrée', None),
}


def normalize_mandates(values):
    import re
    c.require(isinstance(values,list) and 0 < len(values) <= 32
              and all(isinstance(value,str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}',value)
                      for value in values) and len(set(values))==len(values),
              'stage-mandates-invalid',400)
    return values


def mandates_for(run):
    return run.mandate.get('mandates') or ['CAB']


def _current(run):
    return run.configuration.get('stage_protocol', {}).get('current') or {}


def _parent(run, name, when, *, latest=False):
    rows=ChangeStageIteration.objects.filter(run=run,stage__key=name,parent__isnull=True,
                                            started_at__isnull=False)
    if not latest:
        from django.db.models import Q
        rows=rows.filter(started_at__lte=when).filter(Q(ended_at__isnull=True)|Q(ended_at__gte=when))
    return rows.order_by('-started_at','-pk').first()


def _stage_name(run):
    from .change_stage_metrics import keys_for
    keys=keys_for(run)
    return keys[run.stage-1] if run.stage and 0 < run.stage <= len(keys) else None


def _capture(run, parent, key, label, source, reference, at, state, receipt):
    """Un point de validation n’invente pas une heure de début."""
    ref=c.digest([run.pk,'observed-action',reference])
    row=ChangeStageIteration.objects.filter(run=run,reference=ref).first()
    if row and row.ended_at is not None:
        return row
    if row is None:
        if parent is None:
            return None
        stage,_=ChangeStage.objects.get_or_create(change_id=parent.stage.change_id,
                       key=f'{parent.stage.key}.action-{key}',defaults={'parent':parent.stage})
        row=ChangeStageIteration.objects.create(run=run,stage=stage,parent=parent,cycle=parent.cycle,
            reference=ref,state=state,description=label,description_source=source,
            started_at=at,
            iteration_number=stage.iterations.filter(run=run).count()+1,receipt=receipt)
    elif state!='RUNNING':
        row.receipt={**row.receipt,**receipt}
        row.save(update_fields=['receipt'])
    if state in ('COMPLETED','FAILED','CANCELLED'):
        finish_iteration(row,at,'action-receipt',state)
    elif state!='RUNNING':
        row.state=state
        row.save(update_fields=['state'])
        refresh_total(row.stage_id)
    else:
        refresh_total(row.stage_id)
    return row


def _simple(run,event,definition,source,*,parent=None,latest=False):
    key,label,fixed=definition
    name=fixed or _stage_name(run)
    parent=parent or (_parent(run,name,event.created,latest=latest) if name else None)
    receipt={'event_id':event.pk}
    if event.data.get('decision') in ('accept','changes-requested','allow','deny','reject'):
        receipt['decision']=event.data['decision']
    if isinstance(event.data.get('receipt_id'),str):
        receipt['receipt_id']=event.data['receipt_id']
    rejected=receipt.get('decision') in ('changes-requested','deny','reject')
    return _capture(run,parent,key,label,source,str(event.pk),event.created,
                    'FAILED' if rejected or key=='rapport-echec' else 'COMPLETED',receipt)


def _operation(run,event):
    request_id=event.data.get('request_id')
    if not isinstance(request_id,str) or not request_id:
        return
    receipt={'event_id':event.pk,'request_id':request_id}
    if event.kind=='operation-dispatched':
        name=_stage_name(run)
        operation=Operation.objects.filter(run=run,request_id=request_id).first()
        if operation:
            from django.db.models import Q
            parent=ChangeStageIteration.objects.filter(run=run,parent__isnull=True,started_at__lte=operation.created).filter(
                Q(ended_at__isnull=True)|Q(ended_at__gte=operation.created)).order_by('-started_at','-pk').first()
        else:
            parent=_parent(run,name,event.created) if name else None
        is_check=operation and operation.request.get('phase') in ('test','verify','verification')
        return _capture(run,parent,'execution','Contrôle exécuté par CAB' if is_check else 'Opération exécutée par CAB','cab',
                        'operation:'+request_id,event.created,'RUNNING',receipt)
    receipt['exit_code']=event.data.get('exit_code')
    raw=event.data.get('state')
    state='COMPLETED' if raw=='COMPLETED' and receipt['exit_code']==0 else raw if raw in ('UNKNOWN','CANCELLED') else 'FAILED'
    _capture(run,None,'execution','Retour CAB','cab','operation:'+request_id,event.created,state,receipt)


TRACKED = set(CAB_EVENTS)|set(AGENT_EVENTS)|{
    'operation-dispatched','operation-terminal','stage-agent-validated','stage-agent-started'
}


@transaction.atomic
def observe_event(event):
    if event.kind not in TRACKED or not event.run_id:
        return
    run=Run.objects.select_for_update().get(pk=event.run_id)
    if not run.change_record_id:
        return
    if event.kind.startswith('operation-'):
        _operation(run,event)
    elif event.kind=='stage-agent-started':
        if event.data.get('result',{}).get('stage')==1:
            parent=_parent(run,'initialization',event.created)
            if parent:
                for earlier in Event.objects.filter(run=run,created__lt=parent.started_at,
                                          kind__in=('run-created','native-source-bound')).order_by('pk'):
                    _simple(run,earlier,CAB_EVENTS[earlier.kind],'cab',parent=parent)
    elif event.kind=='stage-agent-validated':
        result=event.data.get('result',{})
        current=_current(run)
        if result.get('attempt')==current.get('attempt') and current.get('stage'):
            name=PUBLICATION_KEYS[current['stage']-1]
            _simple(run,event,('validation-agent','Étape validée par l’agent',name),'agent',latest=True)
    else:
        definition=CAB_EVENTS.get(event.kind) or AGENT_EVENTS[event.kind]
        parent=None
        if event.kind in ('statistics-phase-validated','statistics-phase-failed'):
            reference=c.digest([run.pk,'phase','statistics-'+str(event.data.get('job_id'))])
            parent=ChangeStageIteration.objects.filter(run=run,reference=reference).first()
            if parent is None:
                return
        _simple(run,event,definition,'cab' if event.kind in CAB_EVENTS else 'agent',
                parent=parent,latest=event.kind=='run-closed')


@transaction.atomic
def declare(actor,data):
    c.require({'project_id','run_id','request_id','attempt','action'}<=set(data)
              <= {'project_id','run_id','request_id','attempt','action','text','mandates','blocker_path'},
              'stage-action-fields-invalid',400)
    from .stage_protocol import authority, enabled
    run=c.run_scope(actor,data['run_id'],data['project_id'],lock=True,owner=False)
    c.require(enabled(run) and authority(actor,run),'stage-agent-authority-required',403)
    current=_current(run)
    key=c.identifier(data['request_id'])
    fingerprint=c.digest(data)
    old=Event.objects.filter(run=run,kind='stage-action-declared',data__request_id=key).first()
    if old:
        c.require(old.data['fingerprint']==fingerprint,'stage-action-request-conflict')
        return old.data['result']
    c.require(run.state in ('WORKING','FINALIZATION_PENDING','REVIEW_PENDING','ACCEPTED') and not run.suspension,
              'run-not-active')
    c.require(type(data['attempt']) is int and data['attempt']==current.get('attempt') and not current.get('validated'),
              'stage-attempt-not-current')
    name=PUBLICATION_KEYS[current['stage']-1]
    action=data['action']
    c.require(isinstance(action,str) and (action in AGENT_ACTIONS[name] or action=='blocage'),'stage-action-not-allowed',400)
    at=timezone.now()
    parent=_parent(run,name,at,latest=True)
    c.require(parent is not None,'stage-parent-not-observed')
    receipt={'attempt':current['attempt'],'request_id':key,'actor':actor.pk}
    label=AGENT_ACTIONS[name].get(action,'Bilan de blocage rédigé')
    if action=='mandats':
        provided=normalize_mandates(data.get('mandates'))
        c.require(set(provided)==set(mandates_for(run)),'stage-mandates-divergent')
        c.require(not mandates_validated(run,current['attempt']),'stage-mandates-already-confirmed')
        receipt['mandates']=mandates_for(run)
    else:
        c.require('mandates' not in data,'stage-action-fields-invalid',400)
    if action=='blocage':
        receipt.update(blocker_proof(run,data.get('blocker_path'),since=parent.started_at))
    else:
        c.require('blocker_path' not in data,'stage-action-fields-invalid',400)
    note=data.get('text','')
    c.require(isinstance(note,str) and len(note)<=1000,'stage-action-text-invalid',400)
    if note.strip():
        receipt['note']=redact(note.strip())
    row=_capture(run,parent,action,label,'agent','agent:'+key,at,'COMPLETED',receipt)
    result={'id':row.pk,'attempt':current['attempt'],'action':action,'state':row.state,'at':at.isoformat(),
            **({'mandates':receipt['mandates']} if 'mandates' in receipt else {})}
    c.event(run,'stage-action-declared',{'request_id':key,'fingerprint':fingerprint,'result':result})
    return result


def catalogue(actor,data):
    run=c.run_scope(actor,data['run_id'],data['project_id'],owner=False)
    current=_current(run)
    name=_stage_name(run)
    options=dict(AGENT_ACTIONS.get(name,{}))
    if name:options['blocage']='Bilan de blocage rédigé'
    return {'stage':name,'attempt':current.get('attempt'),'agent_actions':options,
            **({'mandates':mandates_for(run)} if name=='initialization' else {})}


def mandates_validated(run, attempt):
    return ChangeStageIteration.objects.filter(run=run,stage__key='initialization.action-mandats',
        description_source='agent',state='COMPLETED',receipt__attempt=attempt,receipt__mandates=mandates_for(run)).exists()


def blocker_proof(run, relative, *, since=None):
    from datetime import datetime, timezone as utc
    from pathlib import Path
    from cab_platform.statistics_documents import read_source, sha
    base=f'openspec/changes/{run.change}/'
    c.require(relative in (base+'BLOCKERS.md',base+'BLOCKER.md'),'stage-blocker-path-invalid',400)
    root=Path(run.project.root)
    path=c.safe_path(root,relative,exists=False)
    try:
        raw,info=read_source(root,path,1024*1024)
    except (OSError,ValueError):
        raise c.Refused('stage-blocker-unavailable') from None
    c.require(raw.strip(),'stage-blocker-unavailable')
    if since is not None:
        c.require(datetime.fromtimestamp(info.st_mtime,utc.utc)>=since,'stage-blocker-not-produced-in-passage')
    return {'path':relative,'sha256':sha(raw)}


def blocker_observer(run, request_id):
    """Ancrer le rappel d’écriture avant la bascule vers BLOCKING."""
    name=_stage_name(run)
    parent=_parent(run,name,timezone.now()) if name else None

    @transaction.atomic
    def written(relative, sha256, started, ended):
        if parent is None:
            return
        current=Run.objects.select_for_update().get(pk=run.pk)
        receipt={'path':relative,'sha256':sha256,'request_id':request_id}
        reference='blocker:'+request_id
        _capture(current,parent,'blocage','Bilan de blocage créé par CAB','cab',reference,started,'RUNNING',receipt)
        _capture(current,parent,'blocage','Bilan de blocage créé par CAB','cab',reference,ended,'COMPLETED',receipt)
        Run.objects.filter(pk=run.pk).update(updated=timezone.now())

    return written
