import {useEffect,type ReactNode} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'

type UpdateState={request_id:string;state:string;version?:string;error?:string;package_state?:string;connectors?:{agent:string;uid:number;state:string;loaded_version:string|null;catalog_version:string|null;reason:string}[]}
type Availability={current_version:string;latest_version:string|null;update_available:boolean;checked_at:string|null;next_check_at:string|null;error:string|null}

function useSystemUpdate(){
  const client=useQueryClient()
  const available=useQuery({queryKey:['update-availability'],queryFn:()=>api<Availability>('updates/availability'),refetchInterval:5000})
  const request=useQuery({queryKey:['system-update-request'],queryFn:async()=>sessionStorage.getItem('cab-system-update')||'',initialData:()=>sessionStorage.getItem('cab-system-update')||'',enabled:false})
  const requestId=request.data||''
  const start=useMutation({mutationFn:(data:{request_id:string;version:string})=>api<UpdateState>('command',{name:'system.update',data}),onSuccess:value=>client.setQueryData(['system-update',value.request_id],value),onError:error=>{if(['Connectez-vous à votre compte CAB.','actor-authorization-required','update-already-active','update-version-invalid','update-admission-conflict'].includes(error.message)){sessionStorage.removeItem('cab-system-update');client.setQueryData(['system-update-request'],'')}}})
  const update=useQuery({queryKey:['system-update',requestId],queryFn:()=>api<UpdateState>('command',{name:'system.update.status',data:{request_id:requestId}}),enabled:!!requestId,refetchInterval:query=>['OK','FAILED','UNKNOWN'].includes(query.state.data?.state||'')?false:2000})
  const state=update.data?.state;const pending=!!requestId&&!['OK','FAILED'].includes(state||'')
  useEffect(()=>{
    if(state==='OK'){
      sessionStorage.removeItem('cab-system-update');client.invalidateQueries({queryKey:['update-availability']})
      const shown=document.querySelector('.brand span')?.textContent
      if(shown&&update.data?.version&&shown!==update.data.version)location.reload()
    }
  },[state,update.data?.version,client])
  function begin(version=available.data?.latest_version||''){const id='web-update-'+crypto.randomUUID();sessionStorage.setItem('cab-system-update',id);client.setQueryData(['system-update-request'],id);start.mutate({request_id:id,version})}
  return {available,update,start,pending,state,begin}
}

export function HomeVersionCheck(){
  const client=useQueryClient()
  useEffect(()=>{api('command',{name:'system.update.check',data:{}}).then(()=>client.invalidateQueries({queryKey:['update-availability']})).catch(()=>{/* Le contrôle ne bloque pas le rendu ni la navigation. */})},[client])
  return null
}

export function UpdateBadge(){
  const {available,update,start,pending,state,begin}=useSystemUpdate()
  if(!available.data?.update_available&&!pending&&state!=='FAILED')return null
  const label=state==='RELOAD_REQUIRED'?'Reconnexion MCP requise':state==='RECONNECTING'?'Reconnexion MCP…':state==='UNKNOWN'?'Vérification requise':pending?'Mise à jour en cours…':'Mise à jour'
  return <span className="cab-update-control"><button type="button" onClick={()=>begin()} disabled={pending} title={state==='FAILED'?(update.data?.error||'Échec de mise à jour'):available.data?.latest_version?`Version ${available.data.latest_version}`:'Mise à jour CAB'}>{label}</button>{start.error&&<small role="alert">{start.error.message}</small>}</span>
}

export function SystemUpdatePage({login}:{login:ReactNode}){
  const client=useQueryClient();const access=useQuery({queryKey:['service-configuration'],queryFn:()=>api('administration/configuration')})
  const {available,update,start,pending,state,begin}=useSystemUpdate()
  const check=useMutation({mutationFn:()=>api<Availability>('command',{name:'system.update.check',data:{force:true}}),onSuccess:value=>client.setQueryData(['update-availability'],value)})
  const admitted=access.isSuccess
  useEffect(()=>{if(admitted)check.mutate()},[admitted])
  if(access.isPending)return <p role="status">Connexion à l’administration…</p>
  if(access.error)return login
  return <section className="administration system-update-page"><p className="eyebrow">ADMINISTRATION</p><h1>Mise à jour de CAB</h1><div className="update-versions"><article className="agent-card"><h2>Version locale</h2><strong>{available.data?.current_version||'Chargement…'}</strong></article><article className="agent-card"><h2>Version en ligne</h2><strong>{available.data?.latest_version||'Non vérifiée'}</strong>{available.data?.checked_at&&<p>Vérifiée le {new Date(available.data.checked_at).toLocaleString('fr-FR')}</p>}{available.data?.error&&<p role="status">GitHub est temporairement indisponible ; dernière valeur connue conservée.</p>}</article></div><p>La vérification GitHub est demandée à chaque ouverture de cette page, en arrière-plan.</p><button type="button" onClick={()=>begin('')} disabled={pending}>{pending?'Mise à jour en cours…':'Mettre à jour CAB'}</button>{pending&&<p role="status">{state||'Demande en cours'} · CAB conduit la mise à jour. Vous pouvez continuer à naviguer.</p>}{state==='RELOAD_REQUIRED'&&<p role="alert">Le paquet est installé et le service vérifié. Un ancien connecteur nécessite une reconnexion MCP depuis son client natif. Les sessions et reçus sont conservés ; ne relancez pas l’installation.</p>}{state==='RECONNECTING'&&<p role="status">Installation vérifiée. CAB attend une frontière sûre et la relecture du catalogue MCP par les clients.</p>}{update.data?.connectors&&update.data.connectors.length>0&&<section><h2>Connecteurs MCP</h2><ul>{update.data.connectors.map((item,index)=><li key={index}>{item.agent} · UID {item.uid} · {item.state} · moteur {item.loaded_version||'ancien non vérifié'} · catalogue {item.catalog_version||'à recharger'}</li>)}</ul></section>}{state==='OK'&&<p role="status">OK · Version {update.data?.version} activée et vérifiée.</p>}{state==='FAILED'&&<p role="alert">La mise à jour a échoué : {update.data?.error}</p>}{state==='UNKNOWN'&&<p role="alert">Le résultat doit être réconcilié. Aucune nouvelle installation n’est émise.</p>}{start.error&&<p role="alert">{start.error.message}</p>}{check.error&&<p role="status">La vérification n’a pas pu être demandée ; l’affichage reste disponible.</p>}</section>
}
