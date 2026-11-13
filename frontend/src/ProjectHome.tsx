import {useEffect,useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'
import {type Project,type PublicMetadata} from './Projects'

const forges=[['FORGEJO','Forgejo'],['GITHUB','GitHub'],['GITLAB','GitLab']] as const
const suffixes=['BASE_URL','OWNER','REPOSITORY','NAME','BRANCH','SSL_VERIFY']
function metadata(value:unknown):PublicMetadata|undefined{
  if(!value||typeof value!=='object')return
  const data=value as Record<string,unknown>
  if(typeof data.state!=='string'||!Number.isSafeInteger(data.revision)||!data.values||typeof data.values!=='object'||Array.isArray(data.values))return
  if(!Object.values(data.values).every(item=>typeof item==='string'))return
  return data as PublicMetadata
}
export function ProjectHome({project}:{project:Project}){
  const client=useQueryClient();const [status,setStatus]=useState('Connexion au suivi…');const [error,setError]=useState('')
  const snapshot=project.public_metadata;const values=snapshot?.values||{}
  useEffect(()=>{
    const controller=new AbortController();let active=true
    setStatus('Connexion au suivi…');setError('')
    function accept(input:unknown){
      const next=metadata(input);if(!next||!active)return
      client.setQueryData<{projects:Project[]}>(['projects'],old=>old&&({projects:old.projects.map(item=>item.id===project.id&&next.revision>=(item.public_metadata?.revision||0)?{...item,public_metadata:next}:item)}))
    }
    // Le catalogue reste visible pendant la relecture locale et la connexion.
    api<{public_metadata:unknown}>(`projects/${project.id}/refresh`,{}).then(result=>accept(result.public_metadata)).catch(()=>{if(active)setError('La relecture de project.env est temporairement indisponible.')})
    const stream=new ShapeStream({url:new URL('/api/v1/sync/project',location.origin).href,params:{project_id:project.id},signal:controller.signal,onError:()=>{if(active)setStatus('Suivi temporairement indisponible · reconnexion en cours');return {}}})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{for(const row of rows)if(row.id===project.id)accept(row.public_metadata);if(active)setStatus('Suivi en direct · Electric')})
    return ()=>{active=false;unsubscribe();controller.abort()}
  },[project.id,client])
  const types=[...new Set((values.PROJECT_TYPE||'').split(',').map(value=>value.trim()).filter(Boolean))]
  const messages:Record<string,string>={missing:'Le fichier project.env est absent.',unavailable:'Le fichier project.env est illisible.',unsafe:'Le fichier project.env ne peut pas être lu en sécurité.',partial:'Certaines valeurs publiques de project.env sont ambiguës ou non prises en charge.'}
  return <section className="project-home"><div className="section-heading"><div className="project-identity"><h1>{values.PROJECT_NAME||project.name}</h1>{values.PROJECT_VERSION&&<span className="project-version">{values.PROJECT_VERSION}</span>}<div className="project-types" aria-label="Langages et frameworks">{types.map(type=><span className="badge" key={type}>{type}</span>)}</div></div><p role="status" className="live">{status}</p></div><p className="project-path">{project.root}</p>{error&&<p role="alert">{error}</p>}{snapshot?.state&&messages[snapshot.state]&&<p role="status" className="metadata-note">{messages[snapshot.state]}</p>}<div className="agents-grid project-forges">{forges.map(([key,label])=>{const entries=suffixes.map(suffix=>`REMOTE_${key}_${suffix}`).filter(name=>values[name]);return entries.length?<article className="agent-card forge-card" key={key}><h2>{label}</h2><dl>{entries.map(name=><div key={name}><dt>{name}</dt><dd>{name.endsWith('_BASE_URL')?<a href={values[name]} target="_blank" rel="noreferrer">{values[name]}</a>:values[name]}</dd></div>)}</dl></article>:null})}</div></section>
}
