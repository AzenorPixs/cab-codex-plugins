import {useEffect,useRef,useState,type FormEvent} from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query'
import {createRootRoute,createRoute,createRouter,RouterProvider,Link,Outlet,useSearch,useParams,useRouterState} from '@tanstack/react-router'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'
import {AppearanceProvider,ThemeToggle} from './Appearance'
import {ConfigurationAccess,AdministrationShell} from './Administration'
import {ProjectSidebar,CreateProjectForm,type Project} from './Projects'
import {RunView,stageLabel} from './RunView'
import './style.css'

type Health={state:string;initialized:boolean;version:string;csrf_token:string}
type Session={run_id:string;session_id:string;mode:string;state:string;change:string;generation:number|string;updated:string;stage:number|null;tasks_done:number|null;tasks_total:number|null}
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}})
function Layout(){
  const header=useRef<HTMLElement>(null)
  const pathname=useRouterState({select:state=>state.location.pathname})
  useEffect(()=>{const node=header.current;if(!node)return;const resize=new ResizeObserver(()=>document.documentElement.style.setProperty('--app-header-height',node.getBoundingClientRect().height+'px'));resize.observe(node);return ()=>resize.disconnect()},[])
  return <><header ref={header}><div className="brand-group"><Link to="/" reloadDocument activeOptions={{exact:true}} className="brand">CAB <span>3.0.3</span></Link><nav className="primary-links" aria-label="Navigation principale"><Link to="/" reloadDocument activeOptions={{exact:true}} className="header-control home-link" aria-label="Revenir à l’accueil" title="Accueil"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg></Link><Link to="/administration">Administration</Link><Link to="/projects">Projets</Link></nav></div><nav className="header-navigation" aria-label="Outils"><a href="/api/v1/docs" className="api-link">API</a><ThemeToggle/></nav></header><main className={pathname.startsWith('/administration')||pathname.startsWith('/projects')?'workspace-main':undefined}><Outlet/></main></>
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
function SessionList({project}:{project:Project}){
  const [rows,setRows]=useState<Session[]>([]);const [status,setStatus]=useState('Connexion au suivi…')
  useEffect(()=>{
    const controller=new AbortController();setRows([]);setStatus('Connexion au suivi…')
    const stream=new ShapeStream({url:new URL('/api/v1/sync/sessions',location.origin).href,params:{project_id:project.id},signal:controller.signal,onError:()=>{setStatus('Suivi temporairement indisponible · reconnexion en cours');return {}}})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{setRows(rows.map(row=>({run_id:String(row.run_id),session_id:String(row.session_id),mode:String(row.mode),state:String(row.state),change:String(row.change),generation:String(row.generation),updated:String(row.updated),stage:row.stage==null?null:Number(row.stage),tasks_done:row.tasks_done==null?null:Number(row.tasks_done),tasks_total:row.tasks_total==null?null:Number(row.tasks_total)})));setStatus('Suivi en direct · Electric')})
    return ()=>{unsubscribe();controller.abort()}
  },[project.id])
  return <><div className="section-heading"><div><p className="eyebrow">COORDINATION AUTONOME</p><h1>Sessions de codage</h1></div><p role="status" className="live">{status}</p></div><p className="project-path">{project.root}</p><div className="table-wrap"><table><thead><tr><th>RUN / Session</th><th>Change</th><th>Profil</th><th>État</th><th>Étape</th><th>Tâches réalisées</th><th>Actualisation</th></tr></thead><tbody>{rows.map(row=><tr key={row.run_id}><td><Link className="text-button" to="/projects/$projectId/runs/$runId" params={{projectId:project.id,runId:row.run_id}}>{row.run_id}</Link><small>{row.session_id}</small></td><td>{row.change}</td><td>{row.mode==='piloted'?'Pilotée':'Directe'}</td><td><span className="badge">{row.state}</span></td><td>{stageLabel(row.stage)}</td><td>{row.tasks_total===null?'—':`${row.tasks_done}/${row.tasks_total}`}</td><td>{new Date(row.updated).toLocaleString('fr-FR')}</td></tr>)}</tbody></table>{!rows.length&&<p className="empty">Aucune session pour ce projet.</p>}</div></>
}
function ProjectRunScreen({projects}:{projects:Project[]}){
  const params=useParams({strict:false});const project=projects.find(item=>item.id===params.projectId)
  return <div className="projects-layout"><ProjectSidebar projects={projects} selected={project?.id}/><section className="project-content">{project&&params.runId?<RunView projectId={project.id} runId={params.runId}/>:<h1>Projet introuvable</h1>}</section></div>
}
function ProjectScreen({projects,incidents=false}:{projects:Project[];incidents?:boolean}){
  const search=useSearch({strict:false});const params=useParams({strict:false});const requested=params.projectId||search.project;const selected=requested?projects.find(p=>p.id===requested):incidents?projects[0]:undefined
  return <div className="projects-layout"><ProjectSidebar projects={projects} selected={selected?.id}/><section className="project-content">{selected&&<ProjectNavigation projectId={selected.id}/>}<div className="project-page-heading">{selected&&<p className="eyebrow">{selected.name||selected.root.split('/').pop()}</p>}</div>{!selected?<section><h1>{requested?'Projet introuvable':'Projets'}</h1><p>{requested?'Ce projet est introuvable ou ne fait pas partie de vos projets accessibles.':projects.length?'Sélectionnez un projet dans la colonne de gauche pour ouvrir sa page.':'Aucun projet enregistré. Utilisez le bouton + pour créer votre premier projet.'}</p></section>:selected.creation_state!=='READY'?<section><h1>{selected.name}</h1><p role="alert">La création de ce projet nécessite une vérification. Aucun dossier ne sera recréé automatiquement.</p></section>:incidents?<IncidentList project={selected}/>:<SessionList project={selected}/>}</section></div>
}
function IncidentList({project}:{project:Project}){
  const query=useQuery({queryKey:['incidents',project.id],queryFn:()=>api<{incidents:unknown[]}>('incidents?'+new URLSearchParams({project_id:project.id})),refetchInterval:15000})
  return <section><p className="eyebrow">REGISTRE CCAB</p><h1>Incidents</h1><p>{project.root}</p>{query.error?<p role="alert">Registre indisponible.</p>:query.data?.incidents.length?<pre>{JSON.stringify(query.data.incidents,null,2)}</pre>:<p>Aucun incident ouvert dans ce périmètre.</p>}</section>
}
const rootRoute=createRootRoute({component:Layout})
function ProjectNavigation({projectId}:{projectId:string}){return <nav className="project-tabs" aria-label="Projet"><Link to="/projects/$projectId" params={{projectId}} activeOptions={{exact:true}}>Sessions</Link><Link to="/projects/$projectId/incidents" params={{projectId}}>Incidents</Link></nav>}
const projectSearch=(search:Record<string,unknown>):{project?:string}=>typeof search.project==='string'?{project:search.project}:{}
const indexRoute=createRoute({getParentRoute:()=>rootRoute,path:'/',component:()=>null})
const projectRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects',validateSearch:projectSearch,component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects}/>}</Projects></Gate>})
const projectDetailRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects}/>}</Projects></Gate>})
const projectRunRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/runs/$runId',component:()=> <Gate><Projects>{projects=><ProjectRunScreen projects={projects}/>}</Projects></Gate>})
const projectIncidentRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/incidents',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} incidents/>}</Projects></Gate>})
const newProjectRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/new',component:()=> <Gate><Projects>{projects=><div className="projects-layout"><ProjectSidebar projects={projects}/><div className="project-content"><CreateProjectForm/></div></div>}</Projects></Gate>})
const administrationRoute=createRoute({getParentRoute:()=>rootRoute,path:'/administration',component:()=> <AdministrationShell><Gate><ConfigurationAccess section="agents" login={<Login/>}/></Gate></AdministrationShell>})
const administrationPages=(['agents','database','interface','projects','web-server'] as const).map(section=>createRoute({getParentRoute:()=>rootRoute,path:`/administration/${section}`,component:()=> <AdministrationShell><Gate><ConfigurationAccess section={section} login={<Login/>}/></Gate></AdministrationShell>}))
const incidentRoute=createRoute({getParentRoute:()=>rootRoute,path:'/incidents',validateSearch:projectSearch,component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} incidents/>}</Projects></Gate>})
const router=createRouter({routeTree:rootRoute.addChildren([indexRoute,projectRoute,projectDetailRoute,projectRunRoute,projectIncidentRoute,newProjectRoute,administrationRoute,...administrationPages,incidentRoute])})
declare module '@tanstack/react-router'{interface Register{router:typeof router}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><AppearanceProvider><RouterProvider router={router}/></AppearanceProvider></QueryClientProvider>)
