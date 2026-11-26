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
  return fixed?<FixedStageValue value={value} sample={'999\u202fM\u202f'} title={title}/>:value
}

export function TokenColumns({tokens,piloted=false,header=false,includeCumulative=false}:{
  tokens?:CycleTokens;piloted?:boolean;header?:boolean;includeCumulative?:boolean
}){
  return <>{roles(piloted).flatMap(role=>fields.flatMap(([field,abbreviation,label])=>{
    const key=role+field
    const value=formatTokens(tokens?.[role]?.[field])
    const current=header
      ? <th key={key} scope="col" title={label}>{tokenSlot(abbreviation,includeCumulative)}{piloted&&!includeCumulative&&<small>{roleLabel[role]}</small>}</th>
      : <td key={key} className="cycle-token-value">{tokenSlot(value,includeCumulative,value)}</td>
    if(!includeCumulative)return current
    const total=header
      ? <th key={key+'-total'} scope="col" title={'Cumul · '+label}>{tokenSlot('C'+abbreviation,true)}</th>
      : <td key={key+'-total'} className="cycle-token-value">{tokenSlot('',true)}</td>
    return [current,total]
  }))}</>
}

export function TokenSummary({tokens,piloted=false}:{tokens?:CycleTokens;piloted?:boolean}){
  return <>{roles(piloted).map(role=><span key={role} className="cycle-token-group">
    {piloted&&<strong>{roleLabel[role]}</strong>}
    {fields.map(([field,,label])=><span key={field}>{label} : {formatTokens(tokens?.[role]?.[field])}</span>)}
  </span>)}</>
}
