import {useEffect,useState} from 'react'
import {Shape,ShapeStream} from '@electric-sql/client'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'
import {newRequestId} from './requestId'

const formats=[['debian','PROJECT_DEBIAN_PACKAGE','Artefact Debian'],['docker','PROJECT_DOCKERED','Artefact Docker']] as const
type Format=typeof formats[number][0]
type Artifact={name:string;tags:string[]}
type Observation={available:boolean;items:Artifact[]}
type Row={forge:string;source:string[];artifacts:Partial<Record<Format,Observation>>}
type Job={id:string;forge:string;state:string;error?:string|null}
type Snapshot={rows:Row[];local_kinds:Format[];jobs:Record<string,Job>}

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
  return {rows,local:query.data?.local_kinds||[],jobs:query.data?.jobs||{},publish}
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
  if(!formats.some(([kind,flag])=>state.local.includes(kind)&&on(values[flag])))return null
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
export function ForgeArtifactStatus({state,forge}:{state:State;forge:string}){
  const job=state.jobs[forge]
  return <>{job&&<p role="status">{jobLabels[job.state]}{job.error==='artifact-forge-tag-missing'?' · Tag de version absent sur la forge':''}</p>}
    {state.publish.error&&state.publish.variables===forge&&<p role="alert">{state.publish.error.message}</p>}</>
}
