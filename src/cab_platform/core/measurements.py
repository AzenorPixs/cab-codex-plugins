"""Périodes exclusives par SID et agrégats du change ; aucun total de session repris."""
from decimal import Decimal
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from cab_platform.measurement_sources import snapshot,difference,TOKEN_FIELDS
from cab_platform.sgs_engine import blank
from . import commands
from .models import CodingSession,MeasurementPeriod,MeasurementAction,Project,Change,Run
from .monitor import ensure_records


def period_data(period):
    values,coverage=difference(period.start_snapshot,period.end_snapshot) if period.ended else (period.values,period.coverage)
    value={'id':period.pk,'project_id':period.run.project_id,'change':period.change.identifier,'run_id':period.run.run_id,'session_id':period.session.native_id,'agent':period.session.agent,'uid':period.session.uid,'started':period.started.isoformat(),'ended':period.ended.isoformat() if period.ended else None,'values':values,'coverage':coverage,'stop_reason':period.stop_reason,'start_snapshot':period.start_snapshot,'end_snapshot':period.end_snapshot}
    return {**value,'sha256':commands.digest(value)}

def finish(period,at,sample,reason):
    period.ended=at;period.end_snapshot=sample;period.values,period.coverage=difference(period.start_snapshot,sample);period.stop_reason=reason
    period.save(update_fields=['ended','end_snapshot','values','coverage','stop_reason'])
    commands.event(period.run,'statistics-period-ended',{'period_id':period.pk,'reason':reason,'coverage':period.coverage['state']})

def transition(actor,data,action):
    run=commands.run_scope(actor,data['run_id'],data['project_id']);ensure_records(run)
    request_id=commands.identifier(data['request_id']);fingerprint=commands.digest({**data,'action':action})
    commands.require(type(data.get('from_coding_start',False)) is bool,'statistics-coverage-invalid',400)
    with transaction.atomic():
        session=CodingSession.objects.select_for_update().get(pk=run.coding_session_id)
        run=commands.run_scope(actor,data['run_id'],data['project_id'],lock=True)
        prior=MeasurementAction.objects.filter(run=run,request_id=request_id).first()
        if prior:
            commands.require(prior.digest==fingerprint,'statistics-request-conflict');return prior.result
        if action=='begin':commands.working(run);commands.require(not run.mandate.get('native_frozen_at'),'statistics-source-frozen')
        active=MeasurementPeriod.objects.select_for_update().select_related('run__actor','run__project','change','session').filter(session=session,ended__isnull=True).first()
        if action=='end' and active and active.run_id!=run.pk:active=None
        if action=='begin' or active:
            sample=snapshot(run);at=datetime.fromisoformat(sample['observed_at']) if sample.get('observed_at') else timezone.now()
            commands.require(not active or at>=active.started,'statistics-clock-regressed')
        if active:finish(active,at,sample,'switch' if action=='begin' else 'end')
        if action=='begin':
            sample={**sample,'from_coding_start':data.get('from_coding_start',False)}
            period=MeasurementPeriod.objects.create(session=session,run=run,change_id=run.change_record_id,started=at,start_snapshot=sample,coverage={'state':'open','reason':'period-not-ended'})
            commands.event(run,'statistics-period-started',{'period_id':period.pk,'request_id':request_id})
        else:period=active
        result={'action':action,'request_id':request_id,'period':period_data(period) if period else None,'previous_period_id':active.pk if active and action=='begin' else None}
        MeasurementAction.objects.create(run=run,request_id=request_id,digest=fingerprint,result=result)
        return result

def end_if_open(actor,run):
    # Un gel historique sans période ne fabrique pas de borne rétroactive.
    period=MeasurementPeriod.objects.filter(run=run,ended__isnull=True).first()
    if period:
        transition(actor,{'project_id':run.project_id,'run_id':run.run_id,'request_id':'CAB-FREEZE-'+str(period.pk)},'end')

def union_seconds(periods):
    spans=sorted((period.started,period.ended) for period in periods if period.ended)
    total=Decimal(0);start=end=None
    for left,right in spans:
        if end is None:start,end=left,right
        elif left<=end:end=max(end,right)
        else:total+=Decimal(str((end-start).total_seconds()));start,end=left,right
    if end is not None:total+=Decimal(str((end-start).total_seconds()))
    return str(total)

def aggregate(periods):
    rows=list(periods);effective={period.pk:period_data(period) for period in rows};keys=set(TOKEN_FIELDS.values())|{key for value in effective.values() for key in value['values']};metrics={};complete=bool(rows) and all(period.ended is not None for period in rows)
    for key in keys:
        eligible=complete and all(value['coverage'].get('state')=='bounded' and key in value['values'] for value in effective.values())
        parts=[int(value['values'][key]) for value in effective.values() if key in value['values']];observed=str(sum(parts)) if parts else None
        metrics[key]={'state':'known' if eligible else 'unavailable','value':observed if eligible else None,'observed_partial':observed,'reason':None if eligible else 'Une période ouverte, indisponible ou un champ absent empêche un total complet.'}
    return {'periods':list(effective.values()),'metrics':metrics,'complete':complete,'active_seconds':union_seconds(rows) if complete else None,'started':min((p.started for p in rows),default=None),'ended':max((p.ended for p in rows if p.ended),default=None),'sessions':sorted({p.session.native_id for p in rows}),'runs':sorted({p.run.run_id for p in rows})}

def run_statistics(actor,run,after=0):
    rows=list(MeasurementPeriod.objects.filter(run=run,pk__gt=max(0,after)).select_related('run','change','session').order_by('pk')[:200]);bounded=aggregate(rows)
    streams=[]
    for period in rows:
        effective=period_data(period)
        streams.append({'id':period.pk,'source':'cab-change-period','stream':str(period.pk),'sequence':int((period.ended or period.started).timestamp()*1000),'values':effective['values'],'coverage':effective['coverage'],'model':{},'scope':'change-period'})
    return {'run_id':run.run_id,'scope':'change-periods-only','streams':streams,'next_after':rows[-1].pk if len(rows)==200 else None,'bounded':bounded,'legacy_session_totals_excluded':True}

def change_statistics(actor,data):
    project=Project.objects.get(pk=data['project_id']);commands.scope(actor,project)
    commands.identifier(data['change'])
    change=Change.objects.filter(project=project,identifier=data['change']).first()
    periods=list(MeasurementPeriod.objects.filter(change=change).select_related('run','change','session').order_by('pk')[:1001]) if change else []
    commands.require(len(periods)<=1000,'statistics-period-limit',400)
    result=aggregate(periods);contribution=blank();contribution['sessions']=result['sessions'];contribution['proof_ids']=['change-periods:'+commands.digest([[row['id'],row['sha256']] for row in result['periods']])]
    runs=list(Run.objects.filter(project=project,change=data['change']).order_by('pk'));uncovered=[]
    for run in runs:
        first=next((p for p in result['periods'] if p['run_id']==run.run_id),None)
        if first is None or not first['start_snapshot'].get('from_coding_start'):uncovered.append(run.run_id)
    result['uncovered_runs']=uncovered;result['change_coverage_complete']=result['complete'] and bool(runs) and not uncovered
    if not result['change_coverage_complete']:
        for value in result['metrics'].values():value.update(state='unavailable',value=None,reason='Couverture du change incomplète ; les seules mesures partielles restent séparées.')
    for agent in sorted({row['agent'] for row in result['periods']}):contribution['agents'].append({'role':'coder','agent':agent,'model':'N/A','reasoning':'N/A'})
    for key,value in result['metrics'].items():
        if key in contribution['metrics'] and result['change_coverage_complete']:
            contribution['metrics'][key]={'state':value['state'],'value':value['value'],'reason':value['reason'],'evidence':[{'line':1,'note':'Périodes CAB : bornes et empreintes de l’export.'}]}
    if result['change_coverage_complete']:
        contribution['bounds']={'start':str(Decimal(str(result['started'].timestamp()))),'end':str(Decimal(str(result['ended'].timestamp())))}
        for key,value in [('duration',str(Decimal(str((result['ended']-result['started']).total_seconds())))),('net_duration',result['active_seconds'])]:
            contribution['metrics'][key]={'state':'known','value':value,'reason':None,'evidence':[{'line':1,'note':'Bornes serveur et union des périodes fermées.'}]}
    result['sgs_evidence']={'schema_version':1,'session_id':'cab-change-'+(change.pk if change else commands.digest(data))[:64],'scope':'cumulative','contribution':contribution,'notes':{'1':['Agrégat de périodes CAB bornées, plusieurs RUN et SID possibles ; aucun total historique de session repris.'],'3':['Les mesures natives portent les incréments observés entre instantanés ; pas de ventilation à l’intérieur d’un événement natif ou des événements tardifs.']}}
    if not result['change_coverage_complete']:
        result['sgs_evidence']['notes']['1'].append('Couverture du change incomplète : périodes ouvertes ou RUN sans attestation de début de codage ; totaux SGS indisponibles, mesures des seules périodes conservées séparément.')
    after=data.get('after',0);commands.require(type(after) is int and after>=0,'statistics-cursor-invalid',400)
    all_periods=result['periods'];selected=[row for row in all_periods if row['id']>after][:50]
    result['period_count']=len(all_periods);result['periods']=selected
    result['next_after']=selected[-1]['id'] if selected and any(row['id']>selected[-1]['id'] for row in all_periods) else None
    return {'schema':'cab-change-statistics-1','project_id':project.pk,'change':data['change'],**result}
