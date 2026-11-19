import {useEffect,useRef,useState,type FormEvent} from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient,QueryClientProvider,useQuery,useQueryClient} from '@tanstack/react-query'
import {createRootRoute,createRoute,createRouter,RouterProvider,Link,Outlet,useSearch,useParams,useRouterState,useNavigate,Navigate} from '@tanstack/react-router'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'
import {AppearanceProvider,DeveloperToolbar,PageAppearance,ThemeToggle} from './Appearance'
import {GitMonitorSettings} from './GitMonitorSettings'
import {ConfigurationAccess,AdministrationShell} from './Administration'
import {ProjectSidebar,CreateProjectForm,type Project} from './Projects'
import {ProjectHome} from './ProjectHome'
import {ProjectForges} from './ProjectForges'
import {UpdateBadge,HomeVersionCheck,SystemUpdatePage} from './SystemUpdate'
import {RunView,stageLabel} from './RunView'
import {SessionActions,SessionArchives,useEvaluations,runStateLabel} from './SessionLifecycle'
import {McpConnectionsProvider,McpVersions} from './McpConnections'
import {CabVersionProvider,useCabVersion} from './CabVersion'
import {Notifications} from './Notifications'
import './style.css'

type Health={state:string;initialized:boolean;version:string;csrf_token:string}
type Session={project_id:string;run_id:string;session_id:string;mode:string;state:string;suspension:string;archived:boolean;change:string;generation:number|string;updated:string;stage:number|null;tasks_done:number|null;tasks_total:number|null}
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}})
function Layout(){
  const header=useRef<HTMLElement>(null)
  const cabVersion=useCabVersion()
  const pathname=useRouterState({select:state=>state.location.pathname})
  useEffect(()=>{const node=header.current;if(!node)return;const resize=new ResizeObserver(()=>document.documentElement.style.setProperty('--app-header-height',node.getBoundingClientRect().height+'px'));resize.observe(node);return ()=>resize.disconnect()},[])
  return <><PageAppearance path={pathname}/><header ref={header}><div className="brand-group"><Link to="/" reloadDocument activeOptions={{exact:true}} className="brand">CAB <span>{cabVersion||''}</span></Link><UpdateBadge/><nav className="primary-links" aria-label="Navigation principale"><Link to="/" reloadDocument activeOptions={{exact:true}} className="header-control home-link" aria-label="Revenir à l’accueil" title="Accueil"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg></Link><Link to="/administration">Administration</Link><Link to="/agents">Agents</Link><Link to="/projects">Projets</Link></nav></div><nav className="header-navigation" aria-label="Outils"><McpVersions header/><DeveloperToolbar/><a href="/api/v1/docs" className="api-link">API</a><Notifications/><ThemeToggle/></nav></header><main className={pathname.startsWith('/administration')||pathname.startsWith('/projects')||pathname==='/agents'||pathname.startsWith('/agents/')?'workspace-main':undefined}><Outlet/></main></>
}

function Gate({children}:{children:React.ReactNode}){
  const health=useQuery({queryKey:['health'],queryFn:()=>api<Health>('health'),refetchInterval:15000})
  if(health.isPending)return <p role="status">Connexion à CAB…</p>
  if(health.error)return <p role="alert">CAB est indisponible. Les sessions et reçus restent protégés.</p>
  if(!health.data.initialized)return <Initialize/>
  if(health.data.state==='DATABASE_UNAVAILABLE')return <p role="alert">La base CAB est indisponible. Aucune réinitialisation n’est effectuée.</p>
  return children
}
function Initialize(){
  const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const form=new FormData(e.currentTarget)
    try{await api('bootstrap',{username:form.get('username'),password:form.get('password')},{'X-CAB-Bootstrap':String(form.get('token'))});await client.invalidateQueries()}catch(error){setError(String(error))}finally{setBusy(false)}
  }
  return <section className="setup"><p className="eyebrow">PREMIÈRE UTILISATION</p><h1>Initialiser CAB</h1><p>La validation de ce parcours crée la base CAB et son compte administrateur. Aucune session de codage ne démarre automatiquement.</p><p>L’administrateur de la machine obtient le code d'initialisation avec la commande <code>sudo cab bootstrap-token</code>.</p><form onSubmit={submit}><label>Code d’initialisation<input name="token" type="password" required autoComplete="off"/></label><label>Compte administrateur<input name="username" required autoComplete="username" pattern="[A-Za-z0-9_.-]{1,80}"/></label><label>Mot de passe<input name="password" type="password" autoComplete="new-password"/></label>{error&&<p role="alert">{error}</p>}<button disabled={busy}>{busy?'Initialisation en cours…':'Initialiser la plateforme'}</button></form></section>
}
function Login(){const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const form=new FormData(e.currentTarget);try{await api('login',{username:form.get('username'),password:form.get('password')});await api<Health>('health');await client.invalidateQueries()}catch(error){setError(String(error))}finally{setBusy(false)}}
  return <section className="setup"><p className="eyebrow">ACCÈS ADMINISTRATEUR</p><h1>Connexion à CAB</h1><form onSubmit={submit}><label>Compte<input name="username" required autoComplete="username"/></label><label>Mot de passe<input name="password" type="password" autoComplete="current-password"/></label>{error&&<p role="alert">{error}</p>}<button disabled={busy}>Se connecter</button></form></section>
}
function Projects({children}:{children:(projects:Project[])=>React.ReactNode}){
  const query=useQuery({queryKey:['projects'],queryFn:()=>api<{projects:Project[]}>('projects')})
  if(query.isPending)return <p role="status">Chargement des projets…</p>
  if(query.error)return <Login/>
  return children(query.data.projects)
}
function SessionRows({project,rows,showProject}:{project:Project;rows:Session[];showProject:boolean}){
  const evaluations=useEvaluations(project.id)
  return <>{rows.map(row=><tr key={`${project.id}:${row.run_id}`}>{showProject&&<td data-label="Projets"><Link className="text-button" to="/projects/$projectId" params={{projectId:project.identifier||project.id}}>{project.identifier||project.id}</Link></td>}<td data-label="RUN / Session"><Link className="text-button" to="/projects/$projectId/runs/$runId" params={{projectId:project.identifier||project.id,runId:row.run_id}}>{row.run_id}</Link><small>{row.session_id}</small></td><td data-label="Change">{row.change}</td><td data-label="Profil">{row.mode==='service'?'Service':row.mode==='piloted'?'Pilotée':'Directe'}</td><td data-label="État"><span className="badge">{runStateLabel(row.state)}</span>{row.suspension&&<small className="protection-label">{row.suspension}</small>}</td><td data-label="Étape">{stageLabel(row.stage)}</td><td data-label="Tâches réalisées">{row.mode==='service'?'Sans objet':row.tasks_total===null?'—':`${row.tasks_done}/${row.tasks_total}`}</td><td data-label="Actualisation">{new Date(row.updated).toLocaleString('fr-FR')}</td><td data-label="Actions"><SessionActions projectId={project.id} runId={row.run_id} evaluation={evaluations.data?.evaluations.find(item=>item.run_id===row.run_id)}/></td></tr>)}</>
}
function SessionList({project,projects=[]}:{project?:Project;projects?:Project[]}){
  const [rows,setRows]=useState<Session[]>([]),[status,setStatus]=useState(''),[page,setPage]=useState(1)
  useEffect(()=>{
    const controller=new AbortController();setRows([]);setStatus('')
    const stream=new ShapeStream({url:new URL(project?'/api/v1/sync/sessions':'/api/v1/sync/project-sessions',location.origin).href,params:project?{project_id:project.id}:undefined,signal:controller.signal,onError:()=>{setStatus('Suivi temporairement indisponible · reconnexion en cours');return {}}})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{setRows(rows.map(row=>({project_id:String(row.project_id||project?.id||''),run_id:String(row.run_id),session_id:String(row.session_id),mode:String(row.mode),state:String(row.state),suspension:String(row.suspension||''),archived:row.archived===true||String(row.archived)==='true',change:String(row.change),generation:String(row.generation),updated:String(row.updated),stage:row.stage==null?null:Number(row.stage),tasks_done:row.tasks_done==null?null:Number(row.tasks_done),tasks_total:row.tasks_total==null?null:Number(row.tasks_total)})));setStatus('')})
    return ()=>{unsubscribe();controller.abort()}
  },[project?.id])
  const available=project?[project]:projects
  const all=available.flatMap(value=>rows.filter(row=>!row.archived&&row.project_id===value.id).map(row=>({project:value,row})))
  const pages=Math.max(1,Math.ceil(all.length/10)),current=Math.min(page,pages)
  const visible=all.slice((current-1)*10,current*10)
  const groups=available.map(value=>({project:value,rows:visible.filter(item=>item.project.id===value.id).map(item=>item.row)})).filter(value=>value.rows.length)
  useEffect(()=>setPage(1),[project?.id])
  useEffect(()=>{if(page>pages)setPage(pages)},[page,pages])
  return <><div className="section-heading"><div><p className="eyebrow">SESSIONS DE CODAGE EN COURS</p></div>{status&&<p role="status" className="live">{status}</p>}</div><div className="table-wrap"><table><thead><tr>{!project&&<th>Projets</th>}<th>RUN / Session</th><th>Change</th><th>Profil</th><th>État</th><th>Étape</th><th>Tâches réalisées</th><th>Actualisation</th><th>Actions</th></tr></thead><tbody>{groups.map(group=><SessionRows key={group.project.id} project={group.project} rows={group.rows} showProject={!project}/>)}</tbody></table>{!groups.length&&<p className="empty">{project?'Aucune session pour ce projet.':'Aucune session pour les projets accessibles.'}</p>}</div><nav className="git-overview-controls" aria-label="Pagination des sessions"><button type="button" disabled={current<=1} onClick={()=>setPage(1)}>Premier</button><button type="button" disabled={current<=1} onClick={()=>setPage(current-1)}>Précédent</button><span>Page {current} / {pages} · {all.length} session{all.length>1?'s':''}</span><button type="button" disabled={current>=pages} onClick={()=>setPage(current+1)}>Suivant</button><button type="button" disabled={current>=pages} onClick={()=>setPage(pages)}>Dernier</button></nav></>
}
function AllProjectSessions({projects,archives=false}:{projects:Project[];archives?:boolean}){
  return <div className="projects-layout"><ProjectSidebar projects={projects}/><section className="project-content"><ProjectsNavigation/><section className="project-home project-forges-page"><div className="section-heading"><div className="project-identity"><h1>{archives?'Archives':'Sessions'}</h1></div></div></section>{archives?<SessionArchives projects={projects}/>:<SessionList projects={projects}/>}</section></div>
}
function ProjectRunScreen({projects}:{projects:Project[]}){
  const params=useParams({strict:false});const navigate=useNavigate();const project=projects.find(item=>item.id===params.projectId||item.identifier===params.projectId)
  useEffect(()=>{if(project?.identifier&&params.projectId===project.id&&params.runId)navigate({to:'/projects/$projectId/runs/$runId',params:{projectId:project.identifier,runId:params.runId},replace:true})},[project?.identifier,params.projectId,params.runId])
  return <div className="projects-layout"><ProjectSidebar projects={projects} selected={project?.id}/><section className="project-content">{project&&params.runId?<RunView projectId={project.id} routeId={project.identifier||project.id} runId={params.runId}/>:<h1>Projet introuvable</h1>}</section></div>
}
function ProjectScreen({projects,incidents=false,archives=false,sessions=false,forges=false}:{projects:Project[];incidents?:boolean;archives?:boolean;sessions?:boolean;forges?:boolean}){
  const search=useSearch({strict:false});const params=useParams({strict:false});const requested=params.projectId||search.project;const selected=requested?projects.find(p=>p.id===requested||p.identifier===requested):incidents?projects[0]:undefined
  const navigate=useNavigate()
  useEffect(()=>{if(selected?.identifier&&params.projectId===selected.id)navigate({to:forges?'/projects/$projectId/forges':archives?'/projects/$projectId/archives':incidents?'/projects/$projectId/incidents':sessions?'/projects/$projectId/sessions':'/projects/$projectId',params:{projectId:selected.identifier},replace:true})},[selected?.identifier,params.projectId,incidents,archives,sessions,forges])
  return <div className="projects-layout"><ProjectSidebar projects={projects} selected={selected?.id}/><section className="project-content">{selected?<ProjectNavigation projectId={selected.identifier||selected.id}/>:!requested?<ProjectsNavigation/>:null}{!selected?<section className="project-home project-forges-page">{requested&&<div className="section-heading"><div className="project-identity"><h1>Projet introuvable</h1></div></div>}<p>{requested?'Ce projet est introuvable ou ne fait pas partie de vos projets accessibles.':projects.length?'Sélectionnez un projet dans la colonne de gauche pour ouvrir sa page.':'Aucun projet enregistré. Utilisez le bouton + pour créer votre premier projet.'}</p></section>:selected.creation_state!=='READY'?<section><h1>{selected.name}</h1><p role="alert">La création de ce projet nécessite une vérification. Aucun dossier ne sera recréé automatiquement.</p></section>:forges?<><ProjectPageTitle project={selected} title="Forges"/><ProjectForges project={selected}/></>:archives?<><ProjectPageTitle project={selected} title="Archives"/><SessionArchives projectId={selected.id} routeId={selected.identifier||selected.id}/></>:incidents?<><ProjectPageTitle project={selected} title="Incidents"/><IncidentList project={selected}/></>:sessions?<><ProjectPageTitle project={selected} title="Sessions"/><SessionList project={selected}/></>:<ProjectHome project={selected}/>}</section></div>
}
function ProjectPageTitle({project,title}:{project:Project;title:string}){
  const client=useQueryClient()
  useEffect(()=>{
    const controller=new AbortController();const stream=new ShapeStream({url:new URL('/api/v1/sync/project',location.origin).href,params:{project_id:project.id},signal:controller.signal,onError:()=>({})});const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{for(const row of rows){if(row.id!==project.id||!row.public_metadata||typeof row.public_metadata!=='object')continue;const next=row.public_metadata as Project['public_metadata'];if(!next||typeof next.revision!=='number'||!next.values||typeof next.values!=='object')continue;client.setQueryData<{projects:Project[]}>(['projects'],old=>old&&({projects:old.projects.map(item=>item.id===project.id&&next.revision>=(item.public_metadata?.revision||0)?{...item,public_metadata:next}:item)}))}})
    return ()=>{unsubscribe();controller.abort()}
  },[project.id,client])
  const values=project.public_metadata?.values||{}
  return <section className="project-home project-forges-page"><div className="section-heading"><div className="project-identity"><h1>{values.PROJECT_NAME||project.name}</h1>{values.PROJECT_VERSION&&<span className="project-version project-release-version">{values.PROJECT_VERSION}</span>}<span className="project-version" aria-hidden="true">|</span><span className="project-page-title">{title}</span></div></div></section>
}
function IncidentList({project}:{project:Project}){
  const query=useQuery({queryKey:['incidents',project.id],queryFn:()=>api<{incidents:unknown[]}>('incidents?'+new URLSearchParams({project_id:project.id})),refetchInterval:15000})
  return <section><p className="eyebrow">REGISTRE CCAB</p>{query.error?<p role="alert">Registre indisponible.</p>:query.data?.incidents.length?<pre>{JSON.stringify(query.data.incidents,null,2)}</pre>:<p>Aucun incident ouvert dans ce périmètre.</p>}</section>
}
const rootRoute=createRootRoute({component:Layout})
function ProjectsNavigation(){return <nav className="project-tabs" aria-label="Projets"><Link to="/projects" activeOptions={{exact:true}} className="project-home-link" aria-label="Accueil des projets" title="Accueil des projets"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg></Link><Link to="/projects/archives">Archives</Link><Link to="/projects/sessions">Sessions</Link></nav>}
function ProjectNavigation({projectId}:{projectId:string}){return <nav className="project-tabs" aria-label="Projet"><Link to="/projects/$projectId" params={{projectId}} activeOptions={{exact:true}} className="project-home-link" aria-label="Accueil du projet" title="Accueil du projet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg></Link><Link to="/projects/$projectId/archives" params={{projectId}}>Archives</Link><Link to="/projects/$projectId/forges" params={{projectId}}>Forges</Link><Link to="/projects/$projectId/incidents" params={{projectId}}>Incidents</Link><Link to="/projects/$projectId/sessions" params={{projectId}}>Sessions</Link></nav>}
const projectSearch=(search:Record<string,unknown>):{project?:string}=>typeof search.project==='string'?{project:search.project}:{}
const indexRoute=createRoute({getParentRoute:()=>rootRoute,path:'/',component:HomeVersionCheck})
const projectRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects',validateSearch:projectSearch,component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects}/>}</Projects></Gate>})
const projectDetailRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects}/>}</Projects></Gate>})
const projectForgesRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/forges',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} forges/>}</Projects></Gate>})
const allProjectArchivesRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/archives',component:()=> <Gate><Projects>{projects=><AllProjectSessions projects={projects} archives/>}</Projects></Gate>})
const allProjectSessionsRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/sessions',component:()=> <Gate><Projects>{projects=><AllProjectSessions projects={projects}/>}</Projects></Gate>})
const projectSessionsRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/sessions',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} sessions/>}</Projects></Gate>})
const projectRunRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/runs/$runId',component:()=> <Gate><Projects>{projects=><ProjectRunScreen projects={projects}/>}</Projects></Gate>})
const projectIncidentRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/incidents',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} incidents/>}</Projects></Gate>})
const projectArchivesRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/archives',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} archives/>}</Projects></Gate>})
const newProjectRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/new',component:()=> <Gate><Projects>{projects=><div className="projects-layout"><ProjectSidebar projects={projects}/><div className="project-content"><CreateProjectForm/></div></div>}</Projects></Gate>})
const administrationRoute=createRoute({getParentRoute:()=>rootRoute,path:'/administration',component:()=> <AdministrationShell><section className="project-home project-forges-page"><div className="section-heading"><div className="project-identity"><h1>Administration</h1></div></div></section></AdministrationShell>})
const agentsRoute=createRoute({getParentRoute:()=>rootRoute,path:'/agents',component:()=> <Gate><ConfigurationAccess section="agents" login={<Login/>}/></Gate>})
const agentPages=([['codex','codex_desktop'],['codex-cli','codex'],['opencode','opencode']] as const).map(([path,agent])=>createRoute({getParentRoute:()=>rootRoute,path:`/agents/${path}`,component:()=> <Gate><ConfigurationAccess section="agents" selectedAgent={agent} login={<Login/>}/></Gate>}))
const legacyAgentsRoute=createRoute({getParentRoute:()=>rootRoute,path:'/administration/agents',component:()=> <Navigate to="/agents" replace/>})
const administrationGitRoute=createRoute({getParentRoute:()=>rootRoute,path:'/administration/git',component:()=> <AdministrationShell><Gate><GitMonitorSettings/></Gate></AdministrationShell>})
const administrationUpdateRoute=createRoute({getParentRoute:()=>rootRoute,path:'/administration/update',component:()=> <AdministrationShell><Gate><SystemUpdatePage login={<Login/>}/></Gate></AdministrationShell>})
const administrationPages=(['database','interface','projects','web-server'] as const).map(section=>createRoute({getParentRoute:()=>rootRoute,path:`/administration/${section}`,component:()=> <AdministrationShell><Gate><ConfigurationAccess section={section} login={<Login/>}/></Gate></AdministrationShell>}))
const incidentRoute=createRoute({getParentRoute:()=>rootRoute,path:'/incidents',validateSearch:projectSearch,component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} incidents/>}</Projects></Gate>})
const router=createRouter({routeTree:rootRoute.addChildren([indexRoute,projectRoute,allProjectArchivesRoute,allProjectSessionsRoute,projectDetailRoute,projectForgesRoute,projectSessionsRoute,projectRunRoute,projectIncidentRoute,projectArchivesRoute,newProjectRoute,administrationRoute,agentsRoute,...agentPages,legacyAgentsRoute,administrationGitRoute,administrationUpdateRoute,...administrationPages,incidentRoute])})
declare module '@tanstack/react-router'{interface Register{router:typeof router}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><AppearanceProvider><CabVersionProvider><McpConnectionsProvider><RouterProvider router={router}/></McpConnectionsProvider></CabVersionProvider></AppearanceProvider></QueryClientProvider>)
