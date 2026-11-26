import {type ReactNode} from 'react'
import {filterTableRows,TableFiller,TableNavigation,tablePage,useTableSearch} from './TableNavigation'
import {stageDuration} from './stageDuration'
import {cumulativeCycleTokens,formatTokens,tokenColumnCount,TokenColumns,TokenRoleHeaders,TokenSummary,type CycleTokens} from './cycleTokens'
export {stageDuration} from './stageDuration'
type Attribution={tokens?:CycleTokens;cab_seconds?:number|null;agent_seconds?:number|null;waiting_seconds?:number|null;wait_observed_seconds?:number|null;attribution_complete?:boolean;measured_until?:string}
type Passage=Attribution & {id:number|string;run_id:string|null;number:number|null;state:string|null;started_at:string|null;ended_at:string|null;duration_seconds:number|null;work_seconds?:number|null;wait_seconds?:number|null;description:string|null;receipt:Record<string,unknown>|null;parent_id?:number|null;source?:string|null}
export type StageMetric=Attribution & {key:string;label?:string;observed?:boolean;not_required?:boolean;work_seconds?:number|null;wait_seconds?:number|null;iteration_count:number|null;duration_seconds:number|null;iterations:Passage[];children?:StageMetric[]}
export type CycleMetric=Attribution & {display_duration_seconds?:number;id:number;number:number;started_at:string|null;ended_at:string|null;duration_seconds:number|null;complete:boolean}
export type CycleSummary={tokens?:CycleTokens;iteration_count?:number;measured_count?:number;duration_complete?:boolean;last_started_at?:string|null;last_ended_at?:string|null;last_duration_seconds?:number|null;duration_seconds?:number|null;cab_seconds?:number|null;agent_seconds?:number|null;waiting_seconds?:number|null;cab_seconds_complete?:boolean;agent_seconds_complete?:boolean;waiting_seconds_complete?:boolean}
export type StageMetrics={tokens?:CycleTokens;session_tokens?:CycleTokens;piloted?:boolean;stages:StageMetric[];cycles?:CycleMetric[];duration_seconds:number|null;complete_cycle_duration_seconds?:number|null;cycle_summary?:CycleSummary}
const date=(value:string|null)=>value?new Date(value).toLocaleString('fr-FR'):''
const states:Record<string,string>={RUNNING:'En cours',COMPLETED:'Terminé',FAILED:'Échec',UNKNOWN:'Indéterminé',PENDING:'En attente',SKIPPED:'Non exécuté',NOT_REQUESTED:'Non demandé',CANCELLED:'Annulé'}
function Waiting({time}:{time:Attribution}){
  return <>{stageDuration(time.waiting_seconds)}</>
}
function StageTable<Row>({title,items,columns,header,content,render,showAllRows,compact=false}:{
  title:string;items:Row[];columns:number;header:ReactNode
  content:(row:Row)=>unknown[];render:(row:Row)=>ReactNode;showAllRows:boolean;compact?:boolean
}){
  const navigation=useTableSearch()
  const matching=showAllRows?items:filterTableRows(items,navigation.query,content)
  const pagination=showAllRows?null:tablePage(matching,navigation.page)
  const rows=pagination?.rows??items
  return <>
    <div className="cycle-table-scroll"><table className={'stage-passages monitor-table'+(compact?' stage-passages-compact':'')} aria-label={title}>
      <thead>{header}</thead>
      <tbody>{rows.map(render)}
        <TableFiller count={rows.length} columns={columns}
          empty={pagination&&navigation.query.trim()?'Aucun résultat.':'Aucune entrée.'}/>
      </tbody>
    </table></div>
    {pagination&&<TableNavigation {...navigation} label={'Pagination · '+title} searchLabel={'Rechercher · '+title}
      current={pagination.current} pages={pagination.pages} total={matching.length}/>}
  </>
}
function tokenValues(tokens:CycleTokens|undefined){
  return Object.values(tokens??{}).flatMap(values=>Object.values(values).map(formatTokens))
}
function Passages({items,piloted,showAllRows}:{items:Passage[];piloted:boolean;showAllRows:boolean}){
  let cumulative:CycleTokens={}
  const rows:(Passage & {cumulative?:CycleTokens})[]=showAllRows?items.map(item=>{
    cumulative=cumulativeCycleTokens(cumulative,item.tokens,piloted)
    return {...item,cumulative}
  }):items
  const grouped=showAllRows&&piloted
  const rowSpan=grouped?2:undefined
  const tokenHeaders=<TokenColumns header piloted={piloted} includeCumulative={showAllRows}/>
  return <StageTable showAllRows={showAllRows} compact={showAllRows} title="Itérations de l’étape" items={rows}
    columns={7+tokenColumnCount(piloted)*(showAllRows?2:1)}
    header={<><tr>
      <th scope="col" rowSpan={rowSpan}>{showAllRows?'Cycle':'Itération'}</th>
      <th scope="col" rowSpan={rowSpan}>Début</th><th scope="col" rowSpan={rowSpan}>Fin</th>
      <th scope="col" rowSpan={rowSpan}>{showAllRows?'CAB':'Travail observé par CAB'}</th>
      <th scope="col" rowSpan={rowSpan}>{showAllRows?'Agents':'Agent(s)'}</th>
      <th scope="col" rowSpan={rowSpan}>{showAllRows?'Attentes':'Attente'}</th>
      {grouped?<TokenRoleHeaders/>:tokenHeaders}
      <th className="stage-cycle-state" scope="col" rowSpan={rowSpan}>État</th>
    </tr>{grouped&&<tr>{tokenHeaders}</tr>}</>}
    content={item=>[item.number,date(item.started_at),date(item.ended_at),stageDuration(item.cab_seconds),
      stageDuration(item.agent_seconds),stageDuration(item.waiting_seconds),item.description,item.receipt?.error,
      item.state&&states[item.state],...tokenValues(item.tokens)]}
    render={item=><tr key={item.id}>
      <td>{item.number}</td><td>{date(item.started_at)}</td><td>{date(item.ended_at)}</td>
      <td>{stageDuration(item.cab_seconds)}</td><td>{stageDuration(item.agent_seconds)}</td><td><Waiting time={item}/></td>
      <TokenColumns tokens={item.tokens} cumulative={item.cumulative} piloted={piloted}/>
      <td className="stage-cycle-state">{showAllRows&&item.state==='RUNNING'&&<span className="stage-cycle-spinner" aria-hidden="true"/>}
        {showAllRows&&item.state==='COMPLETED'&&<svg className="stage-cycle-completed" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m3 8 3.2 3.2L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>}
        {showAllRows&&item.state==='CANCELLED'&&<svg className="stage-cycle-warning" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5 15 14H1Z" fill="#f4c542" stroke="#795900" strokeLinejoin="round"/>
          <path d="M8 5.5v4m0 2v.15" fill="none" stroke="#352700" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>}
        {showAllRows&&item.state==='UNKNOWN'&&<svg className="stage-cycle-unknown" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7.5" fill="#1766b1"/>
          <path d="M5.8 5.7a2.25 2.25 0 0 1 4.35.7c0 1.5-2.15 1.55-2.15 3.15m0 2.05v.15" fill="none" stroke="#fff" strokeWidth="1.45" strokeLinecap="round"/>
        </svg>}
        {item.state?states[item.state]||item.state:''}
        {item.description&&<p>{item.description}</p>}
        {typeof item.receipt?.error==='string'&&<p role="status">{item.receipt.error}</p>}
      </td>
    </tr>}/>
}
function ActionTable({title,actions,passage,piloted,showAllRows}:{title:string;actions:Passage[];passage:Passage;piloted:boolean;showAllRows:boolean}){
  return <StageTable showAllRows={showAllRows} title={title} items={actions} columns={6+tokenColumnCount(piloted)}
    header={<tr><th>Action</th><th>Origine</th><th>Début</th><th>Retour ou validation</th><th>Durée</th><TokenColumns header piloted={piloted}/><th>État</th></tr>}
    content={action=>[action.description,action.source,date(action.started_at),date(action.ended_at),
      stageDuration(action.duration_seconds),action.state&&states[action.state],action.receipt?.note,action.receipt?.mandates,
      action.receipt?.request_id,action.receipt?.path,action.receipt?.error,...tokenValues(action.tokens)]}
    render={action=>{
      const mandates=Array.isArray(action.receipt?.mandates)
        ?action.receipt.mandates.filter((value):value is string=>typeof value==='string'):[]
      return <tr key={action.id}>
        <td>{action.description||'Action'}{typeof action.receipt?.note==='string'&&<p>{action.receipt.note}</p>}
          {mandates.length>0&&<ul>{mandates.map(mandate=><li key={mandate}>{mandate}</li>)}</ul>}
          {typeof action.receipt?.request_id==='string'&&<small>{action.receipt.request_id}</small>}
          {typeof action.receipt?.path==='string'&&<small>{action.receipt.path}</small>}
        </td>
        <td>{action.source==='cab'?'CAB':action.source==='agent'?'Agent':''}</td>
        <td>{date(action.started_at)||'Non attesté'}</td><td>{date(action.ended_at)||(passage.ended_at?'Non attestée':'')}</td>
        <td>{stageDuration(action.duration_seconds)||'Non observée'}</td>
        <TokenColumns tokens={action.tokens} piloted={piloted}/>
        <td>{action.state?states[action.state]||action.state:''}{typeof action.receipt?.error==='string'&&<p>{action.receipt.error}</p>}</td>
      </tr>
    }}/>
}
function StageActions({stage,expanded,piloted,showAllRows}:{stage:StageMetric;expanded:boolean;piloted:boolean;showAllRows:boolean}){
  const observed=(stage.children||[]).flatMap(child=>child.iterations)
    .filter(item=>(item.started_at||item.ended_at)&&!['SKIPPED','NOT_REQUESTED'].includes(item.state||''))
    .sort((a,b)=>(a.started_at||a.ended_at||'').localeCompare(b.started_at||b.ended_at||''))
  return <>{stage.iterations.map((passage,index)=>{
    const actions=observed.filter(action=>action.parent_id===passage.id)
    if(!actions.length)return null
    const suffix=stage.iterations.length>1&&passage.run_id?' · '+passage.run_id:''
    const title='Actions · Itération '+(passage.number??index+1)+suffix
    const table=<ActionTable title={title} actions={actions} passage={passage} piloted={piloted} showAllRows={showAllRows}/>
    return expanded?<section key={passage.id}><h3>{title}</h3>{table}</section>
      :<details key={passage.id} open={stage.iterations.length===1}><summary>{title}</summary>{table}</details>
  })}</>
}
export function StageOverview({stage,title,expanded=false,piloted=false,showAllRows=false}:{stage:StageMetric|undefined;title:string;expanded?:boolean;piloted?:boolean;showAllRows?:boolean}){
  return <section className="change-progress stage-overview" aria-label="Overview de l’étape"><h2>{title}</h2>{stage?.not_required&&<p>Revue non requise pour ce RUN.</p>}{stage?.observed&&<>
    <div className="run-metadata stage-metadata">
      <dl className="stage-duration-totals">
        {stage.iteration_count!=null&&<><dt>Itérations</dt><dd>{stage.iteration_count}</dd></>}
        {stage.cab_seconds!=null&&<><dt>Travail observé par CAB</dt><dd>{stageDuration(stage.cab_seconds)}</dd></>}
        {stage.agent_seconds!=null&&<><dt>Agent(s)</dt><dd>{stageDuration(stage.agent_seconds)}</dd></>}
        {stage.waiting_seconds!=null&&<><dt>Attente</dt><dd><Waiting time={stage}/></dd></>}
      </dl>
      <div className="stage-token-totals"><TokenSummary tokens={stage.tokens} piloted={piloted}/></div>
    </div>
    {stage.iterations.some(item=>item.ended_at&&!item.attribution_complete)&&<p>Une case vide indique une durée non mesurée.</p>}
    <Passages items={stage.iterations} piloted={piloted} showAllRows={showAllRows}/>
    <StageActions stage={stage} expanded={expanded} piloted={piloted} showAllRows={showAllRows}/>
  </>}</section>
}
export function CycleIterations({cycles,piloted=false,showAllRows=false}:{cycles:CycleMetric[];piloted?:boolean;showAllRows?:boolean}){
  return <section className="change-progress"><h2>Itérations du cycle</h2>
    <StageTable showAllRows={showAllRows} title="Itérations du cycle" items={cycles} columns={8+tokenColumnCount(piloted)}
      header={<tr><th>Itération</th><th>Début</th><th>Fin</th><th>CAB</th><th>Agent(s)</th><th>Attente</th><th>Durée totale</th><TokenColumns header piloted={piloted}/><th>État</th></tr>}
      content={cycle=>[cycle.number,date(cycle.started_at),date(cycle.ended_at),stageDuration(cycle.cab_seconds),
        stageDuration(cycle.agent_seconds),stageDuration(cycle.waiting_seconds),
        stageDuration(cycle.display_duration_seconds??cycle.duration_seconds),
        cycle.complete?'Complet':cycle.ended_at?'Interrompu':'En cours',...tokenValues(cycle.tokens)]}
      render={cycle=><tr key={cycle.id}><td>{cycle.number}</td><td>{date(cycle.started_at)}</td><td>{date(cycle.ended_at)}</td><td>{stageDuration(cycle.cab_seconds)}</td><td>{stageDuration(cycle.agent_seconds)}</td><td><Waiting time={cycle}/></td><td>{stageDuration(cycle.display_duration_seconds??cycle.duration_seconds)}</td><TokenColumns tokens={cycle.tokens} piloted={piloted}/><td>{cycle.complete?'Complet':cycle.ended_at?'Interrompu':'En cours'}</td></tr>}/>
  </section>
}
