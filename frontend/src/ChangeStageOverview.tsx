import {useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {api} from './api'

type Iteration={id:number;run_id:string|null;started_at:string;ended_at:string|null;duration_seconds:number|null;description:string|null}
type Stage={key:string;iteration_count:number;duration_seconds:number|null;iterations:Iteration[]}
type Metrics={identifier:string;duration_seconds:number|null;stages:Stage[]}
type ChangePage={changes:{id:string;identifier:string}[];has_more:boolean}
const labels:Record<string,string>={
  initialization:'Initialisation',preflight:'Prévol',analysis:'Analyse',framing:'Cadrage',
  specification:'Spécification','version-skill':'Lecture du skill Version',implementation:'Implémentation',
  verification:'Vérifications',review:'Revue',archival:'Archivage',statistics:'Statistiques',closure:'Clôture',
}
const formatDuration=(seconds:number|null)=>seconds===null?'Non mesurée':
  new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1,style:'unit',unit:'second'}).format(seconds)

export function ChangeStageOverview({projectId}:{projectId:string}){
  const [offset,setOffset]=useState(0)
  const [selected,setSelected]=useState('')
  const path=`projects/${projectId}/change-stage-metrics`
  const list=useQuery({queryKey:[path,offset],queryFn:()=>api<ChangePage>(path+'?offset='+offset)})
  const detail=useQuery({queryKey:[path,selected],queryFn:()=>api<Metrics>(path+'?'+new URLSearchParams({change_id:selected})),enabled:Boolean(selected),refetchInterval:5000})
  const page=(delta:number)=>{setSelected('');setOffset(previous=>previous+delta)}
  return <section className="change-progress">
    <h2>Durée des changes</h2>
    {list.isPending&&<p role="status">Chargement des changes…</p>}
    {list.error&&<p role="alert">Les changes ne sont pas disponibles.</p>}
    {list.data&&<>
      {list.data.changes.length===0?<p>Aucun change répertorié.</p>:<label>Change
        <select value={selected} onChange={event=>setSelected(event.target.value)}>
          <option value="">Sélectionner un change</option>
          {list.data.changes.map(change=><option key={change.id} value={change.id}>{change.identifier}</option>)}
        </select>
      </label>}
      {offset>0&&<button type="button" onClick={()=>page(-50)}>Précédents</button>}
      {list.data.has_more&&<button type="button" onClick={()=>page(50)}>Suivants</button>}
    </>}
    {selected&&detail.isPending&&<p role="status">Chargement des durées…</p>}
    {selected&&detail.error&&<p role="alert">Les durées ne sont pas disponibles.</p>}
    {selected&&detail.data&&<>
      <p>Durée cumulée : {formatDuration(detail.data.duration_seconds)}</p>
      {detail.data.stages.filter(stage=>stage.iteration_count>0).map(stage=><details key={stage.key}>
        <summary>{labels[stage.key]||stage.key} · {stage.iteration_count} · {formatDuration(stage.duration_seconds)}</summary>
        <ol>{stage.iterations.map(iteration=><li key={iteration.id}>
          {new Date(iteration.started_at).toLocaleString()} → {iteration.ended_at?new Date(iteration.ended_at).toLocaleString():'En cours'}
          {' · '}{formatDuration(iteration.duration_seconds)}{iteration.run_id?' · '+iteration.run_id:''}
          {iteration.description&&<p>{iteration.description}</p>}
        </li>)}</ol>
      </details>)}
    </>}
  </section>
}
