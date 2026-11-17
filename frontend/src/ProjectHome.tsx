import {ProjectConfigurationEditor} from './ProjectConfigurationEditor'
import {ProjectConfiguration} from './ProjectConfiguration'
import {useEffect,useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'
import {type Project,type PublicMetadata} from './Projects'

function metadata(value:unknown):PublicMetadata|undefined{
  if(!value||typeof value!=='object')return
  const data=value as Record<string,unknown>
  if(typeof data.state!=='string'||!Number.isSafeInteger(data.revision)||!data.values||typeof data.values!=='object'||Array.isArray(data.values))return
  if(!Object.values(data.values).every(item=>typeof item==='string'))return
  return data as PublicMetadata
}
export function ProjectHome({project}:{project:Project}){
  const client=useQueryClient();const [status,setStatus]=useState('');const [error,setError]=useState('')
  const snapshot=project.public_metadata;const values=snapshot?.values||{}
  useEffect(()=>{
    const controller=new AbortController();let active=true
    setStatus('');setError('')
    function accept(input:unknown){
      const next=metadata(input);if(!next||!active)return
      client.setQueryData<{projects:Project[]}>(['projects'],old=>old&&({projects:old.projects.map(item=>item.id===project.id&&next.revision>=(item.public_metadata?.revision||0)?{...item,root:next.project_root||item.root,public_metadata:next}:item)}))
    }
    // Le catalogue reste visible pendant la relecture locale et la connexion.
    api<{public_metadata:unknown}>(`projects/${project.id}/refresh?include_forges=false&include_git=false`,{}).then(result=>{accept(result.public_metadata)}).catch(()=>{if(active)setError('La relecture de project.env est temporairement indisponible.')})
    const stream=new ShapeStream({url:new URL('/api/v1/sync/project',location.origin).href,params:{project_id:project.id},signal:controller.signal,onError:()=>{if(active)setStatus('Suivi temporairement indisponible · reconnexion en cours');return {}}})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{for(const row of rows)if(row.id===project.id)accept(row.public_metadata);if(active)setStatus('')})
    return ()=>{active=false;unsubscribe();controller.abort()}
  },[project.id,client])
  const messages:Record<string,string>={missing:'Le fichier project.env est absent.',unavailable:'Le fichier project.env est illisible.',unsafe:'Le fichier project.env ne peut pas être lu en sécurité.',partial:'Certaines valeurs publiques de project.env sont ambiguës ou non prises en charge.'}
  return <section className="project-home project-forges-page"><div className="section-heading"><div className="project-identity"><h1>{values.PROJECT_NAME||project.name}</h1>{values.PROJECT_VERSION&&<span className="project-version project-release-version">{values.PROJECT_VERSION}</span>}</div>{status&&<p role="status" className="live">{status}</p>}</div>{error&&<p role="alert">{error}</p>}{snapshot?.state&&messages[snapshot.state]&&<p role="status" className="metadata-note">{messages[snapshot.state]}</p>}<div className="agents-grid project-forges"><article className="agent-card forge-card project-configuration-card"><div className="forge-heading"><h2><svg className="forge-logo project-configuration-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.9 7.9 0 0 0 0-3l2-1.5-2-3.5-2.4.9a8 8 0 0 0-2.6-1.5L14 2H10l-.4 2.9A8 8 0 0 0 7 6.4l-2.4-.9-2 3.5 2 1.5a7.9 7.9 0 0 0 0 3l-2 1.5 2 3.5 2.4-.9a8 8 0 0 0 2.6 1.5L10 22h4l.4-2.9a8 8 0 0 0 2.6-1.5l2.4.9 2-3.5z"/></svg>Configuration</h2><ProjectConfigurationEditor project={project} metadataRevision={snapshot?.revision||0}/></div><div className="forge-card-content"><ProjectConfiguration values={values} projectPath={snapshot?.project_root||project.root}/></div></article></div></section>
}
