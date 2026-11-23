import {TokenSummary} from './cycleTokens'
import {useEffect,useState} from 'react'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'
import {CycleIterations,StageOverview,stageDuration,type StageMetrics} from './StageOverview'

type ChangePage={changes:{id:string;identifier:string}[];has_more:boolean}

export function ChangeStageOverview({projectId}:{projectId:string}){
  const [offset,setOffset]=useState(0)
  const [selected,setSelected]=useState('')
  const client=useQueryClient()
  const path=`projects/${projectId}/change-stage-metrics`
  const list=useQuery({queryKey:[path,offset],queryFn:()=>api<ChangePage>(path+'?offset='+offset)})
  const detail=useQuery({queryKey:[path,selected],queryFn:()=>api<StageMetrics>(path+'?'+new URLSearchParams({change_id:selected})),enabled:Boolean(selected)})
  useEffect(()=>{
    if(!selected)return
    const controller=new AbortController()
    const stream=new ShapeStream({url:new URL('/api/v1/sync/run-data/stages',location.origin).href,params:{project_id:projectId,change_id:selected},signal:controller.signal,onError:()=>undefined})
    const unsubscribe=new Shape(stream).subscribe(()=>{
      if(!controller.signal.aborted)void client.invalidateQueries({queryKey:[path,selected]})
    })
    return ()=>{controller.abort();unsubscribe()}
  },[client,path,projectId,selected])
  const page=(delta:number)=>{setSelected('');setOffset(previous=>previous+delta)}
  return <section className="change-progress">
    <h2>Durées et tokens des changes</h2>
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
      {detail.data.complete_cycle_duration_seconds!=null&&<p>Durée totale des cycles complets · {stageDuration(detail.data.complete_cycle_duration_seconds)}</p>}
      <p className="cycle-token-summary"><strong>Total du change</strong><TokenSummary tokens={detail.data.tokens} piloted={detail.data.piloted}/></p>
      <CycleIterations cycles={detail.data.cycles||[]} piloted={detail.data.piloted}/>
      {detail.data.stages.filter(stage=>stage.observed||stage.not_required).map(stage=><details key={stage.key}>
        <summary>{stage.label||stage.key}{stage.work_seconds!=null?' · '+stageDuration(stage.work_seconds)+' de travail':''}{stage.wait_seconds!=null?' · '+stageDuration(stage.wait_seconds)+' d’attente':''}</summary>
        <StageOverview stage={stage} title={stage.label||stage.key} piloted={detail.data.piloted}/>
      </details>)}
    </>}
  </section>
}
