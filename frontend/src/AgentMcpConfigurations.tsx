import {useEffect,useState} from 'react'
import {Shape,ShapeStream} from '@electric-sql/client'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'

type AgentUser={id:number;username:string;home:string;config_present:boolean|null;config_path:string;mcp_declared:boolean|null;config_error:string;reconcile_state:string}
type AgentUsers={users:AgentUser[]}
const boolean=(value:unknown):boolean|null=>value===true||value==='true'?true:value===false||value==='false'?false:null

export function AgentMcpConfigurations({agent}:{agent:string}){
  const client=useQueryClient()
  const query=useQuery({queryKey:['agent-users',agent],queryFn:()=>api<AgentUsers>('administration/agent-users?'+new URLSearchParams({agent}))})
  const [error,setError]=useState('')
  const identities=(query.data?.users||[]).map(user=>user.id).sort((a,b)=>a-b).join(',')
  useEffect(()=>{
    const controller=new AbortController()
    const url=new URL('/api/v1/sync/agent-users',location.origin);url.searchParams.set('agent',agent)
    const stream=new ShapeStream({url:url.href,signal:controller.signal,onError:()=>({})})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>client.setQueryData<AgentUsers>(['agent-users',agent],{users:rows.map(row=>({id:Number(row.id),username:String(row.username),home:String(row.home),config_present:boolean(row.config_present),config_path:String(row.config_path||''),mcp_declared:boolean(row.mcp_declared),config_error:String(row.config_error||''),reconcile_state:String(row.reconcile_state||'IDLE')})).sort((a,b)=>a.username.localeCompare(b.username,'fr',{sensitivity:'base'}))}))
    return ()=>{unsubscribe();controller.abort()}
  },[agent,client])
  useEffect(()=>{
    if(!query.data)return
    let active=true;let running=false;setError('')
    const reconcile=async()=>{
      if(running)return
      running=true
      try{await api('administration/agent-users/reconcile',{agent});if(active)setError('')}
      catch(reason){if(active)setError(reason instanceof Error?reason.message:'Réconciliation indisponible')}
      finally{running=false}
    }
    void reconcile()
    const timer=window.setInterval(()=>{void reconcile()},5000)
    return ()=>{active=false;window.clearInterval(timer)}
  },[agent,identities,Boolean(query.data)])
  return <section className="agent-card"><h2 className="agent-block-heading">Configuration MCP</h2><div className="agent-card-content">{query.error&&<p role="alert">Configurations indisponibles : {query.error.message}</p>}{query.data?.users.map(user=><p className="mcp-user-status" key={user.id}><strong>{user.username}</strong> · <span className={user.mcp_declared===true?'agent-installed':'agent-missing'}>{user.mcp_declared===true?'OK':'NOK'}</span> · <strong>MCP cab</strong> · <span className={user.mcp_declared===true?'agent-installed':'agent-missing'}>{user.mcp_declared===true?'Déclaré':user.mcp_declared===false?'Non Déclaré':'À vérifier'}</span></p>)}{query.data&&query.data.users.length>0&&error&&<p role="alert">{error}</p>}</div></section>
}
