import {useEffect,useRef,useState} from 'react'
import {streamGitCommit} from './api'

export function ForgeAuthOverview({projectId,forge,label,state}:{projectId:string;forge:string;label:string;state?:boolean|null}){
  const [open,setOpen]=useState(false);const [attempt,setAttempt]=useState(0);const [busy,setBusy]=useState(false);const [output,setOutput]=useState('');const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null);const consoleRef=useRef<HTMLPreElement>(null)
  useEffect(()=>{
    if(!open){dialog.current?.close();return}
    if(!dialog.current?.open)dialog.current?.showModal()
    let active=true;setBusy(true);setOutput('');setError('')
    streamGitCommit<{state:boolean|null}>(`projects/${encodeURIComponent(projectId)}/forges/${encodeURIComponent(forge)}/authenticate-stream`,{},text=>{if(active)setOutput(old=>(old+text).slice(-131072))}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'La vérification a échoué.')}).finally(()=>{if(active)setBusy(false)})
    return ()=>{active=false}
  },[open,attempt,projectId,forge])
  useEffect(()=>{if(consoleRef.current)consoleRef.current.scrollTop=consoleRef.current.scrollHeight},[output])
  const status=state===true?'Authentification réussie':state===false?'Authentification échouée':'Authentification non vérifiée'
  return <><button type="button" className="forge-auth forge-auth-action" onClick={()=>setOpen(true)} aria-label={`Suivre l’authentification ${label}`} title={status}>API <span className={state===true?'agent-installed':state===false?'agent-missing':'forge-auth-unknown'} role="img" aria-label={status}>{state===true?'✓':state===false?'✕':'...'}</span></button><dialog ref={dialog} className="lifecycle-dialog git-commit-console-dialog" aria-label={`Authentification ${label}`} onCancel={event=>{if(busy)event.preventDefault();else setOpen(false)}} onClose={()=>setOpen(false)}><h2>Authentification {label}</h2><pre ref={consoleRef} className="git-commit-console" aria-label={`Console d’authentification ${label}`}>{output||'Préparation de la vérification…'}</pre>{busy&&<p role="status">Vérification en cours…</p>}{error&&<p role="alert">{error}</p>}<div className="form-actions"><button type="button" onClick={()=>setAttempt(value=>value+1)} disabled={busy}>Relancer</button><button type="button" onClick={()=>setOpen(false)} disabled={busy}>Fermer</button></div></dialog></>
}
