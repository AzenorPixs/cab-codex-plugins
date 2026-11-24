import {formatTokens,TokenSummary} from './cycleTokens'
import {Link} from '@tanstack/react-router'
import {useQuery} from '@tanstack/react-query'
import {useId,useRef,useState} from 'react'
import {TabBar} from './InterfaceSettings'
import {useRunElectric} from './useRunElectric'
import {StageOverview,CycleIterations,stageDuration,type StageMetrics,type CycleSummary} from './StageOverview'
import {api} from './api'
import {SessionTerminal} from './SessionTerminal'
import {reasonText,runStateLabel,runProtection} from './SessionLifecycle'

export const cycleStages=['Initialisation','Prévol','Analyse','Cadrage','Spécification','Implémentation','Vérifications','Revue','Archivage','Statistiques','Clôture']
const versionStages=[...cycleStages.slice(0,5),'Lecture du skill Version',...cycleStages.slice(5)]
const publicationStages=['Initialisation et Prévol','Analyse','Cadrage','Spécification','Versionning','Implémentation','Vérifications','Revue','Archivage','Statistiques','Publication','Clôture']
export function stageLabel(stage:number|null,steps=11,observedLabels?:string[],profile?:string){const labels=observedLabels?.length?observedLabels:profile==='publication-12-v1'?publicationStages:steps===12?versionStages:cycleStages;return stage!==null&&stage>=1&&stage<=labels.length?stage+'/'+labels.length+' '+labels[stage-1]:'Non renseignée'}
type Task={id:number;label:string;completed:boolean;line:number}
const tabs = [
  {id:'infos',label:'Informations'},
  {id:'finalization',label:'Finalisation'},
  {id:'cycle',label:'Étapes du cycle'},
  {id:'change',label:'Change'},
] as const
type RunData={mode?:string;cycle_summary?:CycleSummary;replacement?:{run_id:string}|null;run_id:string;session_id:string;change:string;state:string;suspension:string;monitor:{stage_protocol?:{current:{stage:number;attempt:number;validated:boolean}|null;reports:{stage:number;attempt:number;state:string;error?:string}[]}|null;last_reminder?:{message:string;state:string;at:string}|null;stage:number|null;cycle_steps?:number;stages?:string[];phase:string|null;pending_requests:number|null;native_activity:{source:string;observed_at:string}|null;current_mandate:{id:string;paths:string[];criteria:string[]}|null;terminal_gate:Record<string,unknown>|null;last_proven_milestone:{label:string;at:string}|null;waiting_cause:string|null;blocking_runs:string[];change_record:{identifier:string;source_path:string;source_state:string;tasks:Task[];tasks_done:number|null;tasks_total:number|null;tasks_sha256:string;observed_at:string|null}|null}}
export function RunView({projectId,runId,routeId}:{projectId:string;runId:string;routeId?:string}){
  const live=useRunElectric(projectId,runId)
  const [selectedStage,setSelectedStage]=useState(0)
  const [selectedTab,setSelectedTab]=useState(0)
  const prefix=useId()
  const cyclePrefix=prefix+'-cycle'
  const cycleRef=useRef<HTMLDivElement>(null)
  const metrics=useQuery({queryKey:['stage-metrics',projectId,runId],queryFn:()=>api<StageMetrics>(`projects/${projectId}/change-stage-metrics?`+new URLSearchParams({run_id:runId}))})
  const finalization=useQuery({queryKey:['finalization',projectId,runId],queryFn:()=>api<{phase:string;missing:string[];nature?:string;evidence:{id:number;source:string;payload:{rule_id:string;kind:string;result:string}}[]}>('finalization?'+new URLSearchParams({project_id:projectId,run_id:runId}))})
  const query=useQuery({queryKey:['run',projectId,runId],queryFn:()=>api<RunData>('run?'+new URLSearchParams({project_id:projectId,run_id:runId}))})
  if(query.isPending)return <p role="status">Chargement du RUN…</p>
  if(query.error)return <p role="alert">RUN indisponible : {query.error.message}</p>
  if(query.data.replacement){
    const replacement=query.data.replacement
    return <article className="run-view">
      <Link to="/projects/$projectId/archives" params={{projectId:routeId||projectId}} className="action-link">← Archives</Link>
      <div className="run-heading"><h1>{runId}</h1><span className="badge">{runStateLabel(query.data.state)}</span></div>
      <p>Replacement · <Link to="/projects/$projectId/runs/$runId" params={{projectId:routeId||projectId,runId:replacement.run_id}}>{replacement.run_id}</Link></p>
    </article>
  }
  const visibleEvidence=finalization.data?.evidence.filter(item=>item.source!=='cab-update')||[]
  const run=query.data;const monitor=run.monitor;const change=monitor.change_record
  const summary=run.cycle_summary
  const piloted=run.mode==='piloted'||metrics.data?.piloted
  const cycleTokens=summary?.tokens??metrics.data?.tokens
  const lastCycle=metrics.data?.cycles?.at(-1)
  const date=(value:string|null|undefined)=>value?new Date(value).toLocaleString('fr-FR'):'Non observée'
  const duration=(value:number|null|undefined,complete?:boolean)=>value==null?'Non observée':stageDuration(value)+(complete===false?' (partielle)':'')
  const labels=monitor.stages?.length?monitor.stages:monitor.cycle_steps===12?versionStages:cycleStages
  const steps=monitor.cycle_steps||labels.length
  const cycleTabs=[{id:'summary',label:'Résumé'},...labels.map((_,index)=>({id:String(index+1),label:String(index+1)}))]
  const activeStage=selectedStage<cycleTabs.length?selectedStage:0
  function openStage(number:number){
    setSelectedStage(number)
    cycleRef.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[number]?.focus()
  }
  const panels=[
    <>
      {runProtection(run.suspension)&&<p className="protection-label">{runProtection(run.suspension)}</p>}
    <dl className="run-information">
      <div><dt>Mandat courant</dt><dd>{monitor.current_mandate?`Mandat autonome ${monitor.current_mandate.id}`:'Aucun mandat observé'}</dd></div>
      <div><dt>Étape</dt><dd>{stageLabel(monitor.stage,monitor.cycle_steps,monitor.stages)}</dd></div>
      <div><dt>Nombre d’itérations du cycle</dt><dd>{summary?.iteration_count??'Non observé'}</dd></div>
      <div><dt>Début du dernier cycle</dt><dd>{date(summary?.last_started_at)}</dd></div>
      <div><dt>Fin du dernier cycle</dt><dd>{date(summary?.last_ended_at)}</dd></div>
      <div><dt>Durée totale des cycles</dt><dd>{duration(summary?.duration_seconds,summary?.duration_complete)}</dd></div>
      <div><dt>Durée totale des cycles « CAB »</dt><dd>{duration(summary?.cab_seconds,summary?.cab_seconds_complete)}</dd></div>
      <div><dt>Durée totale des cycles « Agent(s) »</dt><dd>{duration(summary?.agent_seconds,summary?.agent_seconds_complete)}</dd></div>
      <div><dt>Durée totale des cycles « Attente »</dt><dd>{duration(summary?.waiting_seconds,summary?.waiting_seconds_complete)}</dd></div>
      {([
        ['input_tokens','Tokens Entrant total des cycles'],
        ['output_tokens','Tokens Sortant total des cycles'],
        ['cache_read_tokens','Tokens lus dans le cache total des cycles'],
        ['cache_write_tokens','Tokens écrits dans le cache total des cycles'],
      ] as const).map(([field,label])=><div key={field}><dt>{label}</dt><dd>
        {piloted?<span className="cycle-token-group">
          <span>Codeur : {formatTokens(cycleTokens?.coder?.[field])}</span>
          <span>Orchestrateur : {formatTokens(cycleTokens?.orchestrator?.[field])}</span>
        </span>:formatTokens(cycleTokens?.coder?.[field])}
      </dd></div>)}
      <div><dt>Demandes indécises</dt><dd>{monitor.pending_requests??'—'}</dd></div>
      <div><dt>Cause / attente</dt><dd>{monitor.waiting_cause||'Non observée'}</dd></div>
      <div><dt>RUN bloquants</dt><dd>{monitor.blocking_runs.length?monitor.blocking_runs.join(', '):'Non observés'}</dd></div>
    </dl>
    {monitor.last_reminder?.message&&<aside className="change-progress" aria-label="Dernier rappel CAB">
      <p>{monitor.last_reminder.message}</p>
      <small>{new Date(monitor.last_reminder.at).toLocaleString('fr-FR')} · {monitor.last_reminder.state==='SENT'?'Envoyé à la session':monitor.last_reminder.state==='UNKNOWN'?'Remise indéterminée':monitor.last_reminder.state==='INTENT'?'En cours de remise':'Visible dans CAB'}</small>
    </aside>}
    </>,
    <>
    {finalization.data&&finalization.data.phase!=='LEGACY'&&<section className="change-progress"><h2>Finalisation CAB</h2><p>{finalization.data.phase==='READY'?'Ready':finalization.data.phase==='REVIEW'?'In review':finalization.data.phase==='WAITING'?'Awaiting evidence':runStateLabel(finalization.data.phase)}</p>{finalization.data.missing.length>0&&<ul>{finalization.data.missing.map(code=><li key={code}>{reasonText(code)}</li>)}</ul>}<p>{visibleEvidence.length} preuve(s) enregistrée(s).</p>{visibleEvidence.length>0&&<ul>{visibleEvidence.map(item=><li key={item.id}>{item.payload.rule_id} · {item.payload.kind} · {item.payload.result==='passed'?'contrôle satisfait':'contrôle non satisfait'} · {item.source}</li>)}</ul>}</section>}
      {finalization.isPending&&<p role="status">Chargement de la finalisation…</p>}
      {finalization.error&&<p role="alert">Finalisation indisponible</p>}
      {finalization.data?.phase==='LEGACY'&&<p>Aucune finalisation enregistrée.</p>}
    </>,
    <>
      <div ref={cycleRef} className="run-cycle-tabs">
        <TabBar items={cycleTabs} selected={activeStage} select={setSelectedStage} prefix={cyclePrefix} label="Navigation dans le cycle" secondary/>
      </div>
      {cycleTabs.map(({id},number)=><div key={id} role="tabpanel" id={cyclePrefix+'-panel-'+id}
        aria-labelledby={cyclePrefix+'-tab-'+id} hidden={activeStage!==number} tabIndex={0}>
        {activeStage===number&&(number===0?<>          <section className="run-cycle">
            <div className="run-cycle-heading"><h2>Les {steps} étapes du cycle</h2><p className="cycle-token-summary"><strong>Dernier Cycle</strong><span>Durée : {duration(summary?.last_duration_seconds)}</span><TokenSummary tokens={lastCycle?.tokens} piloted={piloted}/></p></div>
            <ol>{labels.map((label,index)=><li key={index} className={monitor.stage===index+1?'current-stage':''}
              aria-current={monitor.stage===index+1?'step':undefined}>
              <button type="button" className="action-link" onClick={()=>openStage(index+1)}>
                <span>{index+1}/{steps}</span> {label}
              </button>
            </li>)}</ol>
            <p className="configuration-help">Le cycle accepte les retours vers une étape antérieure. La position ne valide ni les étapes précédentes, ni le gate terminal.</p>
          </section>
          <p className="cycle-token-summary cycle-total"><span><strong>Totale de tous les cycles</strong> : {duration(summary?.duration_seconds,summary?.duration_complete)}</span><TokenSummary tokens={cycleTokens} piloted={piloted}/></p>
          {metrics.data?.cycles&&<CycleIterations cycles={metrics.data.cycles} piloted={piloted}/>}
        </>:<>
          {metrics.isPending&&<p role="status">Chargement de l’étape…</p>}
          {metrics.error&&<p role="alert">Détail de l’étape indisponible.</p>}
          <StageOverview stage={metrics.data?.stages[number-1]} title={labels[number-1]} piloted={piloted} expanded/>
        </>)}
      </div>)}
    </>,
    <section className="change-progress"><h2>Avancement du change</h2><p className="tasks-count">{change?.tasks_total!=null?`${change.tasks_done}/${change.tasks_total} tâches`:'Tâches non observées'}</p>{change&&change.tasks_total!=null&&<><ol className="change-tasks">{change.tasks.map(task=><li key={task.id}><span className={task.completed?'task-completed':'task-pending'} aria-label={task.completed?'Réalisée':'À réaliser'}>{task.completed?'✓':'○'}</span><span>{task.label}</span></li>)}</ol><p className="task-provenance">Source : <code>{change.source_path}</code>{change.observed_at&&` · observée le ${new Date(change.observed_at).toLocaleString('fr-FR')}`}</p>{!['open','archived'].includes(change.source_state)&&<p role="status">Source actuellement indisponible ou ambiguë ; dernière observation conservée.</p>}</>}<p className="configuration-help">Les cases cochées proviennent de tasks.md. Elles ne constituent ni une estimation de durée, ni une preuve de validation du RUN.</p></section>
  ]
  return <article className="run-view run-view-terminal">
    <Link to="/projects/$projectId/sessions" params={{projectId:routeId||projectId}} className="action-link">← Sessions du projet</Link>
    {!live&&<p role="status" className="configuration-help">Synchronisation temps réel…</p>}
    <div className="run-view-columns">
      <div className="run-view-left">
    <section className="run-session-block">
      <TabBar items={tabs} selected={selectedTab} select={setSelectedTab} prefix={prefix} label="Vue de la session"/>
      <div className="agent-card forge-card run-session-card">
      <div className="forge-heading">
        <h1 className="run-card-title">
          <span className="forge-logo run-development-logo" aria-hidden="true">{'</>'}</span>
          <span>{run.session_id||run.run_id} | {run.change||'Non renseigné'}</span>
        </h1>
      </div>
      <div className="forge-card-content">
        {tabs.map(({id},index)=><div key={id} role="tabpanel" id={prefix+'-panel-'+id}
          aria-labelledby={prefix+'-tab-'+id} hidden={selectedTab!==index} tabIndex={0}>{panels[index]}</div>)}
      </div>
      </div>
    </section>
      </div>
      <SessionTerminal key={projectId+':'+runId} projectId={projectId} runId={runId}
        enabled={run.state==='WORKING'&&!run.suspension}/>
    </div>
  </article>
}
