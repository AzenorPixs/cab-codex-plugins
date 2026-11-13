import {useRef,useState} from 'react'
import {Link,useNavigate} from '@tanstack/react-router'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'

export type Project={id:string;identifier:string|null;name:string;root:string;owner_uid:number;owner_gid:number|null;creation_state:string}
type Settings={projects_root:string;projects_user:string;projects_group:string;configured:boolean;error:string|null}
export function ProjectSidebar({projects,selected}:{projects:Project[];selected?:string}){
  return <aside className="project-sidebar"><div className="project-sidebar-heading"><h2>Projets</h2><Link to="/projects/new" className="add-project" aria-label="Créer un projet" title="Créer un projet">+</Link></div><nav aria-label="Liste des projets">{projects.map(project=><Link key={project.id} to="/projects/$projectId" params={{projectId:project.identifier||project.id}} className={selected===project.id?'project-link selected':'project-link'} title={project.root}><span>{project.name||project.root.split('/').pop()}</span>{project.creation_state!=='READY'&&<small>Création à vérifier</small>}</Link>)}{!projects.length&&<p>Aucun projet.</p>}</nav></aside>
}
export function CreateProjectForm(){
  const client=useQueryClient();const navigate=useNavigate();const request=useRef(crypto.randomUUID());const [name,setName]=useState('');const [folder,setFolder]=useState('');const [edited,setEdited]=useState(false)
  const settings=useQuery({queryKey:['projects-settings'],queryFn:()=>api<Settings>('projects/settings')})
  const create=useMutation({mutationFn:()=>api<Project>('projects',{name:name.trim(),folder,request_id:request.current}),onSuccess:async project=>{await client.invalidateQueries({queryKey:['projects']});await navigate({to:'/projects/$projectId',params:{projectId:project.identifier||project.id}})}})
  function newName(value:string){setName(value);if(!edited)setFolder(value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_.-]+/g,'-').replace(/^[^a-z0-9]+|[-.]+$/g,'').slice(0,100));request.current=crypto.randomUUID()}
  if(settings.isPending)return <p role="status">Chargement des réglages des projets…</p>
  if(settings.error)return <p role="alert">{settings.error.message}</p>
  if(!settings.data.configured)return <section><p className="eyebrow">NOUVEAU PROJET</p><h1>Créer un projet</h1><p>Renseignez d’abord le chemin absolu, le compte POSIX et le groupe POSIX dans l’administration.</p><Link to="/administration" className="action-link">Ouvrir l’administration</Link></section>
  return <section className="create-project"><p className="eyebrow">NOUVEAU PROJET</p><h1>Créer un projet</h1><p>Un nouveau dossier sera créé dans la racine configurée, puis le projet sera enregistré dans le catalogue.</p><form onSubmit={event=>{event.preventDefault();create.mutate()}}><label>Nom du projet<input name="project_name" value={name} onChange={event=>newName(event.target.value)} maxLength={120} required disabled={create.isPending}/></label><label>Nom du dossier<input name="project_folder" value={folder} onChange={event=>{setFolder(event.target.value);setEdited(true);request.current=crypto.randomUUID()}} pattern="[A-Za-z0-9][A-Za-z0-9_.-]{0,99}" maxLength={100} required disabled={create.isPending}/></label><div className="project-creation-preview"><p>Dossier : <code>{settings.data.projects_root.replace(/\/$/,'')}/{folder||'nom-du-projet'}</code></p><p>Compte POSIX : <strong>{settings.data.projects_user}</strong> · Groupe POSIX : <strong>{settings.data.projects_group}</strong></p></div>{create.error&&<p role="alert">{create.error.message}</p>}<div className="form-actions"><button type="submit" disabled={create.isPending}>{create.isPending?'Création…':'Créer le projet'}</button><Link to="/projects" className="cancel-project">Annuler</Link></div></form></section>
}
