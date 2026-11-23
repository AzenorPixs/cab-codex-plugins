import {useEffect,useRef,useState} from 'react'
import {api} from './api'

type RefreshState={running:boolean;started_at:number|null}
type RefreshResult={available:boolean;diagnostics?:string}
export function ForgeRefresh({projectId,forge,label,ready,shared,onError}:{projectId:string;forge:string;label:string;ready:boolean;shared?:RefreshState;onError:(message:string)=>void}){
  const [busy,setBusy]=useState(false);const [now,setNow]=useState(()=>Date.now())
  const [diagnostic,setDiagnostic]=useState<string|null>(null)
  const dialog=useRef<HTMLDialogElement>(null)
  const attempt=useRef<symbol|null>(null)
  const path=`projects/${encodeURIComponent(projectId)}/forges/${encodeURIComponent(forge)}/refresh`
  useEffect(()=>{
    setBusy(false)
    setDiagnostic(null)
    return ()=>{attempt.current=null}
  },[path])
  useEffect(()=>{
    if(diagnostic!==null&&!dialog.current?.open)dialog.current?.showModal()
    if(diagnostic===null&&dialog.current?.open)dialog.current.close()
  },[diagnostic])
  useEffect(()=>{if(!shared?.running)return;const timer=window.setInterval(()=>setNow(Date.now()),5000);return ()=>window.clearInterval(timer)},[shared?.running,shared?.started_at])
  useEffect(()=>{
    if(!ready)return
    let active=true
    api<RefreshResult>(`${path}?automatic=true`,{}).catch(()=>{if(active)onError(`La vérification ${label} est temporairement indisponible.`)})
    return ()=>{active=false}
  },[ready,path,label,onError])
  const live=!!shared?.running&&typeof shared.started_at==='number'&&now/1000-shared.started_at<180
  const spinning=busy||live
  const refresh=async()=>{
    if(attempt.current)return
    const current=Symbol()
    attempt.current=current
    setBusy(true)
    onError('')
    try{
      const result=await api<RefreshResult>(path,{})
      if(attempt.current===current&&!result.available){
        setDiagnostic(result.diagnostics||'CAB n’a renvoyé aucun détail pour cette tentative.')
      }
    }catch(error){
      if(attempt.current===current){
        setDiagnostic(error instanceof Error ? error.message : 'La réponse de CAB est indisponible.')
      }
    }finally{
      if(attempt.current===current){
        attempt.current=null
        setBusy(false)
      }
    }
  }
  return <>
    <button type="button" className={`forge-edit git-refresh${spinning?' is-loading':''}`} aria-label={`Rafraîchir l’état ${label}`} title={`Rafraîchir l’état ${label}`} aria-busy={spinning} disabled={spinning} onClick={()=>void refresh()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.2 9a7 7 0 0 1 11.4-2L20 12M4 12l2.4 5a7 7 0 0 0 11.4-2"/></svg></button>
    <dialog ref={dialog} className="lifecycle-dialog git-commit-console-dialog" aria-label={`Détail du rafraîchissement ${label}`} onClose={()=>setDiagnostic(null)}>
      <h2>Détail du rafraîchissement {label}</h2>
      <p role="alert">La vérification {label} est indisponible.</p>
      <pre className="git-commit-console" aria-label={`Console du rafraîchissement ${label}`}>{diagnostic}</pre>
      <div className="form-actions"><button type="button" onClick={()=>setDiagnostic(null)} autoFocus>Fermer</button></div>
    </dialog>
  </>
}
