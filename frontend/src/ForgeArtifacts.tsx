import {useEffect,useRef,useState} from 'react'
import {Shape,ShapeStream} from '@electric-sql/client'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api,ApiError,apiErrorMessage} from './api'
import {ForgeActionOverview} from './ForgeActionOverview'
import {newRequestId} from './requestId'

const formats=[['debian','PROJECT_DEBIAN_PACKAGE','Artefact Debian'],['docker','PROJECT_DOCKERED','Artefact Docker']] as const
type Format=typeof formats[number][0]
type Artifact={name:string;tags:string[]}
type Observation={available:boolean;items:Artifact[]}
type Row={forge:string;source:string[];artifacts:Partial<Record<Format,Observation>>}
type Diagnostic={phase?:string;tag?:string;missing?:string[];exit_code?:number;http_status?:number}
type Job={id:string;forge:string;state:string;error?:string|null;details?:Diagnostic|null}
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
    mutationFn:(forge:string)=>api<Job>(`${path}/${forge}`,{request_id:newRequestId()}),
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
  return {rows,jobs:query.data?.jobs||{},publish}
}
type State=ReturnType<typeof useForgeArtifacts>

export function PublishedArtifactRows({state,forge,values}:{state:State;forge:string;values:Record<string,string>}){
  const source=['BASE_URL','OWNER','REPOSITORY'].map(field=>values[`REMOTE_${forge}_${field}`]||'')
  const row=state.rows.find(row=>row.forge===forge&&row.source.every((part,index)=>part===source[index]))
  return <>{formats.filter(([,flag])=>on(values[flag])).flatMap(([kind,,label])=>{
    const observed=row?.artifacts[kind]
    if(!observed?.items.length)return [<div key={kind}><dt>{label}</dt><dd>{observed?.available?'Aucun observé':'Non vérifié'}</dd></div>]
    return observed.items.map(item=><div key={`${kind}:${item.name}`}><dt>{label}</dt>
      <dd style={{overflowWrap:'anywhere'}}>{item.name} · {item.tags.join(', ')}{!observed.available&&<small> · Dernière observation</small>}</dd>
    </div>)
  })}</>
}

export function PublishForgeArtifacts({state,forge,values,label}:{state:State;forge:string;values:Record<string,string>;label:string}){
  if(!formats.some(([,flag])=>on(values[flag])))return null
  const job=state.jobs[forge]
  const publishing=busy(job)||(state.publish.isPending&&state.publish.variables===forge)
  const disabled=state.publish.isPending||Object.values(state.jobs).some(job=>busy(job)||job.state==='UNKNOWN')
  return <button type="button" className={`forge-edit git-commit${publishing?' is-loading':''}`}
    title={`Publier les artefacts vers ${label}`} aria-label={`Publier les artefacts vers ${label}`}
    aria-busy={publishing} disabled={disabled} onClick={()=>state.publish.mutate(forge)}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 16V3m-5 5 5-5 5 5M4 14v6h16v-6"/>
    </svg>
  </button>
}

const jobLabels:Record<string,string>={PENDING:'Publication en attente',RUNNING:'Publication en cours',
  COMPLETED:'Publication confirmée',FAILED:'Publication refusée ou échouée',UNKNOWN:'Résultat de publication à vérifier'}
const phases:Record<string,string>={
  configuration:'Configuration de la forge',inventory:'Inventaire local',repository:'Lecture du dépôt distant',
  'remote-tag':'Vérification du tag Git distant','registry-configuration':'Configuration du registre Docker',
  'registry-login':'Connexion au registre Docker','registry-inspect':'Vérification du tag Docker distant',
  'local-tag':'Étiquetage de l’image locale','registry-push':'Envoi de l’image Docker','forge-api':'Appel de l’API de la forge',
}
export function ForgeArtifactStatus({state,forge,label}:{state:State;forge:string;label:string}){
  const [open,setOpen]=useState(false)
  const shown=useRef<string|Error|null>(null)
  const submitted=state.publish.data?.forge===forge?state.publish.data:undefined
  const observed=state.jobs[forge]
  const job=submitted&&observed?.id!==submitted.id?submitted:observed
  const failure=job?.state==='FAILED'||job?.state==='UNKNOWN'?job:undefined
  const error=state.publish.variables===forge?state.publish.error:null
  const trigger=error||(failure?.id===submitted?.id&&failure?failure.id:null)
  useEffect(()=>{
    if(trigger&&shown.current!==trigger){shown.current=trigger;setOpen(true)}
  },[trigger])
  const details=error instanceof ApiError?error.details as Diagnostic|undefined:failure?.details
  return <>
    {(error||failure)?<button type="button" className="agent-config-link" onClick={()=>setOpen(true)}>
      {error?'Demande de publication refusée':jobLabels[failure!.state]}
    </button>:job&&<p role="status">{jobLabels[job.state]}</p>}
    {open&&(error||failure)&&<ForgeActionOverview title={`Overview de publication ${label}`} close={()=>setOpen(false)}>
      <p role="alert">{error?.message||(failure?.error?apiErrorMessage(failure.error):'CAB ne dispose pas du détail de cette tentative.')}</p>
      <dl>
        <div><dt>État</dt><dd>{error?'Demande refusée':jobLabels[failure!.state]}</dd></div>
        {!error&&failure&&<div><dt>Reçu</dt><dd><code>{failure.id}</code></dd></div>}
        {details?.phase&&<div><dt>Étape</dt><dd>{phases[details.phase]||details.phase}</dd></div>}
        {details?.tag&&<div><dt>Tag</dt><dd><code>{details.tag}</code></dd></div>}
        {!!details?.missing?.length&&<div><dt>Éléments manquants</dt><dd>{details.missing.join(', ')}</dd></div>}
        {details?.exit_code!==undefined&&<div><dt>Code de sortie</dt><dd>{details.exit_code}</dd></div>}
        {details?.http_status!==undefined&&<div><dt>Statut HTTP</dt><dd>{details.http_status}</dd></div>}
      </dl>
    </ForgeActionOverview>}
  </>
}
