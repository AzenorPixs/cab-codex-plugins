import {useEffect,useState} from 'react'
import {api} from './api'

type RefreshState={running:boolean;started_at:number|null}
export function ForgeRefresh({projectId,forge,label,ready,shared,onError}:{projectId:string;forge:string;label:string;ready:boolean;shared?:RefreshState;onError:(message:string)=>void}){
  const [busy,setBusy]=useState(false);const [now,setNow]=useState(()=>Date.now())
  useEffect(()=>{if(!shared?.running)return;const timer=window.setInterval(()=>setNow(Date.now()),5000);return ()=>window.clearInterval(timer)},[shared?.running,shared?.started_at])
  useEffect(()=>{
    if(!ready)return
    let active=true
    api<{available:boolean}>(`projects/${encodeURIComponent(projectId)}/forges/${encodeURIComponent(forge)}/refresh?automatic=true`,{}).catch(()=>{if(active)onError(`La vérification ${label} est temporairement indisponible.`)})
    return ()=>{active=false}
  },[ready,projectId,forge,label,onError])
  const live=!!shared?.running&&typeof shared.started_at==='number'&&now/1000-shared.started_at<180
  const spinning=busy||live
  const refresh=async()=>{setBusy(true);onError('');try{const result=await api<{available:boolean}>(`projects/${encodeURIComponent(projectId)}/forges/${encodeURIComponent(forge)}/refresh`,{});if(!result.available)onError(`La vérification ${label} est indisponible.`)}catch{onError(`La vérification ${label} est temporairement indisponible.`)}finally{setBusy(false)}}
  return <button type="button" className={`forge-edit git-refresh${spinning?' is-loading':''}`} aria-label={`Rafraîchir l’état ${label}`} title={`Rafraîchir l’état ${label}`} aria-busy={spinning} disabled={spinning} onClick={()=>void refresh()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.2 9a7 7 0 0 1 11.4-2L20 12M4 12l2.4 5a7 7 0 0 0 11.4-2"/></svg></button>
}
