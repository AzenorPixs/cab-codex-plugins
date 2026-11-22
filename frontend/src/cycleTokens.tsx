const fields=[
  ['input_tokens','Te','Token/Entrant'],
  ['output_tokens','Ts','Token/Sortant'],
  ['cache_read_tokens','Tc','Token/Cache'],
] as const
type TokenField=typeof fields[number][0]
type TokenRole='coder'|'orchestrator'
type TokenCounts=Record<TokenField,string|null>
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
const roleLabel:Record<TokenRole,string>={coder:'Codeur',orchestrator:'Orchestrateur'}

export function TokenColumns({tokens,piloted=false,header=false}:{tokens?:CycleTokens;piloted?:boolean;header?:boolean}){
  return <>{roles(piloted).flatMap(role=>fields.map(([field,abbreviation,label])=>{
    const key=role+field
    return header
      ? <th key={key} scope="col" title={label}>{abbreviation}{piloted&&<small>{roleLabel[role]}</small>}</th>
      : <td key={key} className="cycle-token-value">{formatTokens(tokens?.[role]?.[field])}</td>
  }))}</>
}

export function TokenSummary({tokens,piloted=false}:{tokens?:CycleTokens;piloted?:boolean}){
  return <>{roles(piloted).map(role=><span key={role} className="cycle-token-group">
    {piloted&&<strong>{roleLabel[role]}</strong>}
    {fields.map(([field,,label])=><span key={field}>{label} : {formatTokens(tokens?.[role]?.[field])}</span>)}
  </span>)}</>
}
