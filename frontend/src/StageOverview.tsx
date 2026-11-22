import {stageDuration} from './stageDuration'
export {stageDuration} from './stageDuration'
type Attribution={cab_seconds?:number|null;agent_seconds?:number|null;waiting_seconds?:number|null;wait_observed_seconds?:number|null;attribution_complete?:boolean;measured_until?:string}
type Passage=Attribution & {id:number|string;run_id:string|null;number:number|null;state:string|null;started_at:string|null;ended_at:string|null;duration_seconds:number|null;work_seconds?:number|null;wait_seconds?:number|null;description:string|null;receipt:Record<string,unknown>|null;parent_id?:number|null;source?:string|null}
export type StageMetric=Attribution & {key:string;label?:string;observed?:boolean;not_required?:boolean;work_seconds?:number|null;wait_seconds?:number|null;iteration_count:number|null;duration_seconds:number|null;iterations:Passage[];children?:StageMetric[]}
export type CycleMetric=Attribution & {display_duration_seconds?:number;id:number;number:number;started_at:string|null;ended_at:string|null;duration_seconds:number|null;complete:boolean}
export type StageMetrics={stages:StageMetric[];cycles?:CycleMetric[];duration_seconds:number|null;complete_cycle_duration_seconds?:number|null}
const date=(value:string|null)=>value?new Date(value).toLocaleString('fr-FR'):''
const states:Record<string,string>={RUNNING:'En cours',COMPLETED:'Terminé',FAILED:'Échec',UNKNOWN:'Indéterminé',PENDING:'En attente',SKIPPED:'Non exécuté',NOT_REQUESTED:'Non demandé',CANCELLED:'Annulé'}
function Waiting({time}:{time:Attribution}){
  return <>{stageDuration(time.waiting_seconds)}</>
}
function Passages({items}:{items:Passage[]}){
  if(items.length===0)return null
  return <table className="stage-passages"><thead><tr><th>Itération</th><th>Début</th><th>Fin</th><th>Travail observé par CAB</th><th>Agent(s)</th><th>Attente</th><th>État</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{item.number}</td><td>{date(item.started_at)}</td><td>{date(item.ended_at)}</td><td>{stageDuration(item.cab_seconds)}</td><td>{stageDuration(item.agent_seconds)}</td><td><Waiting time={item}/></td><td>{item.state?states[item.state]||item.state:''}{item.description&&<p>{item.description}</p>}{typeof item.receipt?.error==='string'&&<p role="status">{item.receipt.error}</p>}</td></tr>)}</tbody></table>
}
function StageActions({stage,expanded}:{stage:StageMetric;expanded:boolean}){
  const observed=(stage.children||[]).flatMap(child=>child.iterations)
    .filter(item=>(item.started_at||item.ended_at)&&!['SKIPPED','NOT_REQUESTED'].includes(item.state||''))
    .sort((a,b)=>(a.started_at||a.ended_at||'').localeCompare(b.started_at||b.ended_at||''))
  return <>{stage.iterations.map((passage,index)=>{
    const actions=observed.filter(action=>action.parent_id===passage.id)
    if(!actions.length)return null
    const title=<>Actions · Itération {passage.number??index+1}{stage.iterations.length>1&&passage.run_id?' · '+passage.run_id:''}</>
    const table=
      <table className="stage-passages"><thead><tr><th>Action</th><th>Origine</th><th>Début</th><th>Retour ou validation</th><th>État</th></tr></thead>
        <tbody>{actions.map(action=>{
          const mandates=Array.isArray(action.receipt?.mandates)?action.receipt.mandates.filter((value):value is string=>typeof value==='string'):[]
          return <tr key={action.id}>
            <td>{action.description||'Action'}{typeof action.receipt?.note==='string'&&<p>{action.receipt.note}</p>}
              {mandates.length>0&&<ul>{mandates.map(mandate=><li key={mandate}>{mandate}</li>)}</ul>}
              {typeof action.receipt?.request_id==='string'&&<small>{action.receipt.request_id}</small>}
              {typeof action.receipt?.path==='string'&&<small>{action.receipt.path}</small>}
            </td>
            <td>{action.source==='cab'?'CAB':action.source==='agent'?'Agent':''}</td>
            <td>{date(action.started_at)||'Non attesté'}</td><td>{date(action.ended_at)||(passage.ended_at?'Non attestée':'')}</td>
            <td>{action.state?states[action.state]||action.state:''}{typeof action.receipt?.error==='string'&&<p>{action.receipt.error}</p>}</td>
          </tr>
        })}</tbody>
      </table>
    return expanded?<section key={passage.id}><h3>{title}</h3>{table}</section>
      :<details key={passage.id} open={stage.iterations.length===1}><summary>{title}</summary>{table}</details>
  })}</>
}
export function StageOverview({stage,title,expanded=false}:{stage:StageMetric|undefined;title:string;expanded?:boolean}){
  return <section className="change-progress stage-overview" aria-label="Overview de l’étape"><h2>{title}</h2>{stage?.not_required&&<p>Revue non requise pour ce RUN.</p>}{stage?.observed&&<>
    <dl className="run-metadata">{stage.iteration_count!=null&&<><dt>Itérations</dt><dd>{stage.iteration_count}</dd></>}{stage.cab_seconds!=null&&<><dt>Travail observé par CAB</dt><dd>{stageDuration(stage.cab_seconds)}</dd></>}{stage.agent_seconds!=null&&<><dt>Agent(s)</dt><dd>{stageDuration(stage.agent_seconds)}</dd></>}{stage.waiting_seconds!=null&&<><dt>Attente</dt><dd><Waiting time={stage}/></dd></>}</dl>
    {stage.iterations.some(item=>item.ended_at&&!item.attribution_complete)&&<p>Une case vide indique une durée non mesurée.</p>}
    <Passages items={stage.iterations}/>
    <StageActions stage={stage} expanded={expanded}/>
  </>}</section>
}
export function CompleteCycles({cycles}:{cycles:CycleMetric[]}){
  const complete=cycles.filter(cycle=>cycle.complete)
  if(complete.length===0)return null
  return <section className="change-progress"><h2>Itérations complètes du cycle</h2><table><thead><tr><th>Itération</th><th>Début</th><th>Fin</th><th>CAB</th><th>Agent(s)</th><th>Attente</th><th>Durée totale</th></tr></thead><tbody>{complete.map(cycle=><tr key={cycle.id}><td>{cycle.number}</td><td>{date(cycle.started_at)}</td><td>{date(cycle.ended_at)}</td><td>{stageDuration(cycle.cab_seconds)}</td><td>{stageDuration(cycle.agent_seconds)}</td><td><Waiting time={cycle}/></td><td>{stageDuration(cycle.display_duration_seconds??cycle.duration_seconds)}</td></tr>)}</tbody></table></section>
}
