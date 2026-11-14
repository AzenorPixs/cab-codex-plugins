import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {Shape,ShapeStream} from '@electric-sql/client'

type Connector={id:string;agent:string;uid:number;version:string;catalog:string;relay:string;state:string;connected:boolean}
const Connections=createContext<Connector[]>([])
export function McpConnectionsProvider({children}:{children:ReactNode}){
  const [rows,setRows]=useState<Connector[]>([]);const [epoch,setEpoch]=useState(0)
  useEffect(()=>{const refresh=()=>setEpoch(value=>value+1);window.addEventListener('cab-auth-changed',refresh);return ()=>window.removeEventListener('cab-auth-changed',refresh)},[])
  useEffect(()=>{
    const controller=new AbortController();setRows([])
    let unsubscribe=()=>{};let retry:ReturnType<typeof setTimeout>|undefined
    async function connect(){
      try{
        const response=await fetch('/api/v1/projects',{credentials:'same-origin',signal:controller.signal})
        if(controller.signal.aborted)return
        if(response.status===401||response.status===403)return
        if(!response.ok){retry=setTimeout(()=>void connect(),2000);return}
        const stream=new ShapeStream({url:new URL('/api/v1/sync/connectors',location.origin).href,signal:controller.signal,onError:()=>{setRows([]);return {}}})
        const shape=new Shape(stream)
        unsubscribe=shape.subscribe(({rows})=>setRows(rows.map(row=>({id:String(row.connector_id),agent:String(row.agent),uid:Number(row.uid),version:String(row.loaded_version||''),catalog:String(row.catalog_version||''),relay:String(row.relay_version||''),state:String(row.state),connected:row.connected===true||String(row.connected)==='true'}))))
      }catch{if(!controller.signal.aborted)retry=setTimeout(()=>void connect(),2000)}
    }
    void connect()
    return ()=>{if(retry)clearTimeout(retry);unsubscribe();controller.abort()}
  },[epoch])
  return <Connections.Provider value={rows}>{children}</Connections.Provider>
}
function label(agent:string){return agent==='codex'?'Codex':agent==='codex-cli'?'Codex CLI':agent==='opencode'?'OpenCode':agent}
export function McpVersions({agent,header=false}:{agent?:string;header?:boolean}){
  const rows=useContext(Connections).filter(row=>row.connected&&row.version&&(!agent||row.agent===agent))
  const groups=new Map<string,Connector[]>()
  for(const row of rows){const key=row.agent+':'+row.version;groups.set(key,[...(groups.get(key)||[]),row])}
  if(!groups.size)return header?null:<small className="configuration-help">Version MCP connectée non observée.</small>
  return <div className={header?'mcp-live-versions header-mcp-versions':'mcp-live-versions'} aria-label="Versions MCP connectées">{[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,items])=>{
    const row=items[0];const catalog=[...new Set(items.map(item=>item.catalog||'non relu'))].join(', ');const relay=[...new Set(items.map(item=>item.relay||'non observé'))].join(', ')
    return <span className="mcp-live-badge" key={key} data-agent={row.agent} data-version={row.version} title={`${items.length} connexion(s) · catalogue : ${catalog} · relais : ${relay}`}><span className="status-dot status-up" role="img" aria-label="MCP connecté"/>MCP {label(row.agent)} v{row.version}</span>
  })}</div>
}
