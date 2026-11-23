import {useState} from 'react'

export const policyPath='administration/agent-model-policies'
const contextSteps=[0,262144,500000,1000000,1048576]
const outputSteps=[0,64000,500000,1000000,1048576]
const format=new Intl.NumberFormat('fr-FR')

const priceRows=[
  [['input_price_min','Coût entrée / M minimum'],['input_price_max','Coût entrée / M maximum']],
  [['output_price_min','Coût sortie / M minimum'],['output_price_max','Coût sortie / M maximum']],
  [['cache_write_min','Écriture cache / M minimum'],['cache_write_max','Écriture cache / M maximum']],
  [['cache_read_min','Lecture cache / M minimum'],['cache_read_max','Lecture cache / M maximum']],
] as const
const priceFields=priceRows.flat()

const sortColumns=[
  ['input_cost','Coût entrée / M'],
  ['output_cost','Coût Sortie / M'],
  ['cache_read_cost','Lecture Cache / M'],
  ['cache_write_cost','Écriture Cache'],
] as const

type PolicyProvider={id:number;name:string}
export type PolicyProviders={providers?:PolicyProvider[];error?:Error|null}

export type Policy={id:number;name:string;model_filter:string;provider_ids:number[]|null;include_free:boolean;include_paid:boolean;context_min:number;output_min:number;
  sort_column:typeof sortColumns[number][0];sort_descending:boolean}
  & Record<typeof priceFields[number][0],string|number>

export function policyPayload(values:FormData){
  return {
    name:values.get('name'),
    model_filter:values.get('model_filter')||'',
    provider_ids:JSON.parse(String(values.get('provider_ids')??'null')) as number[]|null,
    include_free:values.has('include_free'),
    include_paid:values.has('include_paid'),
    context_min:Number(values.get('context_min')),
    output_min:Number(values.get('output_min')),
    sort_column:values.get('sort_column'),
    sort_descending:values.get('sort_direction')==='descending',
    ...Object.fromEntries(priceFields.map(([name])=>[name,values.get(name)||'0'])),
  }
}

function Limit({name,label,steps,initial}:{name:string;label:string;steps:number[];initial:number}){
  const [position,setPosition]=useState(Math.max(0,steps.indexOf(initial)))
  const value=steps[position]
  return <label className="model-policy-label"><span>{label} <output>{value?format.format(value)+' tokens':'Désactivé'}</output></span>
    <input type="range" aria-label={label} min={0} max={steps.length-1} step={1} value={position}
      aria-valuetext={value?format.format(value)+' tokens':'Désactivé'}
      onChange={event=>setPosition(event.target.valueAsNumber)}/>
    <input type="hidden" name={name} value={value}/>
  </label>
}

function ProviderFilter({initial,options}:{initial:number[]|null;options:PolicyProviders}){
  const [selection,setSelection]=useState(initial??[])
  const {providers,error}=options
  const activeIds=new Set(providers?.map(row=>row.id))
  const current=providers?selection.filter(id=>activeIds.has(id)):selection
  const selected=new Set(current)
  const selectedNames=providers?.filter(row=>selected.has(row.id)).map(row=>row.name)??[]

  function toggle(id:number){
    setSelection(previous=>{
      const choices=providers?previous.filter(value=>activeIds.has(value)):previous
      return choices.includes(id)?choices.filter(value=>value!==id):[...choices,id]
    })
  }

  return <fieldset className="model-policy-providers">
    <legend>Fournisseurs</legend>
    <input type="hidden" name="provider_ids" value={JSON.stringify(current.length?current:null)}/>
    <details className="model-policy-provider-picker">
      <summary>{selectedNames.length?selectedNames.join(', '):'Tous les fournisseurs'}</summary>
      {error?<p role="alert">{error.message}</p>:!providers?<p role="status">Chargement des fournisseurs…</p>:
        !providers.length?<p className="field-help">Aucun fournisseur enregistré.</p>:
        <div className="model-policy-provider-list" role="group" aria-label="Fournisseurs disponibles">
          {providers.map(provider=><button key={provider.id} type="button" aria-pressed={selected.has(provider.id)}
            onClick={()=>toggle(provider.id)}>{provider.name}</button>)}
        </div>}
    </details>
  </fieldset>
}

export function ModelPolicyFields({policy,providerOptions}:{policy?:Policy;providerOptions:PolicyProviders}){
  return <>
    <div className="model-policy-pair">
      <label className="model-policy-label">Nom de la politique<input name="name" required maxLength={120} defaultValue={policy?.name}/></label>
      <label className="model-policy-label">Filtre de modèles (Séparé par des ;)
        <input name="model_filter" maxLength={2048} defaultValue={policy?.model_filter}/>
      </label>
    </div>
    <div className="model-policy-pair">
      <Limit name="context_min" label="Contexte minimum" steps={contextSteps} initial={policy?.context_min??0}/>
      <Limit name="output_min" label="Sortie maximale minimum" steps={outputSteps} initial={policy?.output_min??0}/>
    </div>
    <div className="model-policy-pair">
      <div className="model-policy-inclusions">
        <fieldset className="model-policy-switches">
          <legend>Modèles à inclure</legend>
          <div className="model-policy-types">
            <label><input name="include_free" type="checkbox" role="switch" defaultChecked={policy?.include_free??true}/> Free</label>
            <label><input name="include_paid" type="checkbox" role="switch" defaultChecked={policy?.include_paid??true}/> Payant</label>
          </div>
        </fieldset>
        <ProviderFilter initial={policy?.provider_ids??null} options={providerOptions}/>
      </div>
      <fieldset className="model-policy-sort">
        <legend>Triage</legend>
        <label className="model-policy-label"><span>Colonne de tri</span><select name="sort_column" defaultValue={policy?.sort_column??'input_cost'}>
          {sortColumns.map(([key,label])=><option key={key} value={key}>{label}</option>)}
        </select></label>
        <label className="model-policy-label"><span>Tri</span><select name="sort_direction" defaultValue={policy?.sort_descending?'descending':'ascending'}>
          <option value="ascending">Du - Cher au + Cher</option>
          <option value="descending">Du + Cher au - Cher</option>
        </select></label>
      </fieldset>
    </div>
    <p className="field-help">Tarifs en dollars par million de tokens. La valeur 0 désactive la borne.</p>
    {priceRows.map(pair=><div className="model-policy-prices" key={pair[0][0]}>
      {pair.map(([name,label])=><label key={name}>{label}<input name={name} type="number" min={0} step="any" defaultValue={policy?.[name]??0}/></label>)}
    </div>)}
  </>
}
