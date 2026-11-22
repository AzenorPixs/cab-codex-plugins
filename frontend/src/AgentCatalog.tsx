import {useRef,useState,type FormEvent,type KeyboardEvent,type ReactNode} from 'react'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {Link} from '@tanstack/react-router'
import {api} from './api'
import {ModelPolicyFields,policyPath,policyPayload,type Policy} from './ModelPolicy'

const providerPath='administration/agent-providers'
const keyPath='administration/agent-api-keys'
const modelPath='administration/agent-models'
export const agentCatalogPages=[['api-keys','Clés API'],['providers','Fournisseurs'],['models','Modèles']] as const
export type CatalogPage=typeof agentCatalogPages[number][0]

type Provider={id:number;name:string;models_url:string;api_url:string}
type ApiKey={id:string;provider:string;day:number|null;week:number|null;month:number|null;credits:number|null}
type Model={id:number;identifier:string;name:string|null;provider:string;context:number|null;output:number|null;input_modalities:string[]|null;output_modalities:string[]|null;input_cost:string|number|null;output_cost:string|number|null;cache_read_cost:string|number|null;cache_write_cost:string|number|null;cache_write_duration:string|null}
const format=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:12})
const number=(value:number|null)=>typeof value==='number'&&Number.isFinite(value)?format.format(value):'—'
const priceValue=(value:Model['input_cost'])=>value==null||value===''||!Number.isFinite(Number(value))?null:Number(value)
const price=(value:Model['input_cost'])=>priceValue(value)===null?'—':format.format(Number(value))+' $'
const modalities=(value:Model['input_modalities'])=>Array.isArray(value)?value.filter(item=>typeof item==='string').join(', '):''

export function AgentNavigation(){
  return <nav className="project-tabs" aria-label="Agents">
    <Link to="/agents" activeOptions={{exact:true}} className="project-home-link" aria-label="Accueil des agents" title="Accueil des agents">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg>
    </Link>
    {agentCatalogPages.map(([page,label])=><Link key={page} to={'/agents/'+page}>{label}</Link>)}
  </nav>
}

type CellValue=string|number|null
type Column<Row>={label:string;value?:(row:Row)=>CellValue;render?:(row:Row)=>ReactNode;search?:(row:Row)=>string}
const pageSize=10
const collator=new Intl.Collator('fr',{numeric:true,sensitivity:'base'})
const searchable=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()

function CatalogTable<Row extends {id:number|string}>({title,columns,rows,actions,toolbar,pending,error,viewKey}:{
  title:string;columns:Column<Row>[];rows:Row[];actions?:ReactNode;toolbar?:ReactNode;
  pending:boolean;error:Error|null;viewKey?:number|null
}){
  const [query,setQuery]=useState('')
  const [sort,setSort]=useState<{column:number;descending:boolean}|null>(null)
  const [page,setPage]=useState(1)
  const [previousView,setPreviousView]=useState(viewKey)
  if(previousView!==viewKey){setPreviousView(viewKey);setPage(1)}
  const words=searchable(query.trim()).split(/\s+/).filter(Boolean)
  const visible=words.length?rows.filter(row=>{
    const content=columns.map(column=>{
      const value=column.value?.(row)
      return [column.search?.(row),value,typeof value==='number'?format.format(value):null].join(' ')
    }).join(' ')
    const haystack=searchable(content)
    return words.every(word=>haystack.includes(word))
  }):rows.slice()
  const value=sort?columns[sort.column].value:undefined
  if(value&&sort)visible.sort((left,right)=>{
    const a=value(left),b=value(right)
    if(a===null||a==='')return b===null||b===''?0:1
    if(b===null||b==='')return -1
    const order=typeof a==='number'&&typeof b==='number'?a-b:collator.compare(String(a),String(b))
    return sort.descending?-order:order
  })
  const pages=Math.max(1,Math.ceil(visible.length/pageSize))
  const current=Math.min(page,pages)
  function selectSort(column:number){
    setSort(previous=>({column,descending:previous?.column===column&&!previous.descending}))
    setPage(1)
  }
  return <>
    <section className="project-home project-forges-page">
      <div className="section-heading"><div className="project-identity">
        {actions}<h1>{title}</h1>
        <input className="agent-catalog-search" type="search" value={query} placeholder="Rechercher…"
          aria-label={'Rechercher dans '+title}
          onChange={event=>{setQuery(event.target.value);setPage(1)}}/>
      </div></div>
    </section>
    {toolbar}
    {error&&<p role="alert">{error.message}</p>}
    {pending&&<p role="status">Chargement…</p>}
    <div id={viewKey!==undefined?'model-catalog-panel':undefined} role={viewKey!==undefined?'tabpanel':undefined}
      aria-labelledby={viewKey!==undefined?'model-tab-'+(viewKey??'all'):undefined} className="table-wrap"><table className="monitor-table" aria-label={title}>
      <thead><tr>{columns.map((column,index)=><th key={column.label} scope="col"
        aria-sort={sort?.column===index?(sort.descending?'descending':'ascending'):undefined}>
        {column.value?<button className="binary-sort" type="button" onClick={()=>selectSort(index)}>
          {column.label}{sort?.column===index&&<span aria-hidden="true">{sort.descending?'↓':'↑'}</span>}
        </button>:<span>{column.label}</span>}
      </th>)}</tr></thead>
      <tbody>{visible.slice((current-1)*pageSize,current*pageSize).map(row=><tr key={row.id}>{columns.map(column=>
        <td key={column.label} data-label={column.label}>{column.render?column.render(row):column.value?.(row)??'—'}</td>)}</tr>)}</tbody>
    </table>{!pending&&!error&&!visible.length&&<p className="empty">{words.length?'Aucun résultat.':'Aucune entrée.'}</p>}</div>
    <nav className="git-overview-controls" aria-label={'Pagination '+title}>
      <button type="button" disabled={current===1} onClick={()=>setPage(1)}>Premier</button>
      <button type="button" disabled={current===1} onClick={()=>setPage(current-1)}>Précédent</button>
      <span aria-live="polite">Page {current} / {pages} · {visible.length} résultat{visible.length===1?'':'s'}</span>
      <button type="button" disabled={current===pages} onClick={()=>setPage(current+1)}>Suivant</button>
      <button type="button" disabled={current===pages} onClick={()=>setPage(pages)}>Dernier</button>
    </nav>
  </>
}

function AddOverview({title,children,submit,onClose,edit=false}:{title:string;children:ReactNode;submit:(values:FormData)=>Promise<unknown>;onClose?:()=>void;edit?:boolean}){
  const dialog=useRef<HTMLDialogElement>(null)
  const form=useRef<HTMLFormElement>(null)
  const [pending,setPending]=useState(false)
  const [error,setError]=useState('')
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    setPending(true)
    setError('')
    try{
      await submit(new FormData(event.currentTarget))
      dialog.current?.close()
    }catch(failure){
      setError(failure instanceof Error?failure.message:'Enregistrement refusé.')
    }finally{setPending(false)}
  }
  return <>
    <button className={edit?"secondary-button":"add-project"} type="button" aria-label={title} title={title} onClick={()=>dialog.current?.showModal()}>{edit?"Éditer":"+"}</button>
    <dialog ref={dialog} className="lifecycle-dialog" onCancel={event=>{if(pending)event.preventDefault()}}
      onClose={()=>{form.current?.reset();setError('');onClose?.()}}>
      <h2>{title}</h2>
      <form ref={form} className="settings-form" onSubmit={event=>void save(event)}>
        {children}
        {error&&<p role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-button" disabled={pending} onClick={()=>dialog.current?.close()}>Annuler</button>
          <button type="submit" disabled={pending}>{pending?'Enregistrement…':edit?'Enregistrer':'Ajouter'}</button>
        </div>
      </form>
    </dialog>
  </>
}

function DeleteOverview({label,title,name,detail,remove,trash=false}:{label:string;title:string;name:string;detail?:string;remove:()=>Promise<unknown>;trash?:boolean}){
  const dialog=useRef<HTMLDialogElement>(null)
  const [error,setError]=useState('')
  const [pending,setPending]=useState(false)
  async function confirm(){
    setPending(true)
    setError('')
    try{
      await remove()
      dialog.current?.close()
    }catch(failure){setError(failure instanceof Error?failure.message:'Suppression refusée.')}
    finally{setPending(false)}
  }
  return <>
    <button type="button" className={trash?'lifecycle-icon danger':'secondary-button'} aria-label={label}
      title={label} onClick={()=>{setError('');dialog.current?.showModal()}}>
      {trash?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>:'Supprimer'}
    </button>
    <dialog className="lifecycle-dialog deletion-dialog" ref={dialog} onCancel={event=>{if(pending)event.preventDefault()}}>
      <h2>{title}</h2><p>{name}</p>{detail&&<p>{detail}</p>}
      {error&&<p role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={()=>dialog.current?.close()} disabled={pending}>Annuler</button>
        <button type="button" onClick={()=>void confirm()} disabled={pending}>Supprimer</button>
      </div>
    </dialog>
  </>
}

const loadProviders=()=>api<{providers:Provider[]}>(providerPath)

function ProviderCatalog(){
  const query=useQuery({queryKey:[providerPath],queryFn:loadProviders,networkMode:'always'})
  const client=useQueryClient()
  const rows=query.data?.providers??[]
  async function remove(id:number){
    await api(providerPath+'/remove',{id})
    client.setQueryData<{providers:Provider[]}>([providerPath],state=>({providers:(state?.providers??[]).filter(row=>row.id!==id)}))
    await client.invalidateQueries({queryKey:[modelPath]})
  }
  const columns:Column<Provider>[]=[
    {label:'Fournisseur',value:row=>row.name},
    {label:'Liste des Modèles',value:row=>row.models_url||null},
    {label:'URL API',value:row=>row.api_url},
    {label:'Actions',render:row=><DeleteOverview trash label={'Supprimer le fournisseur '+row.name}
      title="Supprimer le fournisseur" name={row.name} detail="Les modèles de ce fournisseur seront retirés du catalogue. Supprimez d’abord les clés API liées." remove={()=>remove(row.id)}/>},
  ]
  async function add(values:FormData){
    const provider=await api<Provider>(providerPath,Object.fromEntries(values))
    client.setQueryData<{providers:Provider[]}>([providerPath],state=>({
      providers:[...(state?.providers??[]).filter(row=>row.id!==provider.id),provider].sort((left,right)=>left.name.localeCompare(right.name,'fr')),
    }))
    await client.invalidateQueries({queryKey:[modelPath]})
  }
  return <CatalogTable title="Fournisseurs" columns={columns} pending={query.isPending} error={query.error} rows={rows}
    actions={<AddOverview title="Ajouter un fournisseur" submit={add}>
      <label>Fournisseur<input name="name" required maxLength={160}/></label>
      <label>Liste des Modèles (facultatif)<input name="models_url" type="url" maxLength={2048}/></label>
      <label>URL API<input name="api_url" type="url" maxLength={2048} required/></label>
    </AddOverview>}/>
}

function KeyCatalog(){
  const query=useQuery({queryKey:[keyPath],queryFn:()=>api<{keys:ApiKey[]}>(keyPath),networkMode:'always'})
  const providers=useQuery({queryKey:[providerPath],queryFn:loadProviders,networkMode:'always'})
  const [visible,setVisible]=useState(false)
  const client=useQueryClient()
  const rows=query.data?.keys??[]
  async function remove(id:string){
    await api(keyPath+'/remove',{id})
    client.setQueryData<{keys:ApiKey[]}>([keyPath],state=>({keys:(state?.keys??[]).filter(row=>row.id!==id)}))
  }
  const quotaColumns=[['day','Quota Jour'],['week','Quota Semaine'],['month','Quota Mois'],['credits','Crédits']] as const
  const columns:Column<ApiKey>[]=[
    {label:'Fournisseurs',value:row=>row.provider},
    ...quotaColumns.map(([field,label])=>({label,value:(row:ApiKey)=>row[field],render:(row:ApiKey)=>number(row[field])})),
    {label:'Actions',render:row=><DeleteOverview trash label={'Supprimer une clé API de '+row.provider}
      title="Supprimer la clé API" name={row.provider} remove={()=>remove(row.id)}/>},
  ]
  async function add(values:FormData){
    const key=await api<ApiKey>(keyPath,{provider_id:Number(values.get('provider_id')),key:values.get('key')})
    client.setQueryData<{keys:ApiKey[]}>([keyPath],state=>({
      keys:[...(state?.keys??[]).filter(row=>row.id!==key.id),key].sort((left,right)=>left.provider.localeCompare(right.provider,'fr')),
    }))
  }
  return <CatalogTable title="Clés API" columns={columns} pending={query.isPending} error={query.error} rows={rows}
      actions={<AddOverview title="Ajouter une clé API" submit={add} onClose={()=>setVisible(false)}>
        <label>Fournisseur<select name="provider_id" defaultValue="" required>
          <option value="" disabled>{providers.isPending?'Chargement…':'Choisir un fournisseur'}</option>
          {providers.data?.providers.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>
        {providers.error&&<p role="alert">{providers.error.message}</p>}
        {providers.data?.providers.length===0&&<p><Link to="/agents/providers">Ajouter d’abord un fournisseur</Link></p>}
        <label>Clé API<input name="key" type={visible?'text':'password'} autoComplete="off" spellCheck={false} maxLength={16384} required/></label>
        <button className="lifecycle-icon" type="button" aria-label={visible?'Masquer la clé API':'Afficher la clé API'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>{visible&&<path d="m3 3 18 18"/>}</svg>
        </button>
      </AddOverview>}/>
}

function PolicyOverview({policy,onSaved}:{policy?:Policy;onSaved:(policy:Policy)=>Promise<void>}){
  const [formVersion,setFormVersion]=useState(0)
  async function save(values:FormData){
    const payload=policyPayload(values)
    const saved=await api<Policy>(policy?policyPath+'/edit':policyPath,policy?{id:policy.id,...payload}:payload)
    await onSaved(saved)
  }
  return <AddOverview edit={!!policy} title={policy?'Éditer la politique de modèles':'Ajouter une politique de modèles'}
    submit={save} onClose={()=>setFormVersion(version=>version+1)}>
    <ModelPolicyFields key={formVersion} policy={policy}/>
  </AddOverview>
}

const columns:Column<Model>[]=[
  {label:'Modèle',value:row=>row.name||row.identifier,search:row=>row.identifier,
    render:row=><>{row.name||row.identifier}{row.name&&row.name!==row.identifier&&<small>{row.identifier}</small>}</>},
  {label:'Fournisseur',value:row=>row.provider},
  {label:'Contexte',value:row=>row.context,render:row=>number(row.context)},
  {label:'Sortie maximale',value:row=>row.output,render:row=>number(row.output)},
  {label:'Entrées',value:row=>modalities(row.input_modalities)||null},
  {label:'Sorties',value:row=>modalities(row.output_modalities)||null},
  {label:'Coût entrée / M',value:row=>priceValue(row.input_cost),render:row=>price(row.input_cost)},
  {label:'Coût sortie / M',value:row=>priceValue(row.output_cost),render:row=>price(row.output_cost)},
  {label:'Lecture cache / M',value:row=>priceValue(row.cache_read_cost),render:row=>price(row.cache_read_cost)},
  {label:'Écriture cache / M',value:row=>priceValue(row.cache_write_cost),search:row=>row.cache_write_duration??'',
    render:row=><>{price(row.cache_write_cost)}{row.cache_write_duration&&<small>{row.cache_write_duration}</small>}</>},
]

function ModelCatalog(){
  const client=useQueryClient()
  const policies=useQuery({queryKey:[policyPath],queryFn:()=>api<{policies:Policy[]}>(policyPath),networkMode:'always'})
  const [tab,setTab]=useState<number|null>(null)
  const entries=policies.data?.policies??[]
  const selected=entries.find(policy=>policy.id===tab)
  const selectedId=selected?.id??null
  const url=selectedId===null?modelPath:modelPath+'?policy_id='+selectedId
  const query=useQuery({queryKey:[modelPath,selectedId],queryFn:()=>api<{models:Model[]}>(url),refetchInterval:60_000,networkMode:'always'})
  async function save(saved:Policy){
    client.setQueryData<{policies:Policy[]}>([policyPath],state=>({
      policies:[...(state?.policies??[]).filter(policy=>policy.id!==saved.id),saved].sort((a,b)=>a.id-b.id),
    }))
    setTab(saved.id)
    await client.invalidateQueries({queryKey:[modelPath,saved.id]})
  }
  async function remove(id:number){
    await api(policyPath+'/remove',{id})
    setTab(null)
    client.setQueryData<{policies:Policy[]}>([policyPath],state=>({policies:(state?.policies??[]).filter(policy=>policy.id!==id)}))
    client.removeQueries({queryKey:[modelPath,id]})
  }
  const tabs=[{id:null,name:'Tous'},...entries]
  function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
    let target=index
    if(event.key==='ArrowRight')target=(index+1)%tabs.length
    else if(event.key==='ArrowLeft')target=(index-1+tabs.length)%tabs.length
    else if(event.key==='Home')target=0
    else if(event.key==='End')target=tabs.length-1
    else return
    event.preventDefault()
    setTab(tabs[target].id)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[target]?.focus()
  }
  const toolbar=<div className="model-policy-toolbar">
    <div className="project-tabs" role="tablist" aria-label="Politiques de modèles">
      {tabs.map(({id,name},index)=><button key={id??'all'} type="button" role="tab" id={'model-tab-'+(id??'all')}
        aria-selected={selectedId===id} tabIndex={selectedId===id?0:-1} aria-controls="model-catalog-panel"
        onKeyDown={event=>navigate(event,index)} onClick={()=>setTab(id)}>{name}</button>)}
    </div>
    {selected&&<div className="model-policy-actions">
      <PolicyOverview key={selected.id} policy={selected} onSaved={save}/>
      <DeleteOverview label="Supprimer la politique de modèles" title="Supprimer la politique de modèles"
        name={selected.name} remove={()=>remove(selected.id)}/>
    </div>}
    {policies.error&&<p role="alert">{policies.error.message}</p>}
  </div>
  return <CatalogTable viewKey={selectedId} title="Modèles" columns={columns} toolbar={toolbar}
    actions={<PolicyOverview onSaved={save}/>} rows={query.data?.models??[]} pending={query.isPending} error={query.error}/>
}

export function AgentCatalog({page}:{page:CatalogPage}){
  if(page==='api-keys')return <KeyCatalog/>
  if(page==='providers')return <ProviderCatalog/>
  return <ModelCatalog/>
}
