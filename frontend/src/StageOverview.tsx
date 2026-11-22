type Passage={id:number;run_id:string|null;number:number|null;state:string|null;started_at:string|null;ended_at:string|null;duration_seconds:number|null;description:string|null;receipt:Record<string,unknown>|null}
export type StageMetric={key:string;label?:string;observed?:boolean;iteration_count:number|null;duration_seconds:number|null;iterations:Passage[];children?:StageMetric[]}
export type CycleMetric={id:number;number:number;started_at:string|null;ended_at:string|null;duration_seconds:number|null;complete:boolean}
export type StageMetrics={stages:StageMetric[];cycles?:CycleMetric[];duration_seconds:number|null;complete_cycle_duration_seconds?:number|null}
export const stageDuration=(value:number|null|undefined)=>value==null?'':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1,style:'unit',unit:'second'}).format(value)
const date=(value:string|null)=>value?new Date(value).toLocaleString('fr-FR'):''
const states:Record<string,string>={RUNNING:'En cours',COMPLETED:'Terminé',FAILED:'Échec',UNKNOWN:'Indéterminé',PENDING:'En attente',SKIPPED:'Non exécuté',NOT_REQUESTED:'Non demandé',CANCELLED:'Annulé'}
function Passages({items}:{items:Passage[]}){
  if(items.length===0)return null
  return <table className="stage-passages"><thead><tr><th>Itération</th><th>Début</th><th>Fin</th><th>Durée</th><th>État</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{item.number}</td><td>{date(item.started_at)}</td><td>{date(item.ended_at)}</td><td>{stageDuration(item.duration_seconds)}</td><td>{item.state?states[item.state]||item.state:''}{item.description&&<p>{item.description}</p>}{typeof item.receipt?.error==='string'&&<p role="status">{item.receipt.error}</p>}</td></tr>)}</tbody></table>
}
export function StageOverview({stage,title}:{stage:StageMetric|undefined;title:string}){
  return <section className="change-progress stage-overview" aria-label="Overview de l’étape"><h2>{title}</h2>{stage?.observed&&<>
    <dl className="run-metadata">{stage.iteration_count!=null&&<><dt>Itérations</dt><dd>{stage.iteration_count}</dd></>}{stage.duration_seconds!=null&&<><dt>Durée cumulée</dt><dd>{stageDuration(stage.duration_seconds)}</dd></>}</dl>
    <Passages items={stage.iterations}/>
    {stage.children?.map(child=><details key={child.key}><summary>{child.iterations.find(item=>item.description)?.description||'Sous-étape'}{child.duration_seconds!=null?' · '+stageDuration(child.duration_seconds):''}</summary><Passages items={child.iterations}/></details>)}
  </>}</section>
}
export function CompleteCycles({cycles}:{cycles:CycleMetric[]}){
  const complete=cycles.filter(cycle=>cycle.complete)
  if(complete.length===0)return null
  return <section className="change-progress"><h2>Itérations complètes du cycle</h2><table><thead><tr><th>Itération</th><th>Début</th><th>Fin</th><th>Durée totale</th></tr></thead><tbody>{complete.map(cycle=><tr key={cycle.id}><td>{cycle.number}</td><td>{date(cycle.started_at)}</td><td>{date(cycle.ended_at)}</td><td>{stageDuration(cycle.duration_seconds)}</td></tr>)}</tbody></table></section>
}
