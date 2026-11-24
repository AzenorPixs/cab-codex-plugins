import {useEffect,useRef,useState,type ReactNode} from 'react'
import {useMutation,useQuery} from '@tanstack/react-query'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'
import type {Policy} from './ModelPolicy'

export type Provider={id:number;name:string;api_url:string;models_url:string}
export type CatalogFile={id:string;provider_id:number|null;url:string;valid:boolean;adjusting?:boolean;state:string;error:string;refreshed_at:string|null;attempted_at?:string|null;last_refresh_error?:string}
export type ApiKey={id:string;provider_id:number;day:number|null;week:number|null;month:number|null;credits:number|null;
  valid?:boolean|null;checked_at?:string|null;refreshed_at?:string|null;queued?:boolean;checking?:boolean;
  check_error?:string;metrics_error?:string;metrics?:KeyMetrics}
type FineTuningLimit={model:string;jobs_so_far_today:number|null;max_jobs_per_day:number|null;
  curr_pending_jobs:number|null;max_pending_jobs:number|null}
type KeyMetrics={kind?:'go'|'router';rolling?:number|null;key_budget?:number|null;
  rate_limits?:Record<string,number>;fine_tuning?:FineTuningLimit[];fine_tuning_partial?:boolean}
export type Model={id:number;provider_id:number;identifier:string;name:string|null;context:number|null;output:number|null;
  input_modalities:string[]|null;output_modalities:string[]|null;input_cost:string|number|null;output_cost:string|number|null;
  cache_read_cost:string|number|null;cache_write_cost:string|number|null;cache_write_duration:string|null;
  cache_write_rates?:Record<string,number>}
type CatalogRows={providers:Provider[];keys:ApiKey[];models:Model[];policies:Policy[];files:CatalogFile[]}
type Projection={id:string;kind:string;data:unknown}

function readRows(projections:Projection[]){
  const rows:CatalogRows={providers:[],keys:[],models:[],policies:[],files:[]}
  for(const projection of projections){
    let data=projection.data
    if(typeof data==='string'){
      try{data=JSON.parse(data)}catch{continue}
    }
    if(!data||typeof data!=='object'||!('id' in data))continue
    switch(projection.kind){
      case 'provider':rows.providers.push(data as Provider);break
      case 'key':rows.keys.push(data as ApiKey);break
      case 'model':rows.models.push(data as Model);break
      case 'policy':rows.policies.push(data as Policy);break
      case 'file':rows.files.push(data as CatalogFile);break
    }
  }
  rows.providers.sort((a,b)=>a.name.localeCompare(b.name,'fr')||a.id-b.id)
  rows.policies.sort((a,b)=>a.id-b.id)
  return rows
}

export function useAgentCatalog(){
  const snapshot=useQuery({queryKey:['agent-catalog-display'],
    queryFn:()=>api<{rows:Projection[]}>('administration/agent-catalog-display'),networkMode:'always'})
  const [live,setLive]=useState<CatalogRows|null>(null)
  useEffect(()=>{
    const controller=new AbortController()
    const stream=new ShapeStream({url:new URL('/api/v1/sync/agent-catalog',location.origin).href,
      signal:controller.signal,onError:()=>({})})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>setLive(readRows(rows.map(row=>({
      id:String(row.id),kind:String(row.kind),data:row.data,
    })))))
    return ()=>{unsubscribe();controller.abort()}
  },[])
  return {data:live??readRows(snapshot.data?.rows??[]),pending:!live&&snapshot.isPending,error:live?null:snapshot.error}
}

export function catalogDate(value:string|null|undefined){
  if(!value)return '—'
  const date=new Date(value)
  return Number.isNaN(date.getTime())?'—':date.toLocaleString('fr-FR')
}

export function CatalogDocument({path,title,label,className,accessibleLabel,loadingLabel='Lecture du fichier…'}:{path:string;title:string;label:string;className?:string;accessibleLabel?:string;loadingLabel?:string}){
  const dialog=useRef<HTMLDialogElement>(null)
  const download=useMutation({mutationFn:()=>api<unknown>(path),networkMode:'always'})
  return <>
    <button type="button" className={className??'text-button'} aria-label={accessibleLabel} onClick={()=>{dialog.current?.showModal();download.mutate()}}>{label}</button>
    <dialog className="lifecycle-dialog catalog-document" ref={dialog} aria-label={title} onClose={()=>download.reset()}>
      <h2>{title}</h2>
      {download.isPending&&<p role="status">{loadingLabel}</p>}
      {download.error&&<p role="alert">{download.error.message}</p>}
      {download.isSuccess&&<pre>{JSON.stringify(download.data,null,2)}</pre>}
      <button type="button" onClick={()=>dialog.current?.close()}>Fermer</button>
    </dialog>
  </>
}

export function StateOverview({valid,title,label,children}:{
  valid:boolean;title:string;label:string;children:ReactNode
}){
  const dialog=useRef<HTMLDialogElement>(null)
  return <>
    <button type="button" className={'text-button '+(valid?'catalog-valid':'catalog-invalid')}
      aria-label={label} onClick={()=>dialog.current?.showModal()}>{valid?'✓':'✕'}</button>
    <dialog className="lifecycle-dialog catalog-document" ref={dialog}>
      <h2>{title}</h2>
      {children}
      <button type="button" onClick={()=>dialog.current?.close()}>Fermer</button>
    </dialog>
  </>
}

export function RefreshControl({path,body,busy=false,disabled=false,label}:{
  path:string;body:object;busy?:boolean;disabled?:boolean;label:string
}){
  const refresh=useMutation({mutationFn:()=>api(path,body),networkMode:'always'})
  busy=busy||refresh.isPending
  return <>
    <button className={'lifecycle-icon catalog-refresh'+(busy?' catalog-refreshing':'')} type="button"
      aria-label={busy?'Actualisation en cours':label} title={busy?'Actualisation en cours':label}
      disabled={disabled||busy} onClick={()=>refresh.mutate()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M20 10a8 8 0 1 0-2 7M20 4v6h-6"/>
      </svg>
    </button>
    {refresh.error&&<small role="alert">{refresh.error.message}</small>}
  </>
}

export function CatalogRefresh({source,path,providerId}:{source?:CatalogFile;path:string;providerId?:number}){
  const busy=source?.adjusting||['queued','downloading','applying'].includes(source?.state??'')
  return <>
    <RefreshControl path={path} body={providerId===undefined?{}:{id:providerId}} busy={busy}
      disabled={!source?.url} label="Actualiser le fichier"/>
    {source?.state==='error'&&<small role="status">{source.error==='agent-catalog-key-required'
      ?'Ajoutez une clé API pour actualiser le catalogue.':'Dernière actualisation en échec'}</small>}
  </>
}

export function CatalogValidity({source,path,title}:{source?:CatalogFile;path?:string;title:string}){
  if(source?.valid&&path)return <CatalogDocument path={path} title={title} label="✓" className="text-button catalog-valid" accessibleLabel="Fichier présent et valide. Consulter le fichier."/>
  return <span className={source?.valid?'catalog-valid':'catalog-invalid'} role="img"
    aria-label={source?.valid?'Fichier présent et valide':'Fichier absent ou invalide'}>{source?.valid?'✓':'✕'}</span>
}

const completionPath='administration/agent-completion-catalog'

export function CompletionCatalog(){
  const catalog=useAgentCatalog()
  const source=catalog.data.files.find(row=>row.id==='completion')
  const [draft,setDraft]=useState<string|null>(null)
  const url=draft??source?.url??''
  const save=useMutation({mutationFn:(value:string)=>api(completionPath,{url:value}),networkMode:'always',
    onSuccess:()=>setDraft(null)})
  return <section className="agent-card">
    <h2>Catalogue de modèles de complétion</h2>
    {catalog.error&&<p role="alert">{catalog.error.message}</p>}
    <form onSubmit={event=>{event.preventDefault();save.mutate(url)}}>
      <div className="catalog-completion-controls">
        <label>URL<input type="url" value={url} onChange={event=>setDraft(event.target.value)} disabled={!source}/></label>
        <CatalogValidity source={source} path={completionPath+'/file'} title="Catalogue de modèles de complétion"/>
      </div>
      <div className="catalog-completion-controls">
        <span>Dernier rafraîchissement {catalogDate(source?.refreshed_at)}</span>
        <CatalogRefresh source={source} path={completionPath+'/refresh'}/>
      </div>
      <button type="submit" disabled={draft===null||save.isPending}>Enregistrer l’URL</button>
      {save.error&&<p role="alert">{save.error.message}</p>}
    </form>
  </section>
}
