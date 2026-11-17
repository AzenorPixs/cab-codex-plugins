import {useEffect,useRef,useState} from 'react'
import {api} from './api'

type Preview={nonce:string;branch:string;local_branch:string;head:string;remote:string|null;dirty:boolean}
export function ForgePush({projectId,forge,label}:{projectId:string;forge:string;label:string}){
  const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [preview,setPreview]=useState<Preview|null>(null);const [error,setError]=useState('');const [finished,setFinished]=useState(false);const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    if(!open){dialog.current?.close();return}
    if(!dialog.current?.open)dialog.current?.showModal()
    let active=true;setPreview(null);setError('');setFinished(false);setBusy(true)
    api<Preview>(`projects/${encodeURIComponent(projectId)}/forges/${encodeURIComponent(forge)}/push-prepare`,{}).then(result=>{if(active)setPreview(result)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Préparation indisponible.')}).finally(()=>{if(active)setBusy(false)})
    return ()=>{active=false}
  },[open,projectId,forge])
  const send=async()=>{if(!preview)return;setBusy(true);setError('');try{await api(`projects/${encodeURIComponent(projectId)}/forges/${encodeURIComponent(forge)}/push`,{nonce:preview.nonce});setFinished(true);setPreview(null)}catch(reason){setError(reason instanceof Error?reason.message:'Envoi non confirmé : vérifiez la forge avant toute reprise.');setPreview(null)}finally{setBusy(false)}}
  return <><button type="button" className={`forge-edit git-commit${busy?' is-loading':''}`} aria-label={`Envoyer vers ${label}`} title={`Envoyer vers ${label}`} aria-busy={busy} disabled={busy} onClick={()=>setOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg></button><dialog ref={dialog} className="lifecycle-dialog" aria-label={`Envoyer vers ${label}`} onCancel={event=>{if(busy)event.preventDefault();else setOpen(false)}} onClose={()=>setOpen(false)}><h2>Envoyer vers {label}</h2>{busy&&<p role="status">{preview?'Envoi en cours…':'Lecture de la branche distante…'}</p>}{preview&&<><p>Branche locale : <strong>{preview.local_branch}</strong><br/>Branche distante : <strong>{preview.branch}</strong><br/>Commit à envoyer : <code>{preview.head.slice(0,12)}</code><br/>Commit distant observé : <code>{preview.remote?.slice(0,12)||'Branche absente'}</code></p><p>L’envoi aligne la branche distante sur ce commit, avec vérification de sa valeur observée. Aucun tag n’est envoyé.</p>{preview.dirty&&<p>Les modifications locales non commitées ne seront pas envoyées.</p>}</>}{finished&&<p role="status">Branche envoyée.</p>}{error&&<p role="alert">{error}</p>}<div className="form-actions">{preview&&<button type="button" onClick={()=>void send()} disabled={busy}>Envoyer</button>}<button type="button" onClick={()=>setOpen(false)} disabled={busy}>{preview?'Annuler':'Fermer'}</button></div></dialog></>
}
