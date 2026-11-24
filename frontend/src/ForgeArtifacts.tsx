import {useEffect,useState} from 'react'
import {Shape,ShapeStream} from '@electric-sql/client'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api,ApiError,apiErrorMessage} from './api'
import {ForgeActionOverview} from './ForgeActionOverview'
import {newRequestId} from './requestId'

const formats=[['debian','PROJECT_DEBIAN_PACKAGE','Artefact Debian'],['docker','PROJECT_DOCKERED','Artefact Docker']] as const
type Format=typeof formats[number][0]
type Artifact={name:string;tags:string[];published_at?:string}
type Observation={available:boolean;items:Artifact[];latest?:Artifact|null;chronology_unverified?:boolean}
type Row={forge:string;source:string[];artifacts:Partial<Record<Format,Observation>>}
export type PublicationDiagnostic={phase?:string;tag?:string;missing?:string[];exit_code?:number;http_status?:number;publication_confirmed?:boolean;remaining_count?:number;required_scopes?:string[]}
type Step={key:string;state:string;error?:string;details?:PublicationDiagnostic}
export type ArtifactPublication={kind:Format;forge:string;state:string;at?:string;error?:string;details?:PublicationDiagnostic;step?:string}
type Job={id:string;forge:string;state:string;error?:string|null;details?:PublicationDiagnostic|null;progress?:{kinds:Format[];steps:Step[]}|null;reconcilable?:boolean}
type Snapshot={rows:Row[];jobs:Record<string,Job>}

const busy=(job?:Job)=>job?.state==='PENDING'||job?.state==='RUNNING'
const on=(value?:string)=>['yes','1'].includes((value||'').toLowerCase())

export function useForgeArtifacts(projectId:string){
  const [live,setLive]=useState<{projectId:string;rows:Row[]}|null>(null)
  const queryKey=['forge-artifacts',projectId]
  const path=`projects/${encodeURIComponent(projectId)}/published-artifacts`
  const client=useQueryClient()
  const query=useQuery({
    queryKey,queryFn:()=>api<Snapshot>(path),
    refetchInterval:query=>Object.values(query.state.data?.jobs||{}).some(busy)?1500:15000,
  })
  const publish=useMutation({
    mutationFn:({forge,id}:{forge:string;id:string})=>api<Job>(`${path}/${forge}`,{request_id:id}),
    onSettled:()=>client.invalidateQueries({queryKey}),
  })
  const reconcile=useMutation({
    mutationFn:async ({id,tag}:{id:string;tag:string})=>{
      const inventory=await api<{artifacts:{kind:string;image?:string;image_id?:string;tags?:string[]}[]}>(
        `projects/${encodeURIComponent(projectId)}/artifacts`)
      const image=inventory.artifacts.find(item=>item.kind==='docker'&&item.image_id&&item.tags?.includes(`${item.image}:${tag}`))
      if(!image?.image_id)throw new Error('L’image locale avec le tag de la version doit être disponible pour vérifier la publication.')
      return api<Job>(`${path}/reconcile`,{request_id:id,tag,image_id:image.image_id})
    },
    onSuccess:job=>client.setQueryData(['publication-receipt',path,job.id],job),
    onSettled:()=>client.invalidateQueries({queryKey}),
  })
  useEffect(()=>{
    const controller=new AbortController()
    const stream=new ShapeStream({url:new URL('/api/v1/sync/forge-artifacts',location.origin).href,
      signal:controller.signal,params:{project_id:projectId},onError:()=>{setLive(null);return {}}})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{
      if(controller.signal.aborted)return
      const data=rows.flatMap(row=>typeof row.forge==='string'&&Array.isArray(row.source)&&
        row.artifacts&&typeof row.artifacts==='object'?[{forge:row.forge,source:row.source,artifacts:row.artifacts} as Row]:[])
      setLive({projectId,rows:data})
    })
    return ()=>{unsubscribe();controller.abort()}
  },[projectId])
  const rows=live?.projectId===projectId?live.rows:query.data?.rows||[]
  return {rows,jobs:query.data?.jobs||{},publish,reconcile,path}
}
type State=ReturnType<typeof useForgeArtifacts>

export function PublishedArtifactRows({state,forge,values}:{state:State;forge:string;values:Record<string,string>}){
  const source=['BASE_URL','OWNER','REPOSITORY'].map(field=>values[`REMOTE_${forge}_${field}`]||'')
  const row=state.rows.find(row=>row.forge===forge&&row.source.every((part,index)=>part===source[index]))
  return <>{formats.filter(([,flag])=>on(values[flag])).map(([kind,,label])=>{
    const observed=row?.artifacts[kind]
    const item=observed?.latest
    const tag=item?.tags[0]
    return <div key={kind}><dt>{label}</dt>
      <dd style={{overflowWrap:'anywhere'}}>{item?<>
        {item.name}{tag&&<> · {tag}</>}{item.published_at&&<> · <time dateTime={item.published_at}>
          {new Date(item.published_at).toLocaleString('fr-FR')}</time></>}{!observed?.available&&<small> · Dernière observation</small>}
      </>:observed?.available&&observed.items.length===0?'Aucun observé':observed?.chronology_unverified||observed?.items.length?'Date de publication non vérifiée':'Non vérifié'}</dd>
    </div>
  })}</>
}

const jobLabels:Record<string,string>={PENDING:'En attente',RUNNING:'En cours',COMPLETED:'Réussie',
  FAILED:'Échec',UNKNOWN:'Résultat à vérifier',SKIPPED:'Non exécutée'}
const steps:Record<string,string>={
  configuration:'Vérification de la configuration',inventory:'Inventaire des artefacts locaux',connection:'Préparation de l’accès à la forge',
  'debian-tag':'Debian · Vérification des tags Git','debian-release':'Debian · Envoi et confirmation des paquets',
  'debian-retention':'Debian · Rétention des anciennes publications',
  'docker-prepare':'Docker · Vérification du dépôt, du tag Git et du registre','docker-login':'Docker · Connexion au registre',
  'docker-push':'Docker · Étiquetage et envoi de l’image','docker-confirm':'Docker · Confirmation des tags distants',
  'docker-retention':'Docker · Rétention des anciens tags',
}
const phases:Record<string,string>={
  configuration:'Configuration de la forge',inventory:'Inventaire local',repository:'Lecture du dépôt distant',
  'remote-tag':'Vérification du tag Git distant','registry-configuration':'Configuration du registre Docker',
  'registry-inventory':'Lecture des versions dans le registre de la forge',
  'registry-login':'Connexion au registre Docker','registry-confirmation':'Confirmation des tags du registre',
  'registry-cleanup':'Rétention du registre Docker','debian-cleanup':'Rétention des paquets Debian',
  'local-tag':'Étiquetage de l’image locale','registry-push':'Envoi de l’image Docker','forge-api':'Appel de l’API de la forge',
}

export function PublicationStatus({state}:{state:string}){
  const glyph=state==='COMPLETED'?'✓':state==='FAILED'||state==='UNKNOWN'?'✕':state==='RUNNING'?'…':'–'
  return <span className={`publication-status publication-${state.toLowerCase()}`} aria-label={jobLabels[state]||state} role="img">{glyph}</span>
}

export function PublicationFailure({state,error,details,step,message}:{state:string;error?:string|null;details?:PublicationDiagnostic|null;step?:string;message?:string}){
  return <details className="publication-failure">
    <summary><PublicationStatus state={state}/> {message||(error?apiErrorMessage(error):jobLabels[state])}</summary>
    <dl>
      {step&&<div><dt>Étape</dt><dd>{steps[step]||step}</dd></div>}
      {error&&<div><dt>Code</dt><dd><code>{error}</code></dd></div>}
      {details?.phase&&<div><dt>Opération</dt><dd>{phases[details.phase]||details.phase}</dd></div>}
      {details?.tag&&<div><dt>Tag</dt><dd><code>{details.tag}</code></dd></div>}
      {!!details?.missing?.length&&<div><dt>Éléments manquants</dt><dd>{details.missing.join(', ')}</dd></div>}
      {details?.exit_code!==undefined&&<div><dt>Code de sortie</dt><dd>{details.exit_code}</dd></div>}
      {details?.http_status!==undefined&&<div><dt>Statut HTTP</dt><dd>{details.http_status}</dd></div>}
      {!!details?.required_scopes?.length&&<div><dt>Habilitations du jeton</dt><dd>{details.required_scopes.join(', ')}</dd></div>}
      {details?.publication_confirmed&&<div><dt>Publication</dt><dd>Confirmée avant la rétention</dd></div>}
      {details?.remaining_count!==undefined&&<div><dt>Tags restants</dt><dd>{details.remaining_count}</dd></div>}
      {!step&&!error&&!details&&<div><dt>Diagnostic</dt><dd>Aucun détail supplémentaire disponible.</dd></div>}
    </dl>
  </details>
}

export function PublishForgeArtifacts({state,forge,values,label}:{state:State;forge:string;values:Record<string,string>;label:string}){
  const [request,setRequest]=useState<string|null>(null)
  const current=state.publish.variables?.id===request
  const submitted=current?state.publish.data:undefined
  const observed=state.jobs[forge]
  const matched=observed?.id===request?observed:undefined
  const view=useQuery({
    queryKey:['publication-receipt',state.path,request],
    queryFn:()=>api<Job>(`${state.path}/receipts/${encodeURIComponent(request!)}`),
    enabled:!!request&&!(current&&state.publish.isPending),
    initialData:()=>matched||submitted,
    refetchInterval:query=>!query.state.data&&current&&state.publish.error instanceof ApiError?false:
      !query.state.data||busy(query.state.data)?1200:false,
    retry:false,
  })
  const job=view.data?.id===request?view.data:matched||submitted
  const failed=job?.state==='FAILED'||job?.state==='UNKNOWN'
  const requestError=!job&&current?state.publish.error:null
  const reconciliationError=state.reconcile.variables?.id===request?state.reconcile.error:null
  if(!formats.some(([,flag])=>on(values[flag])))return null
  const publishing=busy(observed)||(state.publish.isPending&&state.publish.variables?.forge===forge)
  const blocker=Object.values(state.jobs).find(row=>busy(row)||row.state==='UNKNOWN')
  const blocked=blocker&&`Publication ${blocker.forge} · ${jobLabels[blocker.state]} · Reçu ${blocker.id}`
  const disabled=state.publish.isPending||state.reconcile.isPending||!!blocker
  return <>
    <span title={blocked}><button type="button" className={`forge-edit git-commit${publishing?' is-loading':''}`}
      title={`Publier les artefacts vers ${label}`} aria-label={`Publier les artefacts vers ${label}`}
      aria-description={blocked}
      aria-busy={publishing} disabled={disabled} onClick={()=>{
        const id=newRequestId()
        setRequest(id)
        state.publish.mutate({forge,id})
      }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 16V3m-5 5 5-5 5 5M4 14v6h16v-6"/>
      </svg>
    </button></span>
    {observed?.reconcilable&&<button type="button" className="forge-edit"
      title={`Vérifier la publication ${label}`} aria-label={`Vérifier la publication ${label}`}
      onClick={()=>{state.reconcile.reset();setRequest(observed.id)}}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>
      </svg>
    </button>}
    {request&&<ForgeActionOverview title={`Overview de publication ${label}`} close={()=>setRequest(null)}>
      <p role="status">{job?jobLabels[job.state]:requestError?'Demande refusée':'Demande de publication en cours'}</p>
      <p className="publication-reference">Reçu <code>{request}</code></p>
      {requestError&&<PublicationFailure state="FAILED" message={requestError.message}
        error={requestError instanceof ApiError?requestError.code:null}
        details={requestError instanceof ApiError?requestError.details as PublicationDiagnostic:null}/>}
      {view.isError&&!requestError&&<p role="alert">Le suivi est temporairement indisponible. La lecture du reçu reprend automatiquement.</p>}
      {job?.progress&&<ol className="publication-steps" aria-label="Étapes de publication">
        {job.progress.steps.map(step=>{
          const state=step.state==='PENDING'&&!busy(job)?'SKIPPED':step.state
          return <li key={step.key}>
            {state==='FAILED'||state==='UNKNOWN'?<PublicationFailure state={state} error={step.error} details={step.details}
              step={step.key} message={`${steps[step.key]||step.key} · ${step.error?apiErrorMessage(step.error):jobLabels[state]}`}/>:
              <><PublicationStatus state={state}/> <span>{steps[step.key]||step.key}</span></>}
          </li>
        })}
      </ol>}
      {failed&&!job?.progress?.steps.some(step=>step.state==='FAILED'||step.state==='UNKNOWN')&&
        <PublicationFailure state={job.state} error={job.error} details={job.details}/>}
      {job?.reconcilable&&<div className="form-actions">
        <button type="button" disabled={state.reconcile.isPending||!values.PROJECT_VERSION}
          onClick={()=>state.reconcile.mutate({id:job.id,tag:values.PROJECT_VERSION})}>
          {state.reconcile.isPending?'Vérification en cours…':'Vérifier les tags distants'}
        </button>
      </div>}
      {reconciliationError&&<PublicationFailure state="FAILED" message={reconciliationError.message}
        error={reconciliationError instanceof ApiError?reconciliationError.code:null}
        details={reconciliationError instanceof ApiError?reconciliationError.details as PublicationDiagnostic:null}/>}
    </ForgeActionOverview>}
  </>
}
