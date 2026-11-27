const fields=[
  ['input_tokens','Te','Token/Entrant'],
  ['output_tokens','Ts','Token/Sortant'],
  ['cache_read_tokens','Tr','Tokens lus dans le cache'],
  ['cache_write_tokens','Tw','Tokens écrits dans le cache'],
] as const
type TokenField=typeof fields[number][0]
type TokenRole='coder'|'orchestrator'
type TokenCounts=Partial<Record<TokenField,string|null>>
export type CycleTokens=Partial<Record<TokenRole,TokenCounts>>
export type CycleTokenCosts=Partial<Record<TokenRole,Partial<Record<TokenField,string|null>>>>

const formatter=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2})
const magnitudes=[[1_000_000_000n,'B'],[1_000_000n,'M'],[1_000n,'K']] as const

export function formatTokens(value:string|null|undefined){
  if(!value||!/^\d+$/.test(value))return '—'
  const tokens=BigInt(value)
  const magnitude=magnitudes.find(([size])=>tokens>=size)
  if(!magnitude)return formatter.format(tokens)
  const [size,suffix]=magnitude
  const hundredths=(tokens*100n+size/2n)/size
  const fraction=String(hundredths%100n).padStart(2,'0').replace(/0+$/,'')
  return formatter.format(hundredths/100n)+(fraction?','+fraction:'')+'\u202f'+suffix
}

const roles=(piloted:boolean):TokenRole[]=>piloted?['coder','orchestrator']:['coder']
export const tokenColumnCount=(piloted:boolean)=>roles(piloted).length*fields.length
const roleLabel:Record<TokenRole,string>={coder:'Codeur',orchestrator:'Orchestrateur'}

export function TokenRoleHeaders(){
  return <>{roles(true).map(role=><th key={role} colSpan={fields.length*2}>{roleLabel[role]}</th>)}</>
}

export function FixedStageValue({value,sample,title}:{value:string;sample:string;title?:string}){
  return <span className="stage-cycle-slot" data-size-example={sample} title={title}><span>{value}</span></span>
}

function tokenSlot(value:string,fixed:boolean,title?:string){
  return fixed?<FixedStageValue value={value} sample={'999\u202fM\u00a0\u00a0'} title={title}/>:value
}

function tokenCost(costs:CycleTokenCosts|undefined,role:TokenRole,field:TokenField){
  return costs?.[role]?.[field]??''
}

export function TokenColumns({tokens,costs,piloted=false,header=false,includeCosts=false}:{
  tokens?:CycleTokens;costs?:CycleTokenCosts;piloted?:boolean;header?:boolean;includeCosts?:boolean
}){
  return <>{roles(piloted).flatMap(role=>fields.flatMap(([field,abbreviation,label])=>{
    const key=role+field
    const value=formatTokens(tokens?.[role]?.[field])
    const current=header
      ? <th key={key} scope="col" title={label}>{tokenSlot(abbreviation,includeCosts)}{piloted&&!includeCosts&&<small>{roleLabel[role]}</small>}</th>
      : <td key={key} className="cycle-token-value">{tokenSlot(value,includeCosts,value)}</td>
    if(!includeCosts)return current
    const cost=tokenCost(costs,role,field)
    const costCell=header
      ? <th key={key+'-cost'} scope="col" title={'Coût · '+label}>{tokenSlot('C'+abbreviation,true)}</th>
      : <td key={key+'-cost'} className="cycle-token-value">{tokenSlot(cost,true,cost||undefined)}</td>
    return [current,costCell]
  }))}</>
}

export function TokenCostSummary({costs,piloted=false}:{costs?:CycleTokenCosts;piloted?:boolean}){
  return <>{roles(piloted).map(role=><span key={role} className="cycle-token-group">
    {piloted&&<strong>{roleLabel[role]}</strong>}
    {fields.map(([field,,label])=><span key={field} title={'Coût · '+label}>Coût : {tokenCost(costs,role,field)||'—'}</span>)}
  </span>)}</>
}

export function TokenSummary({tokens,piloted=false}:{tokens?:CycleTokens;piloted?:boolean}){
  return <>{roles(piloted).map(role=><span key={role} className="cycle-token-group">
    {piloted&&<strong>{roleLabel[role]}</strong>}
    {fields.map(([field,,label])=><span key={field}>{label} : {formatTokens(tokens?.[role]?.[field])}</span>)}
  </span>)}</>
}
