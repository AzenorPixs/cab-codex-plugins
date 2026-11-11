import {useEffect,useState,type FormEvent} from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query'
import {createRootRoute,createRoute,createRouter,RouterProvider,Link,Outlet} from '@tanstack/react-router'
import {Shape,ShapeStream} from '@electric-sql/client'
import './style.css'

type Health={state:string;initialized:boolean;version:string;csrf_token:string}
type Project={id:string;root:string}
type Session={run_id:string;session_id:string;mode:string;state:string;change:string;generation:number|string;updated:string}
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}})
let csrf=''
async function api<T>(path:string,body?:unknown,headers:Record<string,string>={}):Promise<T>{
  const response=await fetch('/api/v1/'+path,{credentials:'same-origin',method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrf,...headers},body:body===undefined?undefined:JSON.stringify(body)})
  const value=await response.json()
  if(!response.ok)throw new Error(value.error||'Requête refusée ('+response.status+')')
  return value as T
}
function Layout(){return <><header><Link to="/" className="brand">CAB <span>3.0</span></Link><nav><Link to="/">Sessions</Link><Link to="/incidents">Incidents</Link><a href="/api/v1/docs">API</a></nav></header><main><Outlet/></main></>}
function Gate({children}:{children:React.ReactNode}){
  const health=useQuery({queryKey:['health'],queryFn:async()=>{const h=await api<Health>('health');csrf=h.csrf_token;return h},refetchInterval:15000})
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
  return <section className="setup"><p className="eyebrow">PREMIÈRE UTILISATION</p><h1>Initialiser CAB</h1><p>La validation de ce parcours crée la base CAB et son compte administrateur. Aucune session de codage ne démarre automatiquement.</p><p>L’administrateur de la machine obtient le code local avec <code>sudo cab bootstrap-token</code>.</p><form onSubmit={submit}><label>Code d’initialisation<input name="token" type="password" required autoComplete="off"/></label><label>Compte administrateur<input name="username" required autoComplete="username" pattern="[A-Za-z0-9_.-]{1,80}"/></label><label>Mot de passe<input name="password" type="password" required minLength={14} autoComplete="new-password"/></label>{error&&<p role="alert">{error}</p>}<button disabled={busy}>{busy?'Initialisation en cours…':'Initialiser la plateforme'}</button></form></section>
}
function Login(){const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const form=new FormData(e.currentTarget);try{await api('login',{username:form.get('username'),password:form.get('password')});const h=await api<Health>('health');csrf=h.csrf_token;await client.invalidateQueries()}catch(error){setError(String(error))}finally{setBusy(false)}}
  return <section className="setup"><p className="eyebrow">ACCÈS ADMINISTRATEUR</p><h1>Connexion à CAB</h1><form onSubmit={submit}><label>Compte<input name="username" required autoComplete="username"/></label><label>Mot de passe<input name="password" type="password" required autoComplete="current-password"/></label>{error&&<p role="alert">{error}</p>}<button disabled={busy}>Se connecter</button></form></section>
}
function Projects({children}:{children:(projects:Project[])=>React.ReactNode}){
  const query=useQuery({queryKey:['projects'],queryFn:()=>api<{projects:Project[]}>('projects')})
  if(query.isPending)return <p role="status">Chargement des projets…</p>
  if(query.error)return <Login/>
  if(!query.data.projects.length)return <section><h1>Vos projets</h1><p>Aucun projet enregistré. Les agents pourront enregistrer leurs projets une fois leur accès CAB configuré.</p></section>
  return children(query.data.projects)
}
function SessionList({project}:{project:Project}){
  const [rows,setRows]=useState<Session[]>([]);const [status,setStatus]=useState('Connexion au suivi…');const [selected,setSelected]=useState('')
  useEffect(()=>{
    const controller=new AbortController();setRows([]);setStatus('Connexion au suivi…');setSelected('')
    const stream=new ShapeStream({url:new URL('/api/v1/sync/sessions',location.origin).href,params:{project_id:project.id},signal:controller.signal,onError:()=>{setStatus('Suivi temporairement indisponible · reconnexion en cours');return {}}})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{setRows(rows.map(row=>({run_id:String(row.run_id),session_id:String(row.session_id),mode:String(row.mode),state:String(row.state),change:String(row.change),generation:String(row.generation),updated:String(row.updated)})));setStatus('Suivi en direct · Electric')})
    return ()=>{unsubscribe();controller.abort()}
  },[project.id])
  return <><div className="section-heading"><div><p className="eyebrow">COORDINATION AUTONOME</p><h1>Sessions de codage</h1></div><p role="status" className="live">{status}</p></div><p className="project-path">{project.root}</p><div className="table-wrap"><table><thead><tr><th>RUN / Session</th><th>Change</th><th>Profil</th><th>État</th><th>Actualisation</th></tr></thead><tbody>{rows.map(row=><tr key={row.run_id}><td><button className="text-button" onClick={()=>setSelected(row.run_id)}>{row.run_id}</button><small>{row.session_id}</small></td><td>{row.change}</td><td>{row.mode==='piloted'?'Pilotée':'Directe'}</td><td><span className="badge">{row.state}</span></td><td>{new Date(row.updated).toLocaleString('fr-FR')}</td></tr>)}</tbody></table>{!rows.length&&<p className="empty">Aucune session pour ce projet.</p>}</div>{selected&&<RunDetails project={project.id} run={selected}/>}</>
}
function RunDetails({project,run}:{project:string;run:string}){
  const query=useQuery({queryKey:['run',project,run],queryFn:()=>api<{review:unknown;operations:unknown[];exceptions:unknown[]}>('run?'+new URLSearchParams({project_id:project,run_id:run})),refetchInterval:10000})
  return <section className="details"><h2>Preuves et revue · {run}</h2>{query.error?<p role="alert">Détails indisponibles.</p>:<pre>{JSON.stringify(query.data,null,2)}</pre>}</section>
}
function ProjectScreen({projects,incidents=false}:{projects:Project[];incidents?:boolean}){
  const [id,setId]=useState(projects[0].id);const selected=projects.find(p=>p.id===id)||projects[0]
  return <><label className="project-select">Projet<select value={selected.id} onChange={e=>setId(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.root.split('/').pop()}</option>)}</select></label>{incidents?<IncidentList project={selected}/>:<SessionList project={selected}/>}</>
}
function IncidentList({project}:{project:Project}){
  const query=useQuery({queryKey:['incidents',project.id],queryFn:()=>api<{incidents:unknown[]}>('incidents?'+new URLSearchParams({project_id:project.id})),refetchInterval:15000})
  return <section><p className="eyebrow">REGISTRE CCAB</p><h1>Incidents</h1><p>{project.root}</p>{query.error?<p role="alert">Registre indisponible.</p>:query.data?.incidents.length?<pre>{JSON.stringify(query.data.incidents,null,2)}</pre>:<p>Aucun incident ouvert dans ce périmètre.</p>}</section>
}
const rootRoute=createRootRoute({component:Layout})
const indexRoute=createRoute({getParentRoute:()=>rootRoute,path:'/',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects}/>}</Projects></Gate>})
const incidentRoute=createRoute({getParentRoute:()=>rootRoute,path:'/incidents',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} incidents/>}</Projects></Gate>})
const router=createRouter({routeTree:rootRoute.addChildren([indexRoute,incidentRoute])})
declare module '@tanstack/react-router'{interface Register{router:typeof router}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><RouterProvider router={router}/></QueryClientProvider>)
