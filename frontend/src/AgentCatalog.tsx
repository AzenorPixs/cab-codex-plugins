import {filterTableRows,TableFiller,TableNavigation,tablePage,tablePageLimit,useTableSearch} from './TableNavigation'
import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent,type ReactNode} from 'react'
import {Link} from '@tanstack/react-router'
import {api} from './api'
import {ModelPolicyFields,policyPath,policyPayload,selectPolicyModels,type Policy,type PolicyProviders} from './ModelPolicy'
import {CatalogDocument,CatalogRefresh,RefreshControl,StateOverview,catalogDate,useAgentCatalog,
  type ApiKey,type CatalogFile,type Model,type Provider} from './AgentCatalogLive'

const providerPath='administration/agent-providers'
const keyPath='administration/agent-api-keys'
export const agentCatalogPages=[['api-keys','Clés API'],['providers','Fournisseurs'],['models','Modèles']] as const
export type CatalogPage=typeof agentCatalogPages[number][0]

type Catalog=ReturnType<typeof useAgentCatalog>
type KeyRow=ApiKey&{provider:string}
type ModelRow=Model&{provider:string}
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
type Column<Row>={label:string;className?:string;value?:(row:Row)=>CellValue;render?:(row:Row)=>ReactNode;search?:(row:Row)=>string}
type TableSort={column:number;descending:boolean}
const collator=new Intl.Collator('fr',{numeric:true,sensitivity:'base'})

function CatalogTable<Row extends {id:number|string}>({title,columns,rows,actions,toolbar,paginationActions,pending,error,viewKey,defaultSort,numbered=false}:{
  title:string;columns:Column<Row>[];rows:Row[];actions?:ReactNode;toolbar?:ReactNode;paginationActions?:ReactNode;
  pending:boolean;error:Error|null;viewKey?:number|null;defaultSort?:TableSort;numbered?:boolean
}){
  const navigation=useTableSearch()
  const [manualSort,setSort]=useState<TableSort|undefined>(defaultSort)
  const sort=numbered?undefined:manualSort
  const [previousView,setPreviousView]=useState(viewKey)
  if(previousView!==viewKey){setPreviousView(viewKey);navigation.setPage(1)}
  const visible=filterTableRows(rows,navigation.query,row=>columns.flatMap(column=>{
    const value=column.value?.(row)
    return [column.search?.(row),value,typeof value==='number'?format.format(value):null]
  })).slice()
  const value=sort?columns[sort.column].value:undefined
  if(value&&sort)visible.sort((left,right)=>{
    const a=value(left),b=value(right)
    if(a===null||a==='')return b===null||b===''?0:1
    if(b===null||b==='')return -1
    const order=typeof a==='number'&&typeof b==='number'?a-b:collator.compare(String(a),String(b))
    return sort.descending?-order:order
  })
  const {rows:displayed,current,pages}=tablePage(visible,navigation.page)
  function selectSort(column:number){
    setSort(previous=>({column,descending:previous?.column===column&&!previous.descending}))
    navigation.setPage(1)
  }
  return <>
    <section className="project-home project-forges-page">
      <div className="section-heading"><div className="project-identity">
        {actions}<h1>{title}</h1>
      </div></div>
    </section>
    {toolbar}
    {error&&<p role="alert">{error.message}</p>}
    {pending&&<p role="status">Chargement…</p>}
    <div id={viewKey!==undefined?'model-catalog-panel':undefined} role={viewKey!==undefined?'tabpanel':undefined}
      aria-labelledby={viewKey!==undefined?'model-tab-'+(viewKey??'all'):undefined} className="table-wrap"><table className="monitor-table" aria-label={title}>
      <thead><tr>{numbered&&<th scope="col"><span>N°</span></th>}{columns.map((column,index)=><th key={column.label} scope="col" className={column.className}
        aria-sort={sort?.column===index?(sort.descending?'descending':'ascending'):undefined}>
        {column.value&&!numbered?<button className="binary-sort" type="button" onClick={()=>selectSort(index)}>
          {column.label}{sort?.column===index&&<span aria-hidden="true">{sort.descending?'↓':'↑'}</span>}
        </button>:<span>{column.label}</span>}
      </th>)}</tr></thead>
      <tbody>{displayed.map((row,index)=><tr key={row.id}>
        {numbered&&<td data-label="N°">{(current-1)*tablePageLimit+index+1}</td>}
        {columns.map(column=><td key={column.label} data-label={column.label} className={column.className}>{column.render?column.render(row):column.value?.(row)??'—'}</td>)}</tr>)}
      <TableFiller count={displayed.length} columns={columns.length+Number(numbered)}
        empty={!pending&&!error?(navigation.query.trim()?'Aucun résultat.':'Aucune entrée.'):undefined}/></tbody>
    </table></div>
    <TableNavigation {...navigation} label={'Pagination '+title} searchLabel={'Rechercher dans '+title}
      current={current} pages={pages} total={visible.length}>
      {paginationActions&&<div className="model-policy-actions">{paginationActions}</div>}
    </TableNavigation>
  </>
}

function AddOverview({title,children,submit,onClose,onOpen,edit=false,wide=false}:{title:string;children:ReactNode;submit:(values:FormData)=>Promise<unknown>;onClose?:()=>void;onOpen?:()=>void;edit?:boolean;wide?:boolean}){
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
    <button className={edit?"secondary-button":"add-project"} type="button" aria-label={title} title={title} onClick={()=>{onOpen?.();dialog.current?.showModal()}}>{edit?"Éditer":"+"}</button>
    <dialog ref={dialog} className={wide?"lifecycle-dialog model-policy-overview":"lifecycle-dialog"} onCancel={event=>{if(pending)event.preventDefault()}}
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

function SecretKeyField({visible,toggle,required=false}:{visible:boolean;toggle:()=>void;required?:boolean}){
  return <>
    <label>{required?'Clé API':'Clé API (facultatif)'}<input name="key" type={visible?'text':'password'} autoComplete="off" spellCheck={false} maxLength={16384} required={required}/></label>
    <button className="lifecycle-icon" type="button" aria-label={visible?'Masquer la clé API':'Afficher la clé API'} aria-pressed={visible} onClick={toggle}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>{visible&&<path d="m3 3 18 18"/>}</svg>
    </button>
  </>
}

function ProviderOverview({provider}:{provider?:Provider}){
  const [visible,setVisible]=useState(false)
  async function save(values:FormData){
    if(!values.get('key'))values.delete('key')
    const payload=Object.fromEntries(values)
    try{
      await api(provider?providerPath+'/edit':providerPath,provider?{...payload,id:provider.id}:payload)
    }catch(error){
      if(error instanceof Error&&error.message.includes('agent-provider-key-origin-change')){
        throw new Error('Retirez les clés associées avant de changer le domaine du fournisseur.')
      }
      throw error
    }
  }
  return <AddOverview edit={!!provider} title={provider?'Éditer le fournisseur':'Ajouter un fournisseur'} submit={save} onClose={()=>setVisible(false)}>
    <label>Fournisseur<input name="name" required maxLength={160} defaultValue={provider?.name}/></label>
    <label>Liste des Modèles (facultatif)<input name="models_url" type="url" maxLength={2048} defaultValue={provider?.models_url}/></label>
    <label>Base URL API<input name="api_url" type="url" maxLength={2048} required defaultValue={provider?.api_url}/></label>
    <SecretKeyField visible={visible} toggle={()=>setVisible(!visible)}/>
  </AddOverview>
}

function CatalogUrl({value}:{value:string}){
  return /^https?:\/\//i.test(value)?<a href={value} target="_blank" rel="noopener noreferrer">{value}</a>:value||'—'
}

const catalogErrors:Record<string,string>={
  'agent-catalog-key-required':'Aucune clé API associée',
  'agent-catalog-valid-key-unavailable':'Aucune clé API valide disponible',
  'agent-catalog-auth-url-invalid':'URL incompatible avec la clé du fournisseur',
  'agent-catalog-format-invalid':'Format du catalogue invalide',
  'agent-catalog-unavailable':'Catalogue indisponible',
  'agent-catalog-file-unavailable':'Fichier du catalogue indisponible',
}

function providerStatus(source?:CatalogFile){
  if(source?.last_refresh_error||source?.state==='error')return 'Échec'
  if(source?.valid)return 'Valide'
  return source?.url?'En attente':'Source absente'
}

function ProviderStatus({provider,source}:{provider:Provider;source?:CatalogFile}){
  const status=providerStatus(source)
  const error=source?.last_refresh_error||(source?.state==='error'?source.error:'')
  const busy=['queued','downloading','applying'].includes(source?.state??'')||source?.adjusting
  return <StateOverview valid={status==='Valide'} title={'Actualisation du catalogue de '+provider.name}
    label={'État du catalogue de '+provider.name+' · '+status}>
    <dl>
      <dt>Dernier essai</dt><dd>{catalogDate(source?.attempted_at??(source?.state==='idle'?source?.refreshed_at:null))}</dd>
      <dt>Résultat</dt><dd>{status}</dd>
      {error&&<><dt>Détail</dt><dd>{catalogErrors[error]??'Actualisation impossible'}</dd></>}
      {busy&&<><dt>Actualisation</dt><dd>En cours ou en attente</dd></>}
      <dt>Dernière réussite</dt><dd>{catalogDate(source?.refreshed_at)}</dd>
    </dl>
  </StateOverview>
}

function ProviderCatalog({catalog}:{catalog:Catalog}){
  const sources=new Map(catalog.data.files.map(file=>[file.provider_id,file]))
  const columns:Column<Provider>[]=[
    {label:'Fournisseur',value:row=>row.name},
    {label:'Liste des Modèles',value:row=>row.models_url||null,render:row=><CatalogUrl value={row.models_url}/>},
    {label:'Base URL API',value:row=>row.api_url,render:row=><CatalogUrl value={row.api_url}/>},
    {label:'Horodatage',value:row=>sources.get(row.id)?.refreshed_at??null,
      render:row=>{
        const source=sources.get(row.id)
        const stamp=catalogDate(source?.refreshed_at)
        return source?.valid?<CatalogDocument path={providerPath+'/file?id='+row.id} title={'Catalogue de '+row.name} label={stamp}/>:stamp
      }},
    {label:'État',value:row=>providerStatus(sources.get(row.id)),
      render:row=><ProviderStatus provider={row} source={sources.get(row.id)}/>},
    {label:'Actions',render:row=><div className="catalog-provider-actions">
      <CatalogRefresh source={sources.get(row.id)} path={providerPath+'/refresh'} providerId={row.id}/>
      <ProviderOverview provider={row}/>
      <DeleteOverview trash label={'Supprimer le fournisseur '+row.name} title="Supprimer le fournisseur" name={row.name}
        detail="Les modèles de ce fournisseur seront retirés du catalogue. Supprimez d’abord les clés API liées."
        remove={()=>api(providerPath+'/remove',{id:row.id})}/>
    </div>},
  ]
  return <CatalogTable title="Fournisseurs" columns={columns} pending={catalog.pending} error={catalog.error}
    rows={catalog.data.providers} actions={<ProviderOverview/>}/>
}

const keyErrors:Record<string,string>={
  'agent-api-key-http-401':'Authentification refusée par le fournisseur (401)',
  'agent-api-key-http-403':'Accès refusé par le fournisseur (403)',
  'agent-api-key-endpoint-unavailable':'Aucun point d’accès authentifié pris en charge',
  'agent-api-key-provider-unavailable':'Le fournisseur est indisponible',
  'agent-api-key-tpm-unavailable':'La clé ne peut pas être lue par le TPM',
  'agent-api-key-response-invalid':'Format de réponse invalide',
  'agent-api-key-metrics-unavailable':'Aucune mesure n’est exposée',
  ...catalogErrors,
}
const rateLabels:Record<string,string>={
  'limit-requests':'Limite de requêtes','remaining-requests':'Requêtes restantes',
  'limit-tokens':'Limite de jetons','remaining-tokens':'Jetons restants',
  'limit-project-tokens':'Limite de jetons du projet','remaining-project-tokens':'Jetons restants du projet',
}
const keyStatus=(row:ApiKey)=>row.valid===true?'Valide':row.valid===false?'Accès refusé':row.checked_at?'Non vérifiée':'En attente'
const metric=(value:number|null|undefined,unit='')=>value==null?'Indisponible':number(value)+unit

function KeyStatus({row}:{row:KeyRow}){
  const measures=row.metrics
  const status=keyStatus(row)
  return <StateOverview valid={row.valid===true} title={'Actualisation de la clé API · '+row.provider}
    label={'État de la clé API de '+row.provider+' · '+status}>
    <dl>
      <dt>Dernier essai</dt><dd>{catalogDate(row.checked_at)}</dd>
      <dt>Résultat</dt><dd>{status}</dd>
      {row.check_error&&<><dt>Vérification</dt><dd>{keyErrors[row.check_error]??'Échec de la vérification'}</dd></>}
      {row.metrics_error&&<><dt>Mesures</dt><dd>{keyErrors[row.metrics_error]??'Échec de la lecture des mesures'}</dd></>}
      {(row.queued||row.checking)&&<><dt>Actualisation</dt><dd>En cours ou en attente</dd></>}
      <dt>Dernière réussite</dt><dd>{catalogDate(row.refreshed_at)}</dd>
      <dt>Crédit du compte</dt><dd>{metric(row.credits,' $')}</dd>
      {measures?.kind==='router'&&<><dt>Budget restant de la clé</dt><dd>{metric(measures.key_budget,' $')}</dd></>}
      {measures?.kind==='go'&&<><dt>Quota consommé sur cinq heures</dt><dd>{metric(measures.rolling,' %')}</dd></>}
      {Object.entries(measures?.rate_limits??{}).map(([key,value])=>
        <div key={key}><dt>{rateLabels[key]}</dt><dd>{metric(value)}</dd></div>)}
    </dl>
    {!!measures?.fine_tuning?.length&&<>
      <h3>Quotas de fine-tuning par modèle</h3>
      {measures.fine_tuning_partial&&<p>Liste partielle</p>}
      <table aria-label="Quotas de fine-tuning">
        <thead><tr><th>Modèle</th><th>Tâches du jour</th><th>Tâches en attente</th></tr></thead>
        <tbody>{measures.fine_tuning.map(limit=><tr key={limit.model}><th scope="row">{limit.model}</th>
          <td>{metric(limit.jobs_so_far_today)} / {metric(limit.max_jobs_per_day)}</td>
          <td>{metric(limit.curr_pending_jobs)} / {metric(limit.max_pending_jobs)}</td></tr>)}</tbody>
      </table>
    </>}
  </StateOverview>
}

function KeyCatalog({catalog}:{catalog:Catalog}){
  const [visible,setVisible]=useState(false)
  const providers=new Map(catalog.data.providers.map(row=>[row.id,row.name]))
  const rows=catalog.data.keys.map(row=>({...row,provider:providers.get(row.provider_id)??''}))
    .sort((left,right)=>collator.compare(left.provider,right.provider)||left.id.localeCompare(right.id))
  const quotaColumns=[['day','Quota Jour'],['week','Quota Semaine'],['month','Quota Mois'],['credits','Crédits']] as const
  const columns:Column<KeyRow>[]=[
    {label:'Fournisseurs',value:row=>row.provider},
    ...quotaColumns.map(([field,label])=>({label,value:(row:KeyRow)=>row[field],render:(row:KeyRow)=>row[field]==null?'N/A':metric(row[field],row.metrics?.kind==='go'?' %':row.metrics?.kind==='router'?' $':'')})),
    {label:'État',value:row=>keyStatus(row),render:row=><KeyStatus row={row}/>},
    {label:'Dernière actualisation réussie',value:row=>row.refreshed_at??null,
      render:row=>catalogDate(row.refreshed_at)},
    {label:'Actions',render:row=><div className="catalog-provider-actions">
      <RefreshControl path={keyPath+'/refresh'} body={{id:row.id}} busy={row.queued||row.checking}
        label={'Actualiser la clé API de '+row.provider}/>
      <DeleteOverview trash label={'Supprimer une clé API de '+row.provider}
        title="Supprimer la clé API" name={row.provider} remove={()=>api(keyPath+'/remove',{id:row.id})}/>
    </div>},
  ]
  return <CatalogTable title="Clés API" columns={columns} pending={catalog.pending} error={catalog.error} rows={rows}
      actions={<AddOverview title="Ajouter une clé API"
        submit={values=>api(keyPath,{provider_id:Number(values.get('provider_id')),key:values.get('key')})} onClose={()=>setVisible(false)}>
        <label>Fournisseur<select name="provider_id" defaultValue="" required>
          <option value="" disabled>{catalog.pending?'Chargement…':'Choisir un fournisseur'}</option>
          {catalog.data.providers.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>
        {catalog.error&&<p role="alert">{catalog.error.message}</p>}
        {!catalog.pending&&!catalog.error&&!catalog.data.providers.length&&<p><Link to="/agents/providers">Ajouter d’abord un fournisseur</Link></p>}
        <SecretKeyField visible={visible} toggle={()=>setVisible(!visible)} required/>
      </AddOverview>}/>
}

function PolicyOverview({policy,providerOptions,onSaved}:{policy?:Policy;providerOptions:PolicyProviders;onSaved:(policy:Policy)=>void}){
  const [formVersion,setFormVersion]=useState(0)
  async function save(values:FormData){
    const payload=policyPayload(values)
    const saved=await api<Policy>(policy?policyPath+'/edit':policyPath,policy?{id:policy.id,...payload}:payload)
    onSaved(saved)
  }
  return <AddOverview wide edit={!!policy} title={policy?'Éditer la politique de modèles':'Ajouter une politique de modèles'}
    submit={save} onOpen={()=>setFormVersion(version=>version+1)}>
    <ModelPolicyFields key={formVersion} policy={policy} providerOptions={providerOptions}/>
  </AddOverview>
}

const inputPriceLabel='Coût entrée / M'
const columns:Column<ModelRow>[]=[
  {label:'Modèles',value:row=>row.name||row.identifier,search:row=>row.identifier,
    render:row=><>{row.name||row.identifier}{row.name&&row.name!==row.identifier&&<small>{row.identifier}</small>}</>},
  {label:'Fournisseurs',className:'model-catalog-provider',value:row=>row.provider},
  {label:'Contexte',value:row=>row.context,render:row=>number(row.context)},
  {label:'Sortie maximale',value:row=>row.output,render:row=>number(row.output)},
  {label:'Entrées',value:row=>modalities(row.input_modalities)||null},
  {label:'Sorties',value:row=>modalities(row.output_modalities)||null},
  {label:inputPriceLabel,value:row=>priceValue(row.input_cost),render:row=>price(row.input_cost)},
  {label:'Coût sortie / M',value:row=>priceValue(row.output_cost),render:row=>price(row.output_cost)},
  {label:'Lecture cache / M',value:row=>priceValue(row.cache_read_cost),render:row=>price(row.cache_read_cost)},
  {label:'Écriture cache / M',value:row=>priceValue(row.cache_write_cost),
    search:row=>Object.keys(row.cache_write_rates??{}).join(' ')||row.cache_write_duration||'',
    render:row=>{
      const writes=['30m','12h'].filter(duration=>row.cache_write_rates?.[duration]!=null)
      return writes.length
        ? <>{writes.map(duration=><small key={duration}>{duration} · {price(row.cache_write_rates?.[duration]??null)}</small>)}</>
        : <>{price(row.cache_write_cost)}{row.cache_write_duration&&<small>{row.cache_write_duration}</small>}</>
    }},
]

const initialModelSort={column:columns.findIndex(column=>column.label===inputPriceLabel),descending:false}

function ModelCatalog({catalog}:{catalog:Catalog}){
  const providerOptions={providers:catalog.pending?undefined:catalog.data.providers,error:catalog.error}
  const [tab,setTab]=useState<number|null>(null)
  const entries=catalog.data.policies
  const selected=entries.find(policy=>policy.id===tab)
  const selectedId=selected?.id??null
  const providers=new Map(catalog.data.providers.map(row=>[row.id,row.name]))
  const models=catalog.data.models.map(model=>({...model,provider:providers.get(model.provider_id)??''}))
    .sort((a,b)=>collator.compare(a.provider,b.provider)||collator.compare(a.identifier,b.identifier))
  const rows=selected?selectPolicyModels(selected,models):models
  async function remove(id:number){
    await api(policyPath+'/remove',{id})
    setTab(null)
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
  </div>
  const policyActions=selected&&<>
    <PolicyOverview key={selected.id} policy={selected} providerOptions={providerOptions} onSaved={saved=>setTab(saved.id)}/>
    <DeleteOverview label="Supprimer la politique de modèles" title="Supprimer la politique de modèles"
      name={selected.name} remove={()=>remove(selected.id)}/>
  </>
  return <CatalogTable viewKey={selectedId} numbered={selectedId!==null} defaultSort={initialModelSort} title="Modèles" columns={columns} toolbar={toolbar} paginationActions={policyActions}
    actions={<PolicyOverview providerOptions={providerOptions} onSaved={saved=>setTab(saved.id)}/>} rows={rows} pending={catalog.pending} error={catalog.error}/>
}

export function AgentCatalog({page}:{page:CatalogPage}){
  const catalog=useAgentCatalog()
  const [scanError,setScanError]=useState('')
  useEffect(()=>{
    let mounted=true
    setScanError('')
    api('administration/agent-catalog-scan',{}).catch(error=>{
      if(mounted)setScanError(error instanceof Error?error.message:'Vérification indisponible.')
    })
    return ()=>{mounted=false}
  },[page])
  return <>{scanError&&<p role="status">{scanError}</p>}
    {page==='api-keys'?<KeyCatalog catalog={catalog}/>:page==='providers'?<ProviderCatalog catalog={catalog}/>:<ModelCatalog catalog={catalog}/>}
  </>
}
