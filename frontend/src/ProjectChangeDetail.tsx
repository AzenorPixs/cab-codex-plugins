import {useQuery} from '@tanstack/react-query'
import {Link} from '@tanstack/react-router'
import {api,ApiError} from './api'
import type {ChangeRow} from './ProjectChanges'

type ChangeDetail={
  id:string
  identifier:string
  selected:ChangeRow
  sources:ChangeRow[]
  hashes:Record<string,string>
  tasks:{label:string;completed:boolean;position:number;source_line:number}[]
  stages:{key:string;label:string;iteration_count:number;duration_seconds:string|null;updated_at:string|null}[]
  statistics:{
    status:string;sha256:string;imported_at:string;manual_override:boolean
    metrics:{key:string;state:string;value:string|null;unit:string}[]
  }|null
  run_ids:string[]
}

function DateValue({value,day=false}:{value:string|null;day?:boolean}){
  if(!value)return <>—</>
  const date=new Date(value)
  return <time dateTime={value}>{day?date.toLocaleDateString('fr-FR',{timeZone:'UTC'}):date.toLocaleString('fr-FR')}</time>
}

const reportStates:Record<string,string>={ready:'Disponible',missing:'Absent','not-started':'Non démarré',unavailable:'Indisponible'}

export function ProjectChangeDetail({projectId,routeId,changeId,source}:{
  projectId:string;routeId:string;changeId:string;source?:string
}){
  const query=useQuery({
    queryKey:['project-change-detail',projectId,changeId,source],
    networkMode:'always',
    queryFn:()=>api<ChangeDetail>('projects/'+encodeURIComponent(projectId)+'/changes/'+encodeURIComponent(changeId)
      +(source?'?'+new URLSearchParams({source}):'')),
  })
  const data=query.data
  const row=data?.selected
  const error=query.error instanceof ApiError&&['change-not-found','change-source-not-found'].includes(query.error.code)
    ? 'Change ou source introuvable.' : 'Détail du change indisponible.'
  return <article className="project-content project-change-detail run-view">
    <Link className="action-link" to="/projects/$projectId/changes" params={{projectId:routeId}}
      search={{status:row?.archived?'archived':'open'}}>← Changes du projet</Link>
    {query.isPending&&<p role="status">Chargement du change…</p>}
    {query.error&&<p role="alert">{error}</p>}
    {data&&row&&<section className="agent-card forge-card run-session-card">
      <div className="forge-heading">
        <h1 className="run-card-title">{row.title||data.identifier}</h1>
      </div>
      <div className="forge-card-content">
        <dl className="change-detail-summary">
          <dt>Identifiant OpenSpec</dt><dd>{data.identifier}</dd>
          <dt>Identifiant CAB</dt><dd><code>{data.id}</code></dd>
          <dt>État</dt><dd>{row.archived?'Archivé':'Ouvert'}</dd>
          <dt>Source</dt><dd><code>{row.source}</code></dd>
          <dt>Dernière modification</dt><dd><DateValue value={row.changed_at}/></dd>
          {row.archived&&<><dt>Archivage</dt><dd><DateValue value={row.archived_at} day/></dd></>}
        </dl>
        {data.sources.length>1&&<section>
          <h2>Sources du change</h2>
          <ul>{data.sources.map(item=><li key={item.source}>
            <Link to="/projects/$projectId/changes/$changeId" params={{projectId:routeId,changeId:data.identifier}}
              search={{source:item.source}} aria-current={item.source===row.source?'page':undefined}>{item.source}</Link>
          </li>)}</ul>
        </section>}
        <section className="change-progress">
          <h2>Tâches</h2>
          <p>{row.tasks_done===null||row.tasks_total===null?'Tâches non observées':row.tasks_done+'/'+row.tasks_total+' terminées'}</p>
          {data.tasks.length>0&&<ul className="change-tasks">{data.tasks.map(task=><li key={task.position}>
            {task.completed?'Terminée':'À faire'} · {task.label}
          </li>)}</ul>}
        </section>
        <section>
          <h2>Empreintes SHA‑256</h2>
          {Object.keys(data.hashes).length>0?<dl className="change-detail-summary">{Object.entries(data.hashes).map(([name,hash])=>
            <div key={name}><dt>{name}</dt><dd><code>{hash}</code></dd></div>
          )}</dl>:<p>Aucune empreinte en base.</p>}
        </section>
        <section>
          <h2>Étapes du change</h2>
          {data.stages.length>0?<ul>{data.stages.map(stage=><li key={stage.key}>
            {stage.label} · {stage.iteration_count} passage(s) · {stage.duration_seconds===null?'—':Number(stage.duration_seconds).toLocaleString('fr-FR')+' s'}
            {' · '}<DateValue value={stage.updated_at}/>
          </li>)}</ul>:<p>Aucune étape observée.</p>}
        </section>
        <section>
          <h2>Statistiques du change</h2>
          {data.statistics?<><dl className="change-detail-summary">
            <dt>État du rapport</dt><dd>{reportStates[data.statistics.status]||data.statistics.status}</dd>
            <dt>Dernier import</dt><dd><DateValue value={data.statistics.imported_at}/></dd>
            {data.statistics.sha256&&<><dt>Empreinte du rapport</dt><dd><code>{data.statistics.sha256}</code></dd></>}
            {data.statistics.manual_override&&<><dt>Source du rapport</dt><dd>Amendement manuel</dd></>}
          </dl>{data.statistics.metrics.length>0&&<dl className="change-detail-summary">{data.statistics.metrics.map(metric=>
            <div key={metric.key}><dt>{metric.key.replaceAll('_',' ')}</dt>
              <dd>{metric.value===null?'N/A':[metric.value,metric.unit].filter(Boolean).join(' ')}</dd></div>
          )}</dl>}</>:<p>Aucun rapport en base pour cette source.</p>}
        </section>
        <section>
          <h2>Sessions liées</h2>
          {data.run_ids.length>0?<ul>{data.run_ids.map(runId=><li key={runId}>
            <Link to="/projects/$projectId/runs/$runId" params={{projectId:routeId,runId}}>{runId}</Link>
          </li>)}</ul>:<p>Aucune session liée.</p>}
        </section>
      </div>
    </section>}
  </article>
}
