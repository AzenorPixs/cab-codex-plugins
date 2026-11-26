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

export function cumulativeCycleTokens(previous:CycleTokens, tokens:CycleTokens|undefined, piloted:boolean):CycleTokens{
  const total:CycleTokens={}
  for(const role of roles(piloted)){
    const counts:TokenCounts={...previous[role]}
    for(const [field] of fields){
      const value=tokens?.[role]?.[field]
      if(value&&/^\d+$/.test(value))counts[field]=(BigInt(counts[field]??'0')+BigInt(value)).toString()
    }
    total[role]=counts
  }
  return total
}

export function TokenRoleHeaders(){
  return <>{roles(true).map(role=><th key={role} colSpan={fields.length*2}>{roleLabel[role]}</th>)}</>
}

export function TokenColumns({tokens,cumulative,piloted=false,header=false,includeCumulative=cumulative!==undefined}:{
  tokens?:CycleTokens;cumulative?:CycleTokens;piloted?:boolean;header?:boolean;includeCumulative?:boolean
}){
  return <>{roles(piloted).flatMap(role=>fields.flatMap(([field,abbreviation,label])=>{
    const key=role+field
    const current=header
      ? <th key={key} scope="col" title={label}>{abbreviation}{piloted&&!includeCumulative&&<small>{roleLabel[role]}</small>}</th>
      : <td key={key} className="cycle-token-value">{formatTokens(tokens?.[role]?.[field])}</td>
    if(!includeCumulative)return current
    const total=header
      ? <th key={key+'-total'} scope="col" title={'Cumul · '+label}>C{abbreviation}</th>
      : <td key={key+'-total'} className="cycle-token-value">{formatTokens(cumulative?.[role]?.[field])}</td>
    return [current,total]
  }))}</>
}

export function TokenSummary({tokens,piloted=false}:{tokens?:CycleTokens;piloted?:boolean}){
  return <>{roles(piloted).map(role=><span key={role} className="cycle-token-group">
    {piloted&&<strong>{roleLabel[role]}</strong>}
    {fields.map(([field,,label])=><span key={field}>{label} : {formatTokens(tokens?.[role]?.[field])}</span>)}
  </span>)}</>
}
