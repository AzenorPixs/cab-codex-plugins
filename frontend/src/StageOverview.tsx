import {useLayoutEffect,useRef,useState,type ReactNode,type RefObject} from 'react'
import {filterTableRows,TableFiller,TableNavigation,tablePage,useTableSearch} from './TableNavigation'
import {stageDuration} from './stageDuration'
import {FixedStageValue,formatCostValue,formatTokens,tokenColumnCount,tokenFields,TokenColumns,TokenCostSummary,TokenRoleHeaders,TokenSummary,type CycleTokenCosts,type CycleTokens,type TokenCounts} from './cycleTokens'
export {stageDuration} from './stageDuration'
type Attribution={tokens?:CycleTokens;cab_seconds?:number|null;agent_seconds?:number|null;waiting_seconds?:number|null;wait_observed_seconds?:number|null;attribution_complete?:boolean;measured_until?:string}
type StageAgent={id:number;role:'coder'|'orchestrator';model:string;reasoning:string;provider:string|null;started_at?:string;ended_at?:string|null;rates?:TokenCounts}
type AgentPeriod={number:number|null;started_at:string|null;ended_at:string|null;agents?:StageAgent[]}
type CycleCosts={token_costs?:CycleTokenCosts;total_cost?:string|null}
type PassageTelemetry={native:string;allocated_seconds:number;model:string;tokens:string;absent_counters:string[]}
type TokenTracking={state:'pending'|'observed'|'indeterminate';reason?:string}
type Passage=Attribution & {telemetry?:Partial<Record<'coder'|'orchestrator',PassageTelemetry>>;
  token_tracking?:Partial<Record<'coder'|'orchestrator',TokenTracking>>;
  action_accounting?:{actions:Record<string,number>;unrecorded_seconds:number;display_seconds:number}|null;
  raw_action_duration_seconds?:number|null;id:number|string;run_id:string|null;number:number|null;state:string|null;started_at:string|null;ended_at:string|null;duration_seconds:number|null;work_seconds?:number|null;wait_seconds?:number|null;description:string|null;receipt:Record<string,unknown>|null;parent_id?:number|null;source?:string|null;token_costs?:CycleTokenCosts;agents?:StageAgent[]}
export type StageMetric=Attribution & {key:string;label?:string;observed?:boolean;not_required?:boolean;work_seconds?:number|null;wait_seconds?:number|null;iteration_count:number|null;duration_seconds:number|null;iterations:Passage[];children?:StageMetric[]}
export type CycleMetric=Attribution & AgentPeriod & CycleCosts & {display_duration_seconds?:number;id:number;number:number;duration_seconds:number|null;complete:boolean}
export type CycleSummary={tokens?:CycleTokens;iteration_count?:number;measured_count?:number;duration_complete?:boolean;last_started_at?:string|null;last_ended_at?:string|null;last_duration_seconds?:number|null;duration_seconds?:number|null;cab_seconds?:number|null;agent_seconds?:number|null;waiting_seconds?:number|null;cab_seconds_complete?:boolean;agent_seconds_complete?:boolean;waiting_seconds_complete?:boolean}
export type StageMetrics={tokens?:CycleTokens;session_tokens?:CycleTokens;piloted?:boolean;stages:StageMetric[];cycles?:CycleMetric[];duration_seconds:number|null;complete_cycle_duration_seconds?:number|null;cycle_summary?:CycleSummary;cycle_cost_summary?:CycleCosts}
const date=(value:string|null)=>value?new Date(value).toLocaleString('fr-FR'):''
const states:Record<string,string>={RUNNING:'En cours',COMPLETED:'Terminé',FAILED:'Échec',UNKNOWN:'Indéterminé',PENDING:'En attente',SKIPPED:'Non exécuté',NOT_REQUESTED:'Non demandé',CANCELLED:'Annulé'}
const cycleSample='Cycle\u00a0\u00a0'
const dateSample='00/00/0000 00:00:00\u00a0\u00a0\u00a0'
const durationSample='9999,9\u202fs\u00a0\u00a0\u00a0\u00a0'

export function StageTokenTracking({passage,piloted=false,showCounters=false}:{passage?:Passage;piloted?:boolean;showCounters?:boolean}){
  if(!passage?.token_tracking||!Object.keys(passage.token_tracking).length)return null
  const labels={pending:'En attente de mesure',observed:'Compteurs mesurés',indeterminate:'Attribution indéterminée'}
  return <span className="cycle-token-group" aria-label="Suivi des tokens">{(['coder','orchestrator'] as const).map(role=>{
    const entry=passage.token_tracking?.[role]
    if(!entry)return null
    const counts=passage.tokens?.[role]
    return <span key={role}>{piloted&&(role==='coder'?'Codeur · ':'Orchestrateur · ')}
      {labels[entry.state]}{entry.reason&&' · '+entry.reason}
      {showCounters&&counts&&tokenFields.map(([field,abbr,label])=>
        <span key={field} title={label}> · {abbr} {formatTokens(counts[field])}</span>)}</span>
  })}</span>
}

function StageStateIcon({state,label}:{state:string;label?:string}){
  let icon:ReactNode
  switch(state){
    case 'RUNNING':
      icon=<span className="stage-cycle-spinner" aria-hidden="true"/>
      break
    case 'COMPLETED':
      icon=<svg className="stage-cycle-completed" viewBox="0 0 16 16" aria-hidden="true">
        <path d="m3 8 3.2 3.2L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      break
    case 'CANCELLED':
      icon=<svg className="stage-cycle-warning" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 1.5 15 14H1Z" fill="#f4c542" stroke="#795900" strokeLinejoin="round"/>
        <path d="M8 5.5v4m0 2v.15" fill="none" stroke="#352700" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      break
    case 'UNKNOWN':
      icon=<svg className="stage-cycle-unknown" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7.5" fill="#1766b1"/>
        <path d="M5.8 5.7a2.25 2.25 0 0 1 4.35.7c0 1.5-2.15 1.55-2.15 3.15m0 2.05v.15" fill="none" stroke="#fff" strokeWidth="1.45" strokeLinecap="round"/>
      </svg>
      break
    case 'FAILED':
      icon=<svg className="stage-cycle-failed" viewBox="0 0 16 16" aria-hidden="true">
        <path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      break
    case 'PENDING':
      icon=<svg className="stage-cycle-pending" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="8" cy="8" r="6.3"/><path d="M8 4.5V8l2.4 1.5"/>
      </svg>
      break
    default:
      icon=<svg className="stage-cycle-skipped" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="8" cy="8" r="6.3"/><path d="M5 8h6"/>
      </svg>
  }
  return <span className="stage-cycle-icon" role={label?'img':undefined} aria-label={label} title={label} aria-hidden={!label||undefined}>{icon}</span>
}

function Waiting({time,shortUnits=false}:{time:Attribution;shortUnits?:boolean}){
  return <>{stageDuration(time.waiting_seconds,shortUnits)}</>
}
function StageTable<Row>({title,items,columns,header,content,render,showAllRows,compact=false,stepTypography=false,tableRef,afterTable}:{
  title:string;items:Row[];columns:number;header:ReactNode
  content:(row:Row)=>unknown[];render:(row:Row)=>ReactNode;showAllRows:boolean;compact?:boolean;stepTypography?:boolean
  tableRef?:RefObject<HTMLTableElement|null>;afterTable?:ReactNode
}){
  const navigation=useTableSearch()
  const matching=showAllRows?items:filterTableRows(items,navigation.query,content)
  const pagination=showAllRows?null:tablePage(matching,navigation.page)
  const rows=pagination?.rows??items
  return <>
    <div className="cycle-table-scroll"><table ref={tableRef} className={'stage-passages monitor-table'+(compact?' stage-passages-compact':'')+(compact||stepTypography?' stage-table-step':'')} aria-label={title}>
      <thead>{header}</thead>
      <tbody>{rows.map(render)}
        <TableFiller count={rows.length} columns={columns}
          empty={pagination&&navigation.query.trim()?'Aucun résultat.':'Aucune entrée.'}/>
      </tbody>
    </table>{afterTable}</div>
    {pagination&&<TableNavigation {...navigation} label={'Pagination · '+title} searchLabel={'Rechercher · '+title}
      current={pagination.current} pages={pagination.pages} total={matching.length}/>}
  </>
}
function tokenValues(tokens:CycleTokens|undefined){
  return Object.values(tokens??{}).flatMap(values=>Object.values(values).map(formatTokens))
}

function StageAgentTable({cycleRef,items,piloted,summaryTitle}:{
  cycleRef:RefObject<HTMLTableElement|null>;items:AgentPeriod[];piloted:boolean;summaryTitle?:string
}){
  const summary=Boolean(summaryTitle)
  const leadingColumns=summary?7:6
  const typeSample=useRef<HTMLSpanElement>(null)
  const reasoningSample=useRef<HTMLSpanElement>(null)
  const [geometry,setGeometry]=useState<number[]>([])
  useLayoutEffect(()=>{
    const cycle=cycleRef.current
    const first=cycle?.tHead?.rows[0]
    const second=cycle?.tHead?.rows[1]
    const type=typeSample.current
    const reasoning=reasoningSample.current
    if(!cycle||!first||!type||!reasoning)return
    const cells=second?[...Array.from(first.cells).slice(0,leadingColumns),...Array.from(second.cells),first.cells[first.cells.length-1]]:Array.from(first.cells)
    const measure=()=>{
      const width=cycle.getBoundingClientRect().width
      if(!width)return
      const widths=cells.map(cell=>cell.getBoundingClientRect().width)
      const costStart=widths.length-5
      const preceding=widths.slice(3,costStart).reduce((sum,value)=>sum+value,0)
      const cellStyle=getComputedStyle(cells[0])
      const padding=parseFloat(cellStyle.paddingInlineStart)+parseFloat(cellStyle.paddingInlineEnd)
      const stateWidth=widths[widths.length-1]
      const typeWidth=Math.min(summary?preceding/4:preceding,type.getBoundingClientRect().width+padding)
      const available=preceding-typeWidth
      const reasoningWidth=Math.min(summary?available/3:stateWidth/2,reasoning.getBoundingClientRect().width+padding)
      const costWidths=widths.slice(costStart,costStart+4)
      const providerWidth=summary?Math.min(available/3,typeWidth):available
      const layout=summary
        ?[width-stateWidth,...widths.slice(0,3),typeWidth,providerWidth,reasoningWidth,available-providerWidth-reasoningWidth,...costWidths]
        :[width,...widths.slice(0,3),typeWidth,providerWidth,...costWidths,reasoningWidth]
      setGeometry(previous=>previous.length===layout.length&&previous.every((value,index)=>value===layout[index])?previous:layout)
    }
    measure()
    const observer=new ResizeObserver(measure)
    for(const element of [cycle,...cells,type,reasoning])observer.observe(element)
    return ()=>observer.disconnect()
  },[cycleRef,piloted,leadingColumns,summary])

  const modelHeaders=<><th scope="col" title="Raisonnement">Raisonnement</th><th scope="col">LLM</th></>
  const rows=items.flatMap(passage=>(passage.agents??[]).filter(agent=>piloted||agent.role==='coder').map(agent=>({passage,agent})))
  return <>
    {summaryTitle&&<h2>{summaryTitle}</h2>}
    <span ref={typeSample} className="stage-agents-sample" aria-hidden="true">{'Orchestrateur\u00a0\u00a0'}</span>
    <span ref={reasoningSample} className="stage-agents-sample" aria-hidden="true">{'Raisonnement\u00a0\u00a0'}</span>
    <table className="stage-passages monitor-table stage-passages-compact stage-table-step stage-agents-table" aria-label={summaryTitle??'Agents'}
      style={{width:geometry[0],visibility:geometry.length?undefined:'hidden'}}>
      <colgroup>{geometry.slice(1).map((width,index)=><col key={index} style={{width}}/>)}{!summary&&<col/>}</colgroup>
      <thead><tr>
        <th scope="col">{summary?'Itérations':'Cycle'}</th><th scope="col">Début</th><th scope="col">Fin</th>
        <th scope="col">Type</th><th scope="col">Fournisseurs</th>
        {summary&&modelHeaders}
        {tokenFields.map(([field,abbreviation,label])=><th key={field} scope="col" title={'Tarif en dollars par million de tokens · '+label}>C{abbreviation}</th>)}
        {!summary&&modelHeaders}
      </tr></thead>
      <tbody>{rows.length?rows.map(({passage,agent})=>{
        const modelCells=<><td title={agent.reasoning||undefined}>{agent.reasoning||'—'}</td><td title={agent.model}>{agent.model}</td></>
        return <tr key={agent.id}>
          <td>{passage.number}</td><td title={agent.started_at}>{date(agent.started_at??passage.started_at)}</td>
          <td title={agent.ended_at??undefined}>{date(agent.ended_at===undefined?passage.ended_at:agent.ended_at)}</td>
          <td>{piloted&&agent.role==='orchestrator'?'Orchestrateur':'Codage'}</td>
          <td title={agent.provider||undefined}>{agent.provider||'—'}</td>
          {summary&&modelCells}
          {tokenFields.map(([field])=>{
            const text=formatCostValue(agent.rates?.[field])
            return <td key={field} title={text||undefined}>{text}</td>
          })}
          {!summary&&modelCells}
        </tr>}):<tr><td colSpan={11}>Aucun agent observé.</td></tr>}</tbody>
    </table>
  </>
}

function Passages({items,piloted,showAllRows}:{items:Passage[];piloted:boolean;showAllRows:boolean}){
  const cycleRef=useRef<HTMLTableElement>(null)
  const grouped=showAllRows&&piloted
  const rowSpan=grouped?2:undefined
  const value=(text:string,sample:string)=>showAllRows?<FixedStageValue value={text} sample={sample} title={text||undefined}/>:text
  const tokenHeaders=<TokenColumns header piloted={piloted} includeCosts={showAllRows}/>
  return <StageTable showAllRows={showAllRows} compact={showAllRows} title="Itérations de l’étape" items={items}
    tableRef={cycleRef} afterTable={showAllRows?<StageAgentTable cycleRef={cycleRef} items={items} piloted={piloted}/>:undefined}
    columns={7+tokenColumnCount(piloted)*(showAllRows?2:1)}
    header={<><tr>
      <th scope="col" rowSpan={rowSpan}>{value(showAllRows?'Cycle':'Itération',cycleSample)}</th>
      <th scope="col" rowSpan={rowSpan}>{value('Début',dateSample)}</th><th scope="col" rowSpan={rowSpan}>{value('Fin',dateSample)}</th>
      <th scope="col" rowSpan={rowSpan}>{value(showAllRows?'CAB':'Travail observé par CAB',durationSample)}</th>
      <th scope="col" rowSpan={rowSpan}>{value(showAllRows?'Agents':'Agent(s)',durationSample)}</th>
      <th scope="col" rowSpan={rowSpan}>{value(showAllRows?'Attentes':'Attente',durationSample)}</th>
      {grouped?<TokenRoleHeaders/>:tokenHeaders}
      <th className="stage-cycle-state" scope="col" rowSpan={rowSpan}>État</th>
    </tr>{grouped&&<tr>{tokenHeaders}</tr>}</>}
    content={item=>[item.number,date(item.started_at),date(item.ended_at),stageDuration(item.cab_seconds),
      stageDuration(item.agent_seconds),stageDuration(item.waiting_seconds),item.description,item.receipt?.error,
      item.state&&states[item.state],...tokenValues(item.tokens)]}
    render={item=><tr key={item.id}>
      <td>{value(item.number?.toString()??'',cycleSample)}</td>
      <td>{value(date(item.started_at),dateSample)}</td><td>{value(date(item.ended_at),dateSample)}</td>
      <td>{value(stageDuration(item.cab_seconds,showAllRows),durationSample)}</td><td>{value(stageDuration(item.agent_seconds,showAllRows),durationSample)}</td>
      <td>{value(stageDuration(item.waiting_seconds,showAllRows),durationSample)}</td>
      <TokenColumns tokens={item.tokens} costs={item.token_costs} piloted={piloted} includeCosts={showAllRows}/>
      <td className="stage-cycle-state">{showAllRows&&item.state&&<StageStateIcon state={item.state}/>}
        {item.state?states[item.state]||item.state:''}
        {item.description&&<p>{item.description}</p>}
        {typeof item.receipt?.error==='string'&&<p role="status">{item.receipt.error}</p>}
      </td>
    </tr>}/>
}
function ActionTable({title,actions,passage,piloted,showAllRows}:{title:string;actions:Passage[];passage:Passage;piloted:boolean;showAllRows:boolean}){
  return <StageTable showAllRows={showAllRows} stepTypography={showAllRows} title={title} items={actions} columns={6+tokenColumnCount(piloted)}
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
        <td title={action.raw_action_duration_seconds==null?undefined:'Durée brute '+stageDuration(action.raw_action_duration_seconds,true)}>{stageDuration(action.duration_seconds,showAllRows)||'Non observée'}</td>
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
    const accounting=showAllRows?passage.action_accounting:undefined
    const actions=observed.filter(action=>action.parent_id===passage.id).map(action=>{
      const counted=accounting?.actions[String(action.id)]
      return counted===undefined?action:{...action,duration_seconds:counted,raw_action_duration_seconds:action.duration_seconds}
    })
    if(accounting&&accounting.unrecorded_seconds>0){
      actions.push({id:'outside-'+passage.id,run_id:passage.run_id,number:null,state:null,started_at:null,ended_at:null,
        duration_seconds:accounting.unrecorded_seconds,description:'Hors actions enregistrées',receipt:null})
    }
    if(!actions.length)return null
    const suffix=stage.iterations.length>1&&passage.run_id?' · '+passage.run_id:''
    const title='Actions · Itération '+(passage.number??index+1)+suffix
    const table=<ActionTable title={title} actions={actions} passage={passage} piloted={piloted} showAllRows={showAllRows}/>
    return expanded?<section key={passage.id}><h3>{title}</h3>{table}</section>
      :<details key={passage.id} open={stage.iterations.length===1}><summary>{title}</summary>{table}</details>
  })}</>
}
export function StageOverview({stage,title,expanded=false,piloted=false,showAllRows=false}:{stage:StageMetric|undefined;title:string;expanded?:boolean;piloted?:boolean;showAllRows?:boolean}){
  const lastPassage=showAllRows?stage?.iterations.at(-1):undefined
  const accounted=showAllRows?stage?.iterations.flatMap(item=>item.action_accounting?[item.action_accounting.display_seconds]:[])??[]:[]
  return <section className="change-progress stage-overview" aria-label="Overview de l’étape">
    {lastPassage?<div className="run-cycle-heading stage-cycle-heading">
      <h2>{title}{lastPassage.state&&<StageStateIcon state={lastPassage.state} label={states[lastPassage.state]||lastPassage.state}/>}</h2>
      <p className="cycle-token-summary"><strong>Dernier Cycle de cette étape</strong>
        <span>Durée : {stageDuration(lastPassage.action_accounting?.display_seconds??lastPassage.duration_seconds,true)||'—'}</span>
        <TokenSummary tokens={lastPassage.tokens} piloted={piloted}/>
      </p>
    </div>:<h2>{title}</h2>}{stage?.not_required&&<p>Revue non requise pour ce RUN.</p>}{stage?.observed&&<>
    <div className={'run-metadata stage-metadata'+(showAllRows?' stage-metadata-with-costs':'')} data-piloted={piloted||undefined}>
      <dl className="stage-duration-totals">
        {stage.iteration_count!=null&&<><dt>Itérations</dt><dd>{stage.iteration_count}</dd></>}
        {accounted.length>0&&<><dt>{stage.iterations.some(item=>!item.ended_at)?'Durée des passages terminés':'Durée totale de l’étape'}</dt>
          <dd>{stageDuration(accounted.reduce((sum,value)=>sum+value,0),true)}</dd></>}
        {stage.cab_seconds!=null&&<><dt>Travail observé par CAB</dt><dd>{stageDuration(stage.cab_seconds,showAllRows)}</dd></>}
        {stage.agent_seconds!=null&&<><dt>Agent(s)</dt><dd>{stageDuration(stage.agent_seconds,showAllRows)}</dd></>}
        {stage.waiting_seconds!=null&&<><dt>Attente</dt><dd><Waiting time={stage} shortUnits={showAllRows}/></dd></>}
      </dl>
      <div className="stage-token-totals"><TokenSummary tokens={stage.tokens} piloted={piloted}/></div>
      {showAllRows&&<div className="stage-cost-totals"><TokenCostSummary costs={lastPassage?.token_costs} piloted={piloted}/></div>}
    </div>
    {stage.iterations.some(item=>item.ended_at&&!item.attribution_complete)&&<p>Une case vide indique une durée non mesurée.</p>}
    {showAllRows&&stage.iterations.map(item=>Object.keys(item.token_tracking??{}).length>0&&
      <p key={item.id}>Cycle {item.number??'—'} <StageTokenTracking passage={item} piloted={piloted}/></p>)}
    {showAllRows&&stage.iterations.filter(item=>!Object.keys(item.token_tracking??{}).length).flatMap(item=>Object.entries(item.telemetry??{}).map(([role,entry])=>{
      if(!entry||entry.model==='observed'&&entry.tokens==='observed')return null
      const actor=role==='coder'?'Codeur':'Orchestrateur'
      const model=entry.model==='observed'?'modèle observé':'modèle non remonté'
      const tokens=entry.tokens==='observed'?'tokens observés':entry.tokens==='zero'?'compteurs à zéro':'compteurs absents'
      const source=entry.native==='unavailable'?' · journal natif indisponible':''
      return <p key={String(item.id)+'-'+role}>Cycle {item.number??'—'} · {actor} · {model} · {tokens}{source}</p>
    }))}
    <Passages items={stage.iterations} piloted={piloted} showAllRows={showAllRows}/>
    <StageActions stage={stage} expanded={expanded} piloted={piloted} showAllRows={showAllRows}/>
  </>}</section>
}
export function CycleIterations({cycles,piloted=false,showAllRows=false,withCostsAndAgents=false}:{
  cycles:CycleMetric[];piloted?:boolean;showAllRows?:boolean;withCostsAndAgents?:boolean
}){
  const cycleRef=useRef<HTMLTableElement>(null)
  const grouped=withCostsAndAgents&&piloted
  const rowSpan=grouped?2:undefined
  const tokenHeaders=<TokenColumns header piloted={piloted} includeCosts={withCostsAndAgents}/>
  const title=withCostsAndAgents?'Itération du cycle des 12 étapes':'Itérations du cycle'
  return <section className="change-progress"><h2>{title}</h2>
    <StageTable showAllRows={showAllRows} compact={withCostsAndAgents} title={title} items={cycles}
      tableRef={cycleRef} afterTable={withCostsAndAgents?<StageAgentTable cycleRef={cycleRef} items={cycles} piloted={piloted}
        summaryTitle="LLM par itération du cycle des 12 étapes"/>:undefined}
      columns={8+tokenColumnCount(piloted)*(withCostsAndAgents?2:1)}
      header={<><tr>{[withCostsAndAgents?'Itérations':'Itération','Début','Fin','CAB','Agent(s)','Attente','Durée totale'].map(label=>
        <th key={label} scope="col" rowSpan={rowSpan}>{label}</th>)}
        {grouped?<TokenRoleHeaders/>:tokenHeaders}<th scope="col" rowSpan={rowSpan}>État</th>
      </tr>{grouped&&<tr>{tokenHeaders}</tr>}</>}
      content={cycle=>[cycle.number,date(cycle.started_at),date(cycle.ended_at),stageDuration(cycle.cab_seconds),
        stageDuration(cycle.agent_seconds),stageDuration(cycle.waiting_seconds),
        stageDuration(cycle.display_duration_seconds??cycle.duration_seconds),
        cycle.complete?'Complet':cycle.ended_at?'Interrompu':'En cours',...tokenValues(cycle.tokens)]}
      render={cycle=>{
        const state=cycle.complete?'COMPLETED':cycle.ended_at?'CANCELLED':'RUNNING'
        const label=cycle.complete?'Complet':cycle.ended_at?'Interrompu':'En cours'
        return <tr key={cycle.id}>
          <td>{cycle.number}</td><td>{date(cycle.started_at)}</td><td>{date(cycle.ended_at)}</td>
          <td>{stageDuration(cycle.cab_seconds)}</td><td>{stageDuration(cycle.agent_seconds)}</td><td><Waiting time={cycle}/></td>
          <td>{stageDuration(cycle.display_duration_seconds??cycle.duration_seconds)}</td>
          <TokenColumns tokens={cycle.tokens} costs={cycle.token_costs} piloted={piloted} includeCosts={withCostsAndAgents}/>
          <td>{withCostsAndAgents?<StageStateIcon state={state} label={label}/>:label}</td>
        </tr>
      }}/>
  </section>
}
