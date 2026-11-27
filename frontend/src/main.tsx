import {filterTableRows,TableFiller,TableNavigation,tablePage,useTableSearch} from './TableNavigation'
import {agentCatalogPages} from './AgentCatalog'
import {useEffect,useRef,useState,type FormEvent} from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient,QueryClientProvider,useQuery,useQueryClient} from '@tanstack/react-query'
import {createRootRoute,createRoute,createRouter,RouterProvider,Link,Outlet,useSearch,useParams,useRouterState,useNavigate} from '@tanstack/react-router'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'
import {AppearanceProvider,DeveloperToolbar,PageAppearance,ThemeToggle,useTablePageSize} from './Appearance'
import {GitMonitorSettings} from './GitMonitorSettings'
import {ConfigurationAccess,AdministrationShell} from './Administration'
import {BinaryCounters} from './BinaryCounters'
import {BinaryList,type BinaryStatus} from './BinaryList'
import {ProjectSidebar,CreateProjectForm,type Project} from './Projects'
import {ProjectHome} from './ProjectHome'
import {ProjectForges} from './ProjectForges'
import {ProjectChanges} from './ProjectChanges'
import {ProjectChangeDetail} from './ProjectChangeDetail'
import {ProjectFactory} from './ProjectFactory'
import {ProjectIncidents} from './ProjectIncidents'
import {ProjectReservations} from './ProjectReservations'
import {UpdateBadge,HomeVersionCheck,SystemUpdatePage} from './SystemUpdate'
import {RunView,stageLabel} from './RunView'
import {ClosedRecoveryLink,SessionActions,SessionArchives,useEvaluations,runStateLabel,runProtection} from './SessionLifecycle'
import {McpConnectionsProvider,McpVersions} from './McpConnections'
import {CabVersionProvider,useCabVersion} from './CabVersion'
import {Notifications} from './Notifications'
import './style.css'
import './MonitorTable.css'

type Health={state:string;initialized:boolean;version:string;csrf_token:string}
type Session={project_id:string;run_id:string;session_id:string;mode:string;state:string;suspension:string;archived:boolean;change:string;generation:number|string;updated:string;stage:number|null;cycle_steps?:number;cycle_profile?:string;tasks_done:number|null;tasks_total:number|null}
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}})
function Layout(){
  const header=useRef<HTMLElement>(null)
  const cabVersion=useCabVersion()
  const pathname=useRouterState({select:state=>state.location.pathname})
  useEffect(()=>{const node=header.current;if(!node)return;const resize=new ResizeObserver(()=>document.documentElement.style.setProperty('--app-header-height',node.getBoundingClientRect().height+'px'));resize.observe(node);return ()=>resize.disconnect()},[])
  return <><PageAppearance path={pathname}/><header ref={header}><div className="brand-group"><Link to="/" reloadDocument activeOptions={{exact:true}} className="brand">CAB <span>{cabVersion||''}</span></Link><UpdateBadge/><nav className="primary-links" aria-label="Navigation principale"><Link to="/" reloadDocument activeOptions={{exact:true}} className="header-control home-link" aria-label="Revenir à l’accueil" title="Accueil"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg></Link><Link to="/administration">Administration</Link><Link to="/agents">Agents</Link><Link to="/projects">Projets</Link></nav></div><nav className="header-navigation" aria-label="Outils"><McpVersions header/><DeveloperToolbar/><a href="/api/v1/docs" className="api-link">API</a><Notifications/><ThemeToggle/></nav></header><main className={pathname.startsWith('/administration')||pathname.startsWith('/projects')||pathname==='/agents'||pathname.startsWith('/agents/')?'workspace-main':undefined}><Outlet/></main></>
}

function Gate({children}:{children:React.ReactNode}){
  const health=useQuery({queryKey:['health'],queryFn:()=>api<Health>('health'),networkMode:'always',refetchInterval:15000})
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
  const query=useQuery({queryKey:['projects'],queryFn:()=>api<{projects:Project[]}>('projects'),networkMode:'always'})
  if(query.isPending)return <p role="status">Chargement des projets…</p>
  if(query.error)return <Login/>
  return children(query.data.projects)
}
function SessionRows({project,rows,showProject}:{project:Project;rows:Session[];showProject:boolean}){
  const evaluations=useEvaluations(project.id)
  return <>{rows.map(row=>{
    const evaluation=evaluations.data?.evaluations.find(item=>item.run_id===row.run_id)
    return <tr key={`${project.id}:${row.run_id}`}>{showProject&&<td data-label="Projets"><Link className="text-button" to="/projects/$projectId" params={{projectId:project.identifier||project.id}}>{project.identifier||project.id}</Link></td>}<td data-label="RUN / Session"><Link className="text-button" to="/projects/$projectId/runs/$runId" params={{projectId:project.identifier||project.id,runId:row.run_id}}>{row.run_id}</Link><small>{row.session_id}</small></td><td data-label="Change">{row.change}{evaluation?.closed_recovery&&<small><ClosedRecoveryLink projectId={project.identifier||project.id} recovery={evaluation.closed_recovery}/></small>}</td><td data-label="Profil">{row.mode==='service'?'Service':row.mode==='piloted'?'Pilotée':'Directe'}</td><td data-label="État"><span className="badge">{runStateLabel(row.state,row.suspension)}</span>{runProtection(row.suspension)&&<small className="protection-label">{runProtection(row.suspension)}</small>}</td><td data-label="Étape">{stageLabel(row.stage,row.cycle_steps,undefined,row.cycle_profile)}</td><td data-label="Tâches réalisées">{row.mode==='service'?'Sans objet':row.tasks_total===null?'—':`${row.tasks_done}/${row.tasks_total}`}</td><td data-label="Actualisation">{new Date(row.updated).toLocaleString('fr-FR')}</td><td data-label="Actions"><SessionActions projectId={project.id} runId={row.run_id} evaluation={evaluation}/></td></tr>})}</>
}
function SessionList({project,projects=[]}:{project?:Project;projects?:Project[]}){
  const pageSize=useTablePageSize('sessions')
  const [rows,setRows]=useState<Session[]>([]),[status,setStatus]=useState('')
  const navigation=useTableSearch()
  useEffect(()=>{
    const controller=new AbortController();setRows([]);setStatus('')
    const stream=new ShapeStream({url:new URL(project?'/api/v1/sync/sessions':'/api/v1/sync/project-sessions',location.origin).href,params:project?{project_id:project.id}:undefined,signal:controller.signal,onError:()=>{setStatus('Suivi temporairement indisponible · reconnexion en cours');return {}}})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{setRows(rows.map(row=>({project_id:String(row.project_id||project?.id||''),run_id:String(row.run_id),session_id:String(row.session_id),mode:String(row.mode),state:String(row.state),suspension:String(row.suspension||''),archived:row.archived===true||String(row.archived)==='true',change:String(row.change),generation:String(row.generation),updated:String(row.updated),cycle_profile:String(row.cycle_profile||''),cycle_steps:Number(row.cycle_steps)||11,stage:row.stage==null?null:Number(row.stage),tasks_done:row.tasks_done==null?null:Number(row.tasks_done),tasks_total:row.tasks_total==null?null:Number(row.tasks_total)})));setStatus('')})
    return ()=>{unsubscribe();controller.abort()}
  },[project?.id])
  const available=project?[project]:projects
  const all=available.flatMap(value=>rows.filter(row=>!row.archived&&row.project_id===value.id).map(row=>({project:value,row})))
  const matching=filterTableRows(all,navigation.query,({project:value,row})=>[
    value.identifier,value.name,row.run_id,row.session_id,row.change,
    row.mode==='service'?'Service':row.mode==='piloted'?'Pilotée':'Directe',
    runStateLabel(row.state,row.suspension),runProtection(row.suspension),
    stageLabel(row.stage,row.cycle_steps,undefined,row.cycle_profile),new Date(row.updated).toLocaleString('fr-FR'),
    row.tasks_total!=null?`${row.tasks_done}/${row.tasks_total}`:'',
  ])
  const {rows:visible,current,pages}=tablePage(matching,navigation.page,pageSize)
  const groups=available.map(value=>({project:value,rows:visible.filter(item=>item.project.id===value.id).map(item=>item.row)})).filter(value=>value.rows.length)
  useEffect(()=>navigation.setPage(1),[project?.id])
  return <><div className="section-heading"><div><p className="eyebrow">SESSIONS DE CODAGE EN COURS</p></div>{status&&<p role="status" className="live">{status}</p>}</div><div className="table-wrap"><table className="monitor-table"><thead><tr>{!project&&<th scope="col"><span>Projets</span></th>}<th scope="col"><span>RUN / Session</span></th><th scope="col"><span>Change</span></th><th scope="col"><span>Profil</span></th><th scope="col"><span>État</span></th><th scope="col"><span>Étape</span></th><th scope="col"><span>Tâches réalisées</span></th><th scope="col"><span>Actualisation</span></th><th scope="col"><span>Actions</span></th></tr></thead><tbody>{groups.map(group=><SessionRows key={group.project.id} project={group.project} rows={group.rows} showProject={!project}/>)}
    <TableFiller count={visible.length} columns={project?8:9} empty={navigation.query.trim()?'Aucun résultat.':project?'Aucune session pour ce projet.':'Aucune session pour les projets accessibles.'}/>
    </tbody></table></div>
    <TableNavigation {...navigation} label="Pagination des sessions" searchLabel="Rechercher dans les sessions"
      current={current} pages={pages} total={matching.length}/></>
}
type SessionStatus='open'|'archived'

function SessionTabs({status,project,projects}:{
  status:SessionStatus;project?:Project;projects?:Project[]
}){
  const archived=status==='archived'
  const routeId=project?.identifier||project?.id
  const target=routeId
    ? {to:'/projects/$projectId/sessions' as const,params:{projectId:routeId}}
    : {to:'/projects/sessions' as const}
  const [visited,setVisited]=useState<SessionStatus[]>([status])
  useEffect(()=>{
    setVisited(previous=>previous.includes(status)?previous:[...previous,status])
  },[status])
  return <>
    <nav className="table-tabs" aria-label="État des sessions">
      <Link {...target} search={{status:'open'}} aria-current={!archived?'page':undefined}>Ouvertes</Link>
      <Link {...target} search={{status:'archived'}} aria-current={archived?'page':undefined}>Archivées</Link>
    </nav>
    {(!archived||visited.includes('open'))&&<div hidden={archived}><SessionList project={project} projects={projects}/></div>}
    {(archived||visited.includes('archived'))&&<div hidden={!archived}><SessionArchives projectId={project?.id} routeId={routeId} projects={projects}/></div>}
  </>
}
function AllProjectSessions({projects,status='open'}:{
  projects:Project[];status?:SessionStatus
}){
  return <div className="projects-layout">
    <ProjectSidebar projects={projects}/>
    <section className="project-content">
      <ProjectsNavigation/>
      <section className="project-home project-forges-page">
        <div className="section-heading"><div className="project-identity"><h1>Sessions</h1></div></div>
      </section>
      <SessionTabs status={status} projects={projects}/>
    </section>
  </div>
}
function ProjectRunScreen({projects}:{projects:Project[]}){
  const params=useParams({strict:false});const navigate=useNavigate();const project=projects.find(item=>item.id===params.projectId||item.identifier===params.projectId)
  useEffect(()=>{if(project?.identifier&&params.projectId===project.id&&params.runId)navigate({to:'/projects/$projectId/runs/$runId',params:{projectId:project.identifier,runId:params.runId},replace:true})},[project?.identifier,params.projectId,params.runId])
  return <div className="projects-layout"><ProjectSidebar projects={projects} selected={project?.id}/><section className="project-content">{project&&params.runId?<RunView projectId={project.id} routeId={project.identifier||project.id} runId={params.runId}/>:<h1>Projet introuvable</h1>}</section></div>
}
function ProjectScreen({projects,incidents=false,sessions,changes,forges=false,factory=false}:{projects:Project[];incidents?:boolean;sessions?:SessionStatus;changes?:SessionStatus;forges?:boolean;factory?:boolean}){
  const search=useSearch({strict:false});const params=useParams({strict:false});const requested=params.projectId||search.project;const selected=requested?projects.find(p=>p.id===requested||p.identifier===requested):incidents?projects[0]:undefined
  const navigate=useNavigate()
  useEffect(()=>{if(selected?.identifier&&params.projectId===selected.id)navigate({to:factory?'/projects/$projectId/factory':forges?'/projects/$projectId/forges':incidents?'/projects/$projectId/incidents':sessions?'/projects/$projectId/sessions':changes?'/projects/$projectId/changes':'/projects/$projectId',params:{projectId:selected.identifier},search:sessions==='archived'||changes==='archived'?{status:'archived'}:{},replace:true})},[selected?.identifier,params.projectId,incidents,sessions,changes,forges,factory])
  return <div className="projects-layout"><ProjectSidebar projects={projects} selected={selected?.id}/><section className="project-content">{selected?<ProjectNavigation projectId={selected.identifier||selected.id}/>:!requested?<ProjectsNavigation/>:null}{!selected?<section className="project-home project-forges-page">{requested&&<div className="section-heading"><div className="project-identity"><h1>Projet introuvable</h1></div></div>}<p>{requested?'Ce projet est introuvable ou ne fait pas partie de vos projets accessibles.':projects.length?'Sélectionnez un projet dans la colonne de gauche pour ouvrir sa page.':'Aucun projet enregistré. Utilisez le bouton + pour créer votre premier projet.'}</p></section>:selected.creation_state!=='READY'?<section><h1>{selected.name}</h1><p role="alert">La création de ce projet nécessite une vérification. Aucun dossier ne sera recréé automatiquement.</p></section>:factory?<><ProjectPageTitle project={selected} title="Fabrique"/><ProjectFactory project={selected}/></>:forges?<><ProjectPageTitle project={selected} title="Forges"/><ProjectForges project={selected}/></>:incidents?<><ProjectPageTitle project={selected} title="Incidents"/><ProjectIncidents project={selected}/></>:sessions?<><ProjectPageTitle project={selected} title="Sessions"/><SessionTabs key={selected.id} status={sessions} project={selected}/></>:changes?<><ProjectPageTitle project={selected} title="Changes"/><ProjectChanges key={selected.id} projectId={selected.id} routeId={selected.identifier||selected.id} status={changes}/></>:<ProjectHome project={selected}/>}</section></div>
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
const rootRoute=createRootRoute({component:Layout})
function ProjectsNavigation(){return <nav className="project-tabs" aria-label="Projets"><Link to="/projects" activeOptions={{exact:true}} className="project-home-link" aria-label="Accueil des projets" title="Accueil des projets"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg></Link><Link to="/projects/sessions">Sessions</Link><Link to="/projects/reservations">Réservations</Link></nav>}
function ProjectNavigation({projectId}:{projectId:string}){return <nav className="project-tabs" aria-label="Projet"><Link to="/projects/$projectId" params={{projectId}} activeOptions={{exact:true}} className="project-home-link" aria-label="Accueil du projet" title="Accueil du projet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></svg></Link><Link to="/projects/$projectId/changes" params={{projectId}}>Changes</Link><Link to="/projects/$projectId/factory" params={{projectId}}>Fabrique</Link><Link to="/projects/$projectId/forges" params={{projectId}}>Forges</Link><Link to="/projects/$projectId/incidents" params={{projectId}}>Incidents</Link><Link to="/projects/$projectId/sessions" params={{projectId}}>Sessions</Link></nav>}
const sessionSearch=(search:Record<string,unknown>):{status?:SessionStatus}=>search.status==='open'||search.status==='archived'?{status:search.status}:{}
const projectSearch=(search:Record<string,unknown>):{project?:string}=>typeof search.project==='string'?{project:search.project}:{}
const indexRoute=createRoute({getParentRoute:()=>rootRoute,path:'/',component:HomeVersionCheck})
const projectRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects',validateSearch:projectSearch,component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects}/>}</Projects></Gate>})
const projectDetailRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects}/>}</Projects></Gate>})
const projectFactoryRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/factory',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} factory/>}</Projects></Gate>})
const projectForgesRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/forges',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} forges/>}</Projects></Gate>})
const allProjectSessionsRoute=createRoute({
  getParentRoute:()=>rootRoute,
  path:'/projects/sessions',
  validateSearch:sessionSearch,
  component:AllProjectSessionsPage,
})
function AllProjectSessionsPage(){
  const {status}=allProjectSessionsRoute.useSearch()
  return <Gate><Projects>{projects=><AllProjectSessions projects={projects} status={status}/>}</Projects></Gate>
}
const projectReservationsRoute=createRoute({
  getParentRoute:()=>rootRoute,
  path:'/projects/reservations',
  component:()=> <Gate><Projects>{projects=><div className="projects-layout"><ProjectSidebar projects={projects}/><section className="project-content"><ProjectsNavigation/><ProjectReservations projects={projects}/></section></div>}</Projects></Gate>,
})
const projectSessionsRoute=createRoute({
  getParentRoute:()=>rootRoute,
  path:'/projects/$projectId/sessions',
  validateSearch:sessionSearch,
  component:ProjectSessionsPage,
})
function ProjectSessionsPage(){
  const {status='open'}=projectSessionsRoute.useSearch()
  return <Gate><Projects>{projects=><ProjectScreen projects={projects} sessions={status}/>}</Projects></Gate>
}
const projectChangesRoute=createRoute({
  getParentRoute:()=>rootRoute,
  path:'/projects/$projectId/changes',
  validateSearch:sessionSearch,
  component:ProjectChangesPage,
})
function ProjectChangesPage(){
  const {status='open'}=projectChangesRoute.useSearch()
  return <Gate><Projects>{projects=><ProjectScreen projects={projects} changes={status}/>}</Projects></Gate>
}
const projectChangeDetailRoute=createRoute({
  getParentRoute:()=>rootRoute,
  path:'/projects/$projectId/changes/$changeId',
  validateSearch:(search:Record<string,unknown>):{source?:string}=>typeof search.source==='string'&&search.source?{source:search.source}:{},
  component:ProjectChangeDetailPage,
})
function ProjectChangeDetailPage(){
  const {projectId,changeId}=projectChangeDetailRoute.useParams()
  const {source}=projectChangeDetailRoute.useSearch()
  return <Gate><Projects>{projects=>{
    const project=projects.find(item=>item.id===projectId||item.identifier===projectId)
    return project?<ProjectChangeDetail projectId={project.id} routeId={project.identifier||project.id} changeId={changeId} source={source}/>:
      <section className="project-content"><h1>Projet introuvable</h1></section>
  }}</Projects></Gate>
}
const projectRunRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/runs/$runId',component:()=> <Gate><Projects>{projects=><ProjectRunScreen projects={projects}/>}</Projects></Gate>})
const projectIncidentRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/$projectId/incidents',component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} incidents/>}</Projects></Gate>})
const newProjectRoute=createRoute({getParentRoute:()=>rootRoute,path:'/projects/new',component:()=> <Gate><Projects>{projects=><div className="projects-layout"><ProjectSidebar projects={projects}/><div className="project-content"><CreateProjectForm/></div></div>}</Projects></Gate>})
const administrationRoute=createRoute({getParentRoute:()=>rootRoute,path:'/administration',component:()=> <AdministrationShell><section className="project-home project-forges-page"><div className="section-heading"><div className="project-identity"><h1>Administration</h1></div></div><BinaryCounters/></section></AdministrationShell>})
const administrationBinariesRoute=createRoute({
  getParentRoute:()=>rootRoute,
  path:'/administration/binaries',
  validateSearch:(search:Record<string,unknown>):{status?:BinaryStatus}=>search.status==='active'||search.status==='inactive'?{status:search.status}:{},
  component:()=> <AdministrationShell><Gate><BinaryList status={administrationBinariesRoute.useSearch().status??'active'} login={<Login/>}/></Gate></AdministrationShell>,
})
const agentsRoute=createRoute({getParentRoute:()=>rootRoute,path:'/agents',component:()=> <Gate><ConfigurationAccess section="agents" login={<Login/>}/></Gate>})
const agentPages=([['codex','codex_desktop'],['codex-cli','codex'],['opencode','opencode']] as const).map(([path,agent])=>createRoute({getParentRoute:()=>rootRoute,path:`/agents/${path}`,component:()=> <Gate><ConfigurationAccess section="agents" selectedAgent={agent} login={<Login/>}/></Gate>}))
const agentCatalogueRoutes=agentCatalogPages.map(([catalog])=>createRoute({getParentRoute:()=>rootRoute,path:`/agents/${catalog}` as const,component:()=> <Gate><ConfigurationAccess section="agents" catalog={catalog} login={<Login/>}/></Gate>}))
const administrationAgentsRoute=createRoute({getParentRoute:()=>rootRoute,path:'/administration/agents',component:()=> <AdministrationShell><Gate><ConfigurationAccess section="agent-administration" login={<Login/>}/></Gate></AdministrationShell>})
const administrationGitRoute=createRoute({getParentRoute:()=>rootRoute,path:'/administration/git',component:()=> <AdministrationShell><Gate><GitMonitorSettings/></Gate></AdministrationShell>})
const administrationUpdateRoute=createRoute({getParentRoute:()=>rootRoute,path:'/administration/update',component:()=> <AdministrationShell><Gate><SystemUpdatePage login={<Login/>}/></Gate></AdministrationShell>})
const administrationPages=(['database','interface','projects','web-server'] as const).map(section=>createRoute({getParentRoute:()=>rootRoute,path:`/administration/${section}`,component:()=> <AdministrationShell><Gate><ConfigurationAccess section={section} login={<Login/>}/></Gate></AdministrationShell>}))
const incidentRoute=createRoute({getParentRoute:()=>rootRoute,path:'/incidents',validateSearch:projectSearch,component:()=> <Gate><Projects>{projects=><ProjectScreen projects={projects} incidents/>}</Projects></Gate>})
const router=createRouter({routeTree:rootRoute.addChildren([indexRoute,projectRoute,allProjectSessionsRoute,projectReservationsRoute,projectDetailRoute,projectFactoryRoute,projectForgesRoute,projectSessionsRoute,projectChangesRoute,projectChangeDetailRoute,projectRunRoute,projectIncidentRoute,newProjectRoute,administrationRoute,administrationBinariesRoute,agentsRoute,...agentPages,...agentCatalogueRoutes,administrationAgentsRoute,administrationGitRoute,administrationUpdateRoute,...administrationPages,incidentRoute])})
declare module '@tanstack/react-router'{interface Register{router:typeof router}}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><AppearanceProvider><CabVersionProvider><McpConnectionsProvider><RouterProvider router={router}/></McpConnectionsProvider></CabVersionProvider></AppearanceProvider></QueryClientProvider>)
