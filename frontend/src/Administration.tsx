import {CompletionCatalog} from './AgentCatalogLive'
import {AgentCatalog,AgentNavigation,type CatalogPage} from './AgentCatalog'
import {McpVersions} from './McpConnections'
import {AgentUsers} from './AgentUsers'
import {AgentMcpConfigurations} from './AgentMcpConfigurations'
import {useEffect,useState,type ReactNode} from 'react'
import {Shape,ShapeStream} from '@electric-sql/client'
import {Link,useRouterState} from '@tanstack/react-router'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'
import {InterfaceSettings} from './InterfaceSettings'

type Section='agents'|'agent-administration'|'database'|'interface'|'projects'|'web-server'
const pages=[['agents','Agents'],['database','Base de données'],['binaries','Binaires'],['git','Git'],['interface','Interface'],['update','Mise à jour'],['projects','Projets'],['web-server','Serveur Web']] as const
export function AdministrationShell({children}:{children:ReactNode}){
  const path=useRouterState({select:state=>state.location.pathname})
  return <div className="administration-layout administration-shell"><aside className="administration-sidebar"><h2>Administration</h2><nav aria-label="Administration">{pages.map(([id,label])=><Link key={id} to={`/administration/${id}`} activeOptions={{exact:true}} className={path===`/administration/${id}`?'selected':''}>{label}</Link>)}</nav></aside><div className="administration-content">{children}</div></div>
}
type Configuration={path:string;revision:string;configuration:Record<string,unknown>;restart_required:boolean;pending_fields:string[];secret_placeholder:string;logging_levels:string[]}
type Agent={runtime:{running:boolean;mcp_running:boolean;mcp_connected:boolean;mcp_state:string};release:{version?:string;url?:string;provider_label?:string;status?:string;checked_at?:number;next_check?:number};connector_path:string;connector_agent:string;agent:string;label:string;path:string;resolved_path:string;state:string;version:string|null;mcp_configurations:{path:string;account:string;state:string;servers:{name:string;state:string;runtime:string}[]}[]}
type Inventory={agents:Agent[];runtime_notice:string}
type AgentStatus={id:string;label:string;position:number;installed:boolean|null;running:boolean|null;local_version:string|null;mcp_connected:boolean|null;mcp_versions:string[]}
type AgentStatuses={agents:AgentStatus[]}
type Field={key:string;label:string;kind?:'list'|'port'|'secret'|'logging';help?:string}
const fields:Record<Section,Field[]>={
  agents:[],
  'agent-administration':[],
  database:[{key:'database_host',label:'Hôte PostgreSQL'},{key:'database_port',label:'Port PostgreSQL',kind:'port'},{key:'database',label:'Nom de la base'},{key:'database_user',label:'Compte applicatif'},{key:'database_password',label:'Mot de passe applicatif',kind:'secret'},{key:'migrator_user',label:'Compte de migration'},{key:'migrator_password',label:'Mot de passe de migration',kind:'secret'},{key:'electric_user',label:'Compte de réplication Electric'},{key:'electric_password',label:'Mot de passe Electric',kind:'secret'}],
  interface:[],
  projects:[{key:'projects_root',label:'Chemin absolu des projets',help:'Dossier existant utilisé pour les nouvelles créations.'},{key:'projects_user',label:'Compte POSIX'},{key:'projects_group',label:'Groupe POSIX'}],
  'web-server':[{key:'web_public_urls',label:'URLs des virtual hosts déclarés',kind:'list',help:'Une origine complète par ligne, par exemple https://cab.example.org. Aucun proxy ni certificat n’est créé.'},{key:'web_allowed_hosts',label:'Noms d’hôtes supplémentaires autorisés',kind:'list',help:'Un nom DNS ou une adresse IP par ligne. Les noms des URLs déclarées sont également autorisés.'},{key:'web_csrf_trusted_origins',label:'Origines CSRF de confiance',kind:'list',help:'Une origine http:// ou https:// par ligne, avec le port si nécessaire. La protection CSRF reste active.'},{key:'electric_port',label:'Port interne Electric',kind:'port'},{key:'electric_secret',label:'Secret interne Electric',kind:'secret'},{key:'logging',label:'Niveau de journalisation',kind:'logging'}],
}
export function ConfigurationAccess({login,section,selectedAgent,catalog}:{login:ReactNode;section:Section;selectedAgent?:string;catalog?:CatalogPage}){
  const [notice,setNotice]=useState('')
  const query=useQuery({queryKey:['service-configuration'],queryFn:()=>api<Configuration>('administration/configuration')})
  if(query.isPending)return <p role="status">Chargement de la configuration…</p>
  if(query.error)return login
  const initial=query.data
  if(section==='agents'||section==='agent-administration')return <Agents selectedAgent={selectedAgent} catalog={catalog} administration={section==='agent-administration'}/>
  return <section className="administration"><h1>{pages.find(([id])=>id===section)?.[1]}</h1>
    {notice&&<p role="status">{notice}</p>}
    {initial.restart_required&&<p role="status" className="pending-configuration">Redémarrage nécessaire pour appliquer : {initial.pending_fields.join(', ')}. La configuration active est conservée jusque-là.</p>}
    {section==='interface'?<InterfaceSettings/>:<SettingsForm key={section+initial.revision} initial={initial} fields={fields[section]} onSaved={()=>setNotice('Configuration enregistrée.')}/>}
  </section>
}
function SettingsForm({initial,fields:items,onSaved}:{initial:Configuration;fields:Field[];onSaved:()=>void}){
  const client=useQueryClient()
  const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(items.map(field=>{const value=initial.configuration[field.key];return [field.key,field.kind==='list'?(Array.isArray(value)?value.join('\n'):''):field.kind==='logging'?String((value as {level?:string})?.level||'INFO'):String(value??'')]})))
  const save=useMutation({mutationFn:()=>{const configuration:Record<string,unknown>={};for(const field of items){const value=values[field.key];if(value===''&&initial.configuration[field.key]===undefined&&field.kind!=='list')continue;configuration[field.key]=field.kind==='list'?value.split('\n').map(item=>item.trim()).filter(Boolean):field.kind==='port'?Number(value):field.kind==='logging'?{level:value}:value}return api<Configuration>('administration/configuration',{revision:initial.revision,configuration})},onSuccess:value=>{client.setQueryData(['service-configuration'],value);client.invalidateQueries({queryKey:['agents-inventory']});client.invalidateQueries({queryKey:['projects-settings']});onSaved()}})
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();save.mutate()}}>{items.map(field=><label key={field.key}>{field.label}{field.kind==='list'?<textarea name={field.key} rows={4} spellCheck={false} value={values[field.key]} onChange={event=>setValues(previous=>({...previous,[field.key]:event.target.value}))}/>:field.kind==='logging'?<select name={field.key} value={values[field.key]} onChange={event=>setValues(previous=>({...previous,[field.key]:event.target.value}))}>{initial.logging_levels.map(level=><option key={level}>{level}</option>)}</select>:<input name={field.key} type={field.kind==='secret'?'password':field.kind==='port'?'number':'text'} autoComplete="off" value={values[field.key]} onChange={event=>setValues(previous=>({...previous,[field.key]:event.target.value}))}/>}<span className="field-help">{field.help|| (field.kind==='secret'?'La valeur masquée conserve le secret actuel.':'')}</span></label>)}<p className="configuration-help">Les réglages des projets et chemins des agents s’appliquent à chaud. La journalisation est rechargée à l’enregistrement. Les paramètres techniques nécessitent un redémarrage du service.</p>{save.error&&<p role="alert">{save.error.message}</p>}<button disabled={save.isPending} type="submit">{save.isPending?'Enregistrement…':'Enregistrer'}</button></form>
}
type ReminderSettings={seconds:number;second_seconds:number;last_seconds:number}
function AgentReminders(){
  const path='administration/agent-reminders'
  const client=useQueryClient()
  const settings=useQuery({queryKey:[path],queryFn:()=>api<ReminderSettings>(path)})
  const [draft,setDraft]=useState<ReminderSettings|null>(null)
  const values=draft??settings.data
  const save=useMutation({
    mutationFn:(value:ReminderSettings)=>api<ReminderSettings>(path,value),
    onSuccess:value=>{client.setQueryData([path],value);setDraft(null)},
  })
  if(!values)return settings.error?<p role="alert">Réglages des rappels indisponibles.</p>:null
  const fields=[['seconds','Relances 1 à 3'],['second_seconds','Quatrième relance'],['last_seconds','Dernière relance']] as const
  return <section className="agent-card">
    <h2>Rappels d’inactivité</h2>
    <p>Le délai court depuis la dernière activité ou le dernier rappel. Saisir 0 au premier délai désactive les rappels.</p>
    <form onSubmit={event=>{event.preventDefault();save.mutate(values)}}>
      <div className="table-wrap"><table className="monitor-table" aria-label="Rappels d’inactivité">
        <thead><tr><th scope="col">Relance</th><th scope="col">Délai (secondes)</th></tr></thead>
        <tbody>{fields.map(([key,label])=><tr key={key}>
          <td data-label="Relance"><label htmlFor={'agent-reminder-'+key}>{label}</label></td>
          <td data-label="Délai (secondes)"><input id={'agent-reminder-'+key} type="number" required min={key==='seconds'?0:30} max={86400} step={1} value={values[key]}
            onChange={event=>setDraft({...values,[key]:event.target.valueAsNumber})}/></td>
        </tr>)}</tbody>
      </table></div>
      <button type="submit" disabled={!draft||save.isPending}>Enregistrer les rappels</button>
      {save.isError&&<p role="alert">Saisir des délais croissants. Le premier délai est compris entre 30 secondes et un jour, ou vaut 0.</p>}
      {save.isSuccess&&!draft&&<p role="status">Délais enregistrés.</p>}
    </form>
  </section>
}

function Agents({selectedAgent,catalog,administration}:{selectedAgent?:string;catalog?:CatalogPage;administration:boolean}){
  const client=useQueryClient()
  const status=useQuery({queryKey:['agent-status'],queryFn:()=>api<AgentStatuses>('administration/agent-status')})
  const query=useQuery({queryKey:['agents-inventory'],queryFn:()=>api<Inventory>('administration/agents'),enabled:!catalog})
  useEffect(()=>{
    const controller=new AbortController()
    const boolean=(value:unknown):boolean|null=>value===true||value==='true'?true:value===false||value==='false'?false:null
    const versions=(value:unknown):string[]=>{if(Array.isArray(value))return value.filter((item):item is string=>typeof item==='string');if(typeof value==='string'){try{const parsed:unknown=JSON.parse(value);return Array.isArray(parsed)?parsed.filter((item):item is string=>typeof item==='string'):[]}catch{return []}}return []}
    const stream=new ShapeStream({url:new URL('/api/v1/sync/agents',location.origin).href,signal:controller.signal,onError:()=>({})})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{if(rows.length)client.setQueryData<AgentStatuses>(['agent-status'],{agents:rows.map(row=>({id:String(row.id),label:String(row.label),position:Number(row.position),installed:boolean(row.installed),running:boolean(row.running),local_version:row.local_version==null?null:String(row.local_version),mcp_connected:boolean(row.mcp_connected),mcp_versions:versions(row.mcp_versions)})).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id))})})
    return ()=>{unsubscribe();controller.abort()}
  },[client])
  if(status.isPending)return <p role="status">Chargement des agents…</p>
  if(status.error)return <p role="alert">Statut des agents indisponible : {status.error.message}</p>
  const paths:Record<string,string>={codex_desktop:'codex',codex:'codex-cli',opencode:'opencode'}
  const selected=status.data.agents.find(agent=>agent.id===selectedAgent)
  const placeholder:Agent|undefined=selected?{agent:selected.id,label:selected.label,runtime:{running:false,mcp_running:false,mcp_connected:false,mcp_state:'unverified'},release:{},connector_path:'',connector_agent:'',path:'',resolved_path:'',state:'loading',version:null,mcp_configurations:[]}:undefined
  const displayedAgents=selectedAgent&&selected?[query.data?.agents.find(agent=>agent.agent===selectedAgent)||placeholder!]:query.data?.agents||[]
  const overview=<section className={selectedAgent?'administration agent-detail':'administration agents-overview'}><div className="agent-title"><h1 className={selected?.installed===true?'agent-installed':selected?.installed===false?'agent-missing':undefined}>{selected?.label||'Agents'}</h1>{selected?.installed===true&&<>{selected.running!==null&&<span className={'status-dot '+(selected.running?'status-up':'status-down')} role="img" aria-label={selected.running?'Agent démarré':'Agent arrêté'} title={selected.running?'Agent démarré':'Agent arrêté'}/>}<span className="installed-version" aria-label="Version installée">{selected.local_version||'Version inconnue'}</span></>}{selected&&<><span className={'mcp-live-badge agent-mcp-line '+(selected.mcp_connected===true?'':'mcp-not-connected')} title={selected.mcp_connected===true?'MCP connecté':selected.mcp_connected===false?'MCP déconnecté ; dernière version observée':'État MCP non observé'}><span className={'status-dot '+(selected.mcp_connected===true?'status-up':selected.mcp_connected===false?'status-down':'status-unknown')} role="img" aria-label={selected.mcp_connected===true?'MCP connecté':selected.mcp_connected===false?'MCP déconnecté':'État MCP non observé'}/>MCP {selected.label}{selected.mcp_versions.length>0&&' '+selected.mcp_versions.join(', ')}</span></>}</div>{query.isPending&&<p role="status">Chargement des informations détaillées…</p>}{query.error&&<p role="alert">Inventaire des agents indisponible : {query.error.message}</p>}<div className={selectedAgent?'agents-grid agent-detail-grid':'agents-grid'}>{displayedAgents.map(agent=>{
    const installed=agent.state==='available';const runtime=agent.runtime;const release=agent.release
    return <div key={agent.agent} className={selectedAgent?'agent-detail-blocks':undefined}><section className="agent-card" data-agent={agent.agent}>
      {selectedAgent&&<h2 className="agent-block-heading">Informations</h2>}
      {!selectedAgent&&<div className="agent-title"><h2 className={installed?'agent-installed':'agent-missing'}>{agent.label}</h2>{installed&&<><span className={'status-dot '+(runtime.running?'status-up':'status-down')} role="img" aria-label={runtime.running?'Agent démarré':'Agent non démarré'} title={runtime.running?'Processus de l’agent détecté':'Aucun processus de l’agent détecté'}/><span className="installed-version" aria-label="Version installée">{agent.version||'Version inconnue'}</span>{release.version&&release.version!==agent.version&&<a className="available-version" href={release.url} target="_blank" rel="noreferrer" title="Dernière version disponible observée">{release.provider_label||(agent.agent==='codex_desktop'?'APT ChatGPT':'GitHub')} : {release.version}</a>}</>}<div className="agent-mcp-line"><McpVersions agent={agent.connector_agent}/></div></div>}
      <div className={selectedAgent?'agent-card-content':undefined}>{selectedAgent&&(agent.state==='loading'?<p role="status">Chargement des informations détaillées…</p>:<><div className="agent-info binary-info"><span>Binaire</span><code>{installed?agent.path:'Non installé'}</code></div>
      <div className="agent-info connector-info"><span>MCP</span><code>{agent.connector_path} mcp --agent {agent.connector_agent}</code></div></>)}
      {release.status==='unavailable'&&<p className="release-note">Vérification des versions indisponible ; dernière valeur connue conservée.</p>}
      {!release.version&&<p className="release-note">Vérification quotidienne des versions planifiée.</p>}
      </div>
    </section>{selectedAgent&&<><AgentUsers agent={agent.agent}/><AgentMcpConfigurations agent={agent.agent}/><section className="agent-card"><h2 className="agent-block-heading">Configuration Générale</h2><div className="agent-card-content"/></section><section className="agent-card"><h2 className="agent-block-heading">Configuration Plugins</h2><div className="agent-card-content"/></section></>}</div>
  })}</div>{administration&&<div className="agent-administration-grid"><AgentReminders/><CompletionCatalog/></div>}</section>
  if(administration)return overview
  return <div className="administration-layout">
    <aside className="administration-sidebar"><h2>Agents</h2>
      <nav aria-label="Liste des agents">{status.data.agents.map(agent=><Link to={'/agents/'+paths[agent.id]}
        key={agent.id} className={selectedAgent===agent.id?'selected':''}
        aria-current={selectedAgent===agent.id?'page':undefined}>{agent.label}</Link>)}</nav>
    </aside>
    <div className="administration-content"><AgentNavigation/>{catalog?<AgentCatalog page={catalog}/>:overview}</div>
  </div>
}
