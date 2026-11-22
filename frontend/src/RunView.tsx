import {Link} from '@tanstack/react-router'
import {useQuery} from '@tanstack/react-query'
import {useState} from 'react'
import {useRunElectric} from './useRunElectric'
import {StageOverview,CompleteCycles,stageDuration,type StageMetrics} from './StageOverview'
import {api} from './api'
import {reasonText,runStateLabel,runProtection} from './SessionLifecycle'

export const cycleStages=['Initialisation','Prévol','Analyse','Cadrage','Spécification','Implémentation','Vérifications','Revue','Archivage','Statistiques','Clôture']
const versionStages=[...cycleStages.slice(0,5),'Lecture du skill Version',...cycleStages.slice(5)]
const publicationStages=['Initialisation et Prévol','Analyse','Cadrage','Spécification','Versionning','Implémentation','Vérifications','Revue','Archivage','Statistiques','Publication','Clôture']
export function stageLabel(stage:number|null,steps=11,observedLabels?:string[],profile?:string){const labels=observedLabels?.length?observedLabels:profile==='publication-12-v1'?publicationStages:steps===12?versionStages:cycleStages;return stage!==null&&stage>=1&&stage<=labels.length?stage+'/'+labels.length+' '+labels[stage-1]:'Non renseignée'}
type Task={id:number;label:string;completed:boolean;line:number}
const stageReportState=(state:string)=>({ADMITTED:'Pris en charge',QUEUED:'En attente',ARCHIVE_WAITING:'Archive attendue',PENDING:'En attente',DISPATCHING:'En cours de lancement',RUNNING:'En cours',COMPLETED:'Validé',FAILED:'Échec',PARTIAL:'Incomplet',UNKNOWN:'Indéterminé',NOT_STARTED:'Pas encore démarré'} as Record<string,string>)[state]||state
type RunData={replacement?:{run_id:string}|null;run_id:string;session_id:string;change:string;state:string;suspension:string;monitor:{stage_protocol?:{current:{stage:number;attempt:number;validated:boolean}|null;reports:{stage:number;attempt:number;state:string;error?:string}[]}|null;last_reminder?:{message:string;state:string;at:string}|null;stage:number|null;cycle_steps?:number;stages?:string[];phase:string|null;pending_requests:number|null;native_activity:{source:string;observed_at:string}|null;current_mandate:{id:string;paths:string[];criteria:string[]}|null;terminal_gate:Record<string,unknown>|null;last_proven_milestone:{label:string;at:string}|null;waiting_cause:string|null;blocking_runs:string[];change_record:{identifier:string;source_path:string;source_state:string;tasks:Task[];tasks_done:number|null;tasks_total:number|null;tasks_sha256:string;observed_at:string|null}|null}}
export function RunView({projectId,runId,routeId}:{projectId:string;runId:string;routeId?:string}){
  const live=useRunElectric(projectId,runId);const [selectedStage,setSelectedStage]=useState<number|null>(null)
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
  const run=query.data;const monitor=run.monitor;const change=monitor.change_record;const gate=monitor.terminal_gate
  const activeStageReport=monitor.stage_protocol?.reports.find(report=>report.attempt===monitor.stage_protocol?.current?.attempt)
  const gateText=run.state==='CLOSURE_INVALID'?'Closure issue':gate?.branch==='HISTORIQUE'?'Historical closure':gate?.branch==='TERMINÉ'?'Closed':gate?.branch==='BLOQUÉ'?'Blocked':gate?.decision==='accept'?'Accepted':gate?.decision==='changes-requested'?'Changes requested':gate?'Observed':'Unknown'
  return <article className="run-view"><Link to="/projects/$projectId/sessions" params={{projectId:routeId||projectId}} className="action-link">← Sessions du projet</Link><div className="run-heading"><h1>{run.run_id}</h1><span className="badge">{runStateLabel(run.state,run.suspension)}</span>{runProtection(run.suspension)&&<small>{runProtection(run.suspension)}</small>}</div>
    <dl className="run-metadata"><dt>Change</dt><dd>{run.change||'Non renseigné'}</dd><dt>Session</dt><dd><code>{run.session_id||'Non renseignée'}</code></dd><dt>Étape</dt><dd>{stageLabel(monitor.stage,monitor.cycle_steps,monitor.stages)}</dd><dt>Phase</dt><dd>{monitor.phase||'Non renseignée'}</dd><dt>Activité native</dt><dd>{monitor.native_activity?`${monitor.native_activity.source} · observée le ${new Date(monitor.native_activity.observed_at).toLocaleString('fr-FR')}`:'Non observée'}</dd><dt>Mandat courant</dt><dd>{monitor.current_mandate?`Mandat autonome ${monitor.current_mandate.id}`:'Aucun mandat observé'}</dd><dt>Gate terminal</dt><dd>{gateText}</dd><dt>Demandes indécises</dt><dd>{monitor.pending_requests??'—'}</dd><dt>Dernier jalon prouvé</dt><dd>{monitor.last_proven_milestone?`${monitor.last_proven_milestone.label} · ${new Date(monitor.last_proven_milestone.at).toLocaleString('fr-FR')}`:'Non observé'}</dd><dt>Cause / attente</dt><dd>{monitor.waiting_cause||'Non observée'}</dd><dt>RUN bloquants</dt><dd>{monitor.blocking_runs.length?monitor.blocking_runs.join(', '):'Non observés'}</dd></dl>
    {finalization.data&&finalization.data.phase!=='LEGACY'&&<section className="change-progress"><h2>Finalisation CAB</h2><p>{finalization.data.phase==='READY'?'Ready':finalization.data.phase==='REVIEW'?'In review':finalization.data.phase==='WAITING'?'Awaiting evidence':runStateLabel(finalization.data.phase)}</p>{finalization.data.missing.length>0&&<ul>{finalization.data.missing.map(code=><li key={code}>{reasonText(code)}</li>)}</ul>}<p>{finalization.data.evidence.length} preuve(s) enregistrée(s).</p>{finalization.data.evidence.length>0&&<details><summary>Consulter les preuves</summary><ul>{finalization.data.evidence.map(item=><li key={item.id}>{item.payload.rule_id} · {item.payload.kind} · {item.payload.result==='passed'?'contrôle satisfait':'contrôle non satisfait'} · {item.source}</li>)}</ul></details>}</section>}
    <section className="run-cycle"><h2>Les {monitor.cycle_steps||11} étapes du cycle</h2><ol>{(monitor.stages||cycleStages).map((label,index)=><li key={label} className={monitor.stage===index+1?'current-stage':''} aria-current={monitor.stage===index+1?'step':undefined}><button type="button" className="action-link" onClick={()=>setSelectedStage(index)}><span>{index+1}/{monitor.cycle_steps||11}</span> {label}</button></li>)}</ol><p className="configuration-help">Le cycle accepte les retours vers une étape antérieure. La position ne valide ni les étapes précédentes, ni le gate terminal.</p></section>
    {!live&&<p role="status" className="configuration-help">Synchronisation temps réel…</p>}
    {monitor.stage_protocol&&<section className="change-progress" aria-label="Validation des étapes">
      {monitor.stage_protocol.current&&<p>{monitor.stage_protocol.current.validated?'Part de l’agent validée':activeStageReport&&activeStageReport.state!=='COMPLETED'?'Retour de CAB attendu':'Validation de l’agent attendue'}</p>}
      {monitor.stage_protocol.reports.length>0&&<ul>
        {monitor.stage_protocol.reports.map(report=><li key={report.attempt}>
          {monitor.stages?.[report.stage-1]||'Étape '+report.stage} · {stageReportState(report.state)}{report.error&&' · '+report.error}
        </li>)}
      </ul>}
    </section>}
    {monitor.last_reminder?.message&&<aside className="change-progress" aria-label="Dernier rappel CAB">
      <p>{monitor.last_reminder.message}</p>
      <small>{new Date(monitor.last_reminder.at).toLocaleString('fr-FR')} · {monitor.last_reminder.state==='SENT'?'Envoyé à la session':monitor.last_reminder.state==='UNKNOWN'?'Remise indéterminée':monitor.last_reminder.state==='INTENT'?'En cours de remise':'Visible dans CAB'}</small>
    </aside>}
    {metrics.data?.complete_cycle_duration_seconds!=null&&<p>Durée totale du cycle : {stageDuration(metrics.data.complete_cycle_duration_seconds)}</p>}
    {selectedStage!==null&&<StageOverview stage={metrics.data?.stages[selectedStage]} title={(monitor.stages||cycleStages)[selectedStage]||''}/>}
    {metrics.data?.cycles&&<CompleteCycles cycles={metrics.data.cycles}/>}
    <section className="change-progress"><h2>Avancement du change</h2><p className="tasks-count">{change?.tasks_total!=null?`${change.tasks_done}/${change.tasks_total} tâches`:'Tâches non observées'}</p>{change&&change.tasks_total!=null&&<><details><summary>Examiner les {change.tasks_total} tâches</summary><ol className="change-tasks">{change.tasks.map((task,index)=><li key={task.id}><span className={task.completed?'task-completed':'task-pending'} aria-label={task.completed?'Réalisée':'À réaliser'}>{task.completed?'✓':'○'}</span><span>{task.label}</span></li>)}</ol></details><p className="task-provenance">Source : <code>{change.source_path}</code>{change.observed_at&&` · observée le ${new Date(change.observed_at).toLocaleString('fr-FR')}`}</p>{!['open','archived'].includes(change.source_state)&&<p role="status">Source actuellement indisponible ou ambiguë ; dernière observation conservée.</p>}</>}<p className="configuration-help">Les cases cochées proviennent de tasks.md. Elles ne constituent ni une estimation de durée, ni une preuve de validation du RUN.</p></section>
  </article>
}
