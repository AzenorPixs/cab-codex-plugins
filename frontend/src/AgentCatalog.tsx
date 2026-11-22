import {useRef,useState,type FormEvent,type ReactNode} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {Link} from '@tanstack/react-router'
import {api} from './api'

const providerPath='administration/agent-providers'
const keyPath='administration/agent-api-keys'
const modelPath='administration/agent-models'
export const agentCatalogPages=[['api-keys','Clés API'],['providers','Fournisseurs'],['models','Modèles']] as const
export type CatalogPage=typeof agentCatalogPages[number][0]

type Provider={id:number;name:string;models_url:string;api_url:string}
type ApiKey={id:string;provider:string;day:number|null;week:number|null;month:number|null;credits:number|null}
type Model={id:number;identifier:string;name:string|null;provider:string;context:number|null;output:number|null;input_modalities:string[]|null;output_modalities:string[]|null;input_cost:string|number|null;output_cost:string|number|null}
const format=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:12})
const number=(value:number|null)=>typeof value==='number'&&Number.isFinite(value)?format.format(value):'—'
const price=(value:Model['input_cost'])=>value===null||value===''||!Number.isFinite(Number(value))?'—':format.format(Number(value))+' $'
const modalities=(value:Model['input_modalities'])=>Array.isArray(value)?value.filter(item=>typeof item==='string').join(', '):''

export function AgentNavigation(){
  return <nav className="project-tabs" aria-label="Agents">
    <Link to="/agents" activeOptions={{exact:true}} className="project-home-link" aria-label="Accueil des agents" title="Accueil des agents">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg>
    </Link>
    {agentCatalogPages.map(([page,label])=><Link key={page} to={'/agents/'+page}>{label}</Link>)}
  </nav>
}

function CatalogTable({title,columns,rows,actions,pending,error,empty}:{title:string;columns:readonly string[];rows:ReactNode;actions?:ReactNode;pending:boolean;error:Error|null;empty:boolean}){
  return <>
    <section className="project-home project-forges-page">
      <div className="section-heading"><div className="project-identity">{actions}<h1>{title}</h1></div></div>
    </section>
    {error&&<p role="alert">{error.message}</p>}
    {pending&&<p role="status">Chargement…</p>}
    <div className="table-wrap"><table className="monitor-table" aria-label={title}>
      <thead><tr>{columns.map(column=><th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{rows}</tbody>
    </table>{!pending&&!error&&empty&&<p className="empty">Aucune entrée.</p>}</div>
  </>
}

function AddOverview({title,children,submit,onClose}:{title:string;children:ReactNode;submit:(values:FormData)=>Promise<unknown>;onClose?:()=>void}){
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
    <button className="add-project" type="button" aria-label={title} title={title} onClick={()=>dialog.current?.showModal()}>+</button>
    <dialog ref={dialog} className="lifecycle-dialog" onCancel={event=>{if(pending)event.preventDefault()}}
      onClose={()=>{form.current?.reset();setError('');onClose?.()}}>
      <h2>{title}</h2>
      <form ref={form} className="settings-form" onSubmit={event=>void save(event)}>
        {children}
        {error&&<p role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-button" disabled={pending} onClick={()=>dialog.current?.close()}>Annuler</button>
          <button type="submit" disabled={pending}>{pending?'Enregistrement…':'Ajouter'}</button>
        </div>
      </form>
    </dialog>
  </>
}

const loadProviders=()=>api<{providers:Provider[]}>(providerPath)

function ProviderCatalog(){
  const query=useQuery({queryKey:[providerPath],queryFn:loadProviders,networkMode:'always'})
  const client=useQueryClient()
  const rows=query.data?.providers??[]
  const columns=['Fournisseur','Liste des Modèles','URL API']
  async function add(values:FormData){
    const provider=await api<Provider>(providerPath,Object.fromEntries(values))
    client.setQueryData<{providers:Provider[]}>([providerPath],state=>({
      providers:[...(state?.providers??[]).filter(row=>row.id!==provider.id),provider].sort((left,right)=>left.name.localeCompare(right.name,'fr')),
    }))
    await client.invalidateQueries({queryKey:[modelPath]})
  }
  return <CatalogTable title="Fournisseurs" columns={columns} pending={query.isPending} error={query.error} empty={!rows.length}
    actions={<AddOverview title="Ajouter un fournisseur" submit={add}>
      <label>Fournisseur<input name="name" required maxLength={160}/></label>
      <label>Liste des Modèles (facultatif)<input name="models_url" type="url" maxLength={2048}/></label>
      <label>URL API<input name="api_url" type="url" maxLength={2048} required/></label>
    </AddOverview>}
    rows={rows.map(row=><tr key={row.id}><td data-label={columns[0]}>{row.name}</td><td data-label={columns[1]}>{row.models_url||'—'}</td><td data-label={columns[2]}>{row.api_url}</td></tr>)}/>
}

function KeyCatalog(){
  const query=useQuery({queryKey:[keyPath],queryFn:()=>api<{keys:ApiKey[]}>(keyPath),networkMode:'always'})
  const providers=useQuery({queryKey:[providerPath],queryFn:loadProviders,networkMode:'always'})
  const [visible,setVisible]=useState(false)
  const [selected,setSelected]=useState<ApiKey|null>(null)
  const confirm=useRef<HTMLDialogElement>(null)
  const client=useQueryClient()
  const remove=useMutation({
    mutationFn:(id:string)=>api(keyPath+'/remove',{id}),
    networkMode:'always',
    onSuccess:(_response,id)=>{
      client.setQueryData<{keys:ApiKey[]}>([keyPath],state=>({keys:(state?.keys??[]).filter(row=>row.id!==id)}))
      confirm.current?.close()
    },
  })
  const rows=query.data?.keys??[]
  const columns=['Fournisseurs','Quota Jour','Quota Semaine','Quota Mois','Crédits','Actions']
  async function add(values:FormData){
    const key=await api<ApiKey>(keyPath,{provider_id:Number(values.get('provider_id')),key:values.get('key')})
    client.setQueryData<{keys:ApiKey[]}>([keyPath],state=>({
      keys:[...(state?.keys??[]).filter(row=>row.id!==key.id),key].sort((left,right)=>left.provider.localeCompare(right.provider,'fr')),
    }))
  }
  return <>
    <CatalogTable title="Clés API" columns={columns} pending={query.isPending} error={query.error} empty={!rows.length}
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
      </AddOverview>}
      rows={rows.map(row=><tr key={row.id}>
        <td data-label={columns[0]}>{row.provider}</td>{[row.day,row.week,row.month,row.credits].map((value,index)=><td key={columns[index+1]} data-label={columns[index+1]}>{number(value)}</td>)}
        <td data-label="Actions"><button type="button" className="lifecycle-icon danger" aria-label={'Supprimer une clé API de '+row.provider}
          onClick={()=>{remove.reset();setSelected(row);confirm.current?.showModal()}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>
        </button></td>
      </tr>)}/>
    <dialog className="lifecycle-dialog deletion-dialog" ref={confirm} onCancel={event=>{if(remove.isPending)event.preventDefault()}}>
      <h2>Supprimer la clé API</h2><p>{selected?.provider}</p>
      {remove.error&&<p role="alert">{remove.error.message}</p>}
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={()=>confirm.current?.close()} disabled={remove.isPending}>Annuler</button>
        <button type="button" onClick={()=>{if(selected)remove.mutate(selected.id)}} disabled={remove.isPending||!selected}>Supprimer</button>
      </div>
    </dialog>
  </>
}

function ModelCatalog(){
  const query=useQuery({queryKey:[modelPath],queryFn:()=>api<{models:Model[]}>(modelPath),refetchInterval:60_000,networkMode:'always'})
  const rows=query.data?.models??[]
  const columns=['Modèle','Fournisseur','Contexte','Sortie maximale','Entrées','Sorties','Coût entrée / M','Coût sortie / M']
  return <CatalogTable title="Modèles" columns={columns} pending={query.isPending} error={query.error} empty={!rows.length}
    rows={rows.map(row=><tr key={row.id}>
      <td data-label={columns[0]}>{typeof row.name==='string'&&row.name||row.identifier}<small>{row.identifier}</small></td>
      <td data-label={columns[1]}>{row.provider}</td><td data-label={columns[2]}>{number(row.context)}</td>
      <td data-label={columns[3]}>{number(row.output)}</td><td data-label={columns[4]}>{modalities(row.input_modalities)||'—'}</td>
      <td data-label={columns[5]}>{modalities(row.output_modalities)||'—'}</td><td data-label={columns[6]}>{price(row.input_cost)}</td>
      <td data-label={columns[7]}>{price(row.output_cost)}</td>
    </tr>)}/>
}

export function AgentCatalog({page}:{page:CatalogPage}){
  if(page==='api-keys')return <KeyCatalog/>
  if(page==='providers')return <ProviderCatalog/>
  return <ModelCatalog/>
}
