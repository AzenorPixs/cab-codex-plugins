import {McpVersions} from './McpConnections'
import {useState,type ReactNode} from 'react'
import {Link,useRouterState} from '@tanstack/react-router'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'
import {FontControls} from './Appearance'

type Section='agents'|'database'|'interface'|'projects'|'web-server'
const pages=[['database','Base de données'],['interface','Interface'],['update','Mise à jour'],['projects','Projets'],['web-server','Serveur Web']] as const
export function AdministrationShell({children}:{children:ReactNode}){
  const path=useRouterState({select:state=>state.location.pathname})
  return <div className="administration-layout"><aside className="administration-sidebar"><h2>Administration</h2><nav aria-label="Administration">{pages.map(([id,label])=><Link key={id} to={`/administration/${id}`} activeOptions={{exact:true}} className={path===`/administration/${id}`||id==='database'&&path==='/administration'?'selected':''}>{label}</Link>)}</nav></aside><div className="administration-content">{children}</div></div>
}
type Configuration={path:string;revision:string;configuration:Record<string,unknown>;restart_required:boolean;pending_fields:string[];secret_placeholder:string;logging_levels:string[]}
type Agent={runtime:{running:boolean;mcp_running:boolean;mcp_connected:boolean;mcp_state:string};release:{version?:string;url?:string;status?:string;checked_at?:number;next_check?:number};connector_path:string;connector_agent:string;agent:string;label:string;path:string;resolved_path:string;state:string;version:string|null;mcp_configurations:{path:string;account:string;state:string;servers:{name:string;state:string;runtime:string}[]}[]}
type Inventory={agents:Agent[];runtime_notice:string}
type Field={key:string;label:string;kind?:'list'|'port'|'secret'|'logging';help?:string}
const fields:Record<Section,Field[]>={
  agents:[],
  database:[{key:'database_host',label:'Hôte PostgreSQL'},{key:'database_port',label:'Port PostgreSQL',kind:'port'},{key:'database',label:'Nom de la base'},{key:'database_user',label:'Compte applicatif'},{key:'database_password',label:'Mot de passe applicatif',kind:'secret'},{key:'migrator_user',label:'Compte de migration'},{key:'migrator_password',label:'Mot de passe de migration',kind:'secret'},{key:'electric_user',label:'Compte de réplication Electric'},{key:'electric_password',label:'Mot de passe Electric',kind:'secret'}],
  interface:[],
  projects:[{key:'projects_root',label:'Chemin absolu des projets',help:'Dossier existant utilisé pour les nouvelles créations.'},{key:'projects_user',label:'Compte POSIX'},{key:'projects_group',label:'Groupe POSIX'}],
  'web-server':[{key:'web_public_urls',label:'URLs des virtual hosts déclarés',kind:'list',help:'Une origine complète par ligne, par exemple https://cab.example.org. Aucun proxy ni certificat n’est créé.'},{key:'web_allowed_hosts',label:'Noms d’hôtes supplémentaires autorisés',kind:'list',help:'Un nom DNS ou une adresse IP par ligne. Les noms des URLs déclarées sont également autorisés.'},{key:'web_csrf_trusted_origins',label:'Origines CSRF de confiance',kind:'list',help:'Une origine http:// ou https:// par ligne, avec le port si nécessaire. La protection CSRF reste active.'},{key:'electric_port',label:'Port interne Electric',kind:'port'},{key:'electric_secret',label:'Secret interne Electric',kind:'secret'},{key:'logging',label:'Niveau de journalisation',kind:'logging'}],
}
const states:Record<string,string>={available:'Exécutable disponible',missing:'Absent',not_file:'Ce chemin ne désigne pas un fichier',not_executable:'Non exécutable',configured:'Configuration présente',empty:'Aucun MCP déclaré',absent:'Configuration absente',invalid:'Configuration invalide',unsafe:'Fichier non sûr',unreadable:'Lecture impossible',jsonc_unverified:'Format JSONC non vérifié',disabled:'Désactivé',declared:'Déclaré · connexion non vérifiée'}
export function ConfigurationAccess({login,section}:{login:ReactNode;section:Section}){
  const [notice,setNotice]=useState('')
  const query=useQuery({queryKey:['service-configuration'],queryFn:()=>api<Configuration>('administration/configuration')})
  if(query.isPending)return <p role="status">Chargement de la configuration…</p>
  if(query.error)return login
  const initial=query.data
  return <section className="administration"><p className="eyebrow">ADMINISTRATION</p><h1>{section==='agents'?'Agents':pages.find(([id])=>id===section)?.[1]}</h1>
    {notice&&<p role="status">{notice}</p>}
    {initial.restart_required&&<p role="status" className="pending-configuration">Redémarrage nécessaire pour appliquer : {initial.pending_fields.join(', ')}. La configuration active est conservée jusque-là.</p>}
    {section==='interface'?<><h2>Taille des polices</h2><p>Ces réglages s’appliquent à toute l’interface et sont enregistrés en base de données. Le bouton clair/sombre reste dans le bandeau.</p><FontControls/></>:section==='agents'?<Agents key={initial.revision} initial={initial} onSaved={()=>setNotice('Configuration enregistrée.')}/>:<SettingsForm key={section+initial.revision} initial={initial} fields={fields[section]} onSaved={()=>setNotice('Configuration enregistrée.')}/>}
  </section>
}
function SettingsForm({initial,fields:items,onSaved}:{initial:Configuration;fields:Field[];onSaved:()=>void}){
  const client=useQueryClient()
  const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(items.map(field=>{const value=initial.configuration[field.key];return [field.key,field.kind==='list'?(Array.isArray(value)?value.join('\n'):''):field.kind==='logging'?String((value as {level?:string})?.level||'INFO'):String(value??'')]})))
  const save=useMutation({mutationFn:()=>{const configuration:Record<string,unknown>={};for(const field of items){const value=values[field.key];if(value===''&&initial.configuration[field.key]===undefined&&field.kind!=='list')continue;configuration[field.key]=field.kind==='list'?value.split('\n').map(item=>item.trim()).filter(Boolean):field.kind==='port'?Number(value):field.kind==='logging'?{level:value}:value}return api<Configuration>('administration/configuration',{revision:initial.revision,configuration})},onSuccess:value=>{client.setQueryData(['service-configuration'],value);client.invalidateQueries({queryKey:['agents-inventory']});client.invalidateQueries({queryKey:['projects-settings']});onSaved()}})
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();save.mutate()}}>{items.map(field=><label key={field.key}>{field.label}{field.kind==='list'?<textarea name={field.key} rows={4} spellCheck={false} value={values[field.key]} onChange={event=>setValues(previous=>({...previous,[field.key]:event.target.value}))}/>:field.kind==='logging'?<select name={field.key} value={values[field.key]} onChange={event=>setValues(previous=>({...previous,[field.key]:event.target.value}))}>{initial.logging_levels.map(level=><option key={level}>{level}</option>)}</select>:<input name={field.key} type={field.kind==='secret'?'password':field.kind==='port'?'number':'text'} autoComplete="off" value={values[field.key]} onChange={event=>setValues(previous=>({...previous,[field.key]:event.target.value}))}/>}<span className="field-help">{field.help|| (field.kind==='secret'?'La valeur masquée conserve le secret actuel.':'')}</span></label>)}<p className="configuration-help">Les réglages des projets et chemins des agents s’appliquent à chaud. La journalisation est rechargée à l’enregistrement. Les paramètres techniques nécessitent un redémarrage du service.</p>{save.error&&<p role="alert">{save.error.message}</p>}<button disabled={save.isPending} type="submit">{save.isPending?'Enregistrement…':'Enregistrer'}</button></form>
}
function Agents({initial,onSaved}:{initial:Configuration;onSaved:()=>void}){
  const query=useQuery({queryKey:['agents-inventory'],queryFn:()=>api<Inventory>('administration/agents'),refetchInterval:2000})
  if(query.isPending)return <p role="status">Détection des agents et de leurs versions…</p>
  if(query.error)return <p role="alert">Inventaire des agents indisponible : {query.error.message}</p>
  return <><p>{query.data.runtime_notice}</p><div className="agents-grid">{query.data.agents.map(agent=>{
    const installed=agent.state==='available';const runtime=agent.runtime;const release=agent.release
    return <section className="agent-card" key={agent.agent} data-agent={agent.agent}>
      <div className="agent-title"><h2 className={installed?'agent-installed':'agent-missing'}>{agent.label}</h2>{installed&&<><span className={'status-dot '+(runtime.running?'status-up':'status-down')} role="img" aria-label={runtime.running?'Agent démarré':'Agent non démarré'} title={runtime.running?'Processus de l’agent détecté':'Aucun processus de l’agent détecté'}/><span className="installed-version" aria-label="Version installée">{agent.version||'Version inconnue'}</span>{release.version&&release.version!==agent.version&&<a className="available-version" href={release.url} target="_blank" rel="noreferrer" title="Dernière release GitHub observée">GitHub : {release.version}</a>}</>}</div>
      {installed&&<div className="agent-info"><span>Binaire</span><code>{agent.path}</code></div>}
      <div className="agent-info connector-info"><span>Connecteur MCP CAB</span><div className="connector-line"><code>{agent.connector_path} mcp --agent {agent.connector_agent}</code><span className={'status-dot '+(runtime.mcp_connected?'status-up':'status-down')} role="img" aria-label={runtime.mcp_connected?'MCP connecté':runtime.mcp_state==='unverified'?'Connexion MCP non vérifiée':'MCP non connecté'} title={runtime.mcp_connected?'Transport MCP connecté : extrémités observées':runtime.mcp_state==='unverified'?'Observation du transport incomplète':'Aucun transport MCP connecté observé'}/></div></div>
      <McpVersions agent={agent.connector_agent}/>
      {release.status==='unavailable'&&<p className="release-note">Vérification GitHub indisponible ; dernière valeur connue conservée.</p>}
      {!release.version&&<p className="release-note">Vérification GitHub quotidienne planifiée.</p>}
      <details className="mcp-configurations"><summary>Configurations MCP</summary>{agent.mcp_configurations.map(profile=><div className="mcp-profile" key={profile.account+profile.path}><p><strong>{profile.account}</strong> · {states[profile.state]||profile.state}</p><code>{profile.path}</code>{profile.servers.length>0&&<ul>{profile.servers.map(server=><li key={server.name}><strong>{server.name}</strong> — {server.state==='disabled'?'Désactivé':'Déclaré'}</li>)}</ul>}</div>)}</details>
    </section>
  })}</div></>
}
