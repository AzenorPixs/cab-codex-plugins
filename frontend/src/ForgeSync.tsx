import {useEffect,useRef,useState} from 'react'
import {api} from './api'
import {canVerifyForgeOperation,VerifyForgeOperation} from './ForgePush'

type Source='local'|'remote'
type Change={ref:string;before:string;after:string;action:'créer'|'modifier'|'supprimer'}
type Preview={nonce:string;branch:string;local_branch:string;head:string;remote:string|null;dirty:boolean;changes:Change[];source:Source}

export function ForgeSync({projectId,forge,label}:{projectId:string;forge:string;label:string}){
  const [open,setOpen]=useState(false)
  const [source,setSource]=useState<Source|null>(null)
  const [busy,setBusy]=useState(false)
  const [preview,setPreview]=useState<Preview|null>(null)
  const [error,setError]=useState('')
  const [finished,setFinished]=useState(false)
  const [canVerify,setCanVerify]=useState(false)
  const [attempt,setAttempt]=useState(0)
  const dialog=useRef<HTMLDialogElement>(null)
  const path=`projects/${encodeURIComponent(projectId)}/forges/${encodeURIComponent(forge)}`

  useEffect(()=>{
    if(open&&!dialog.current?.open)dialog.current?.showModal()
    if(!open&&dialog.current?.open)dialog.current.close()
  },[open])
  useEffect(()=>{
    if(!open||!source)return
    let active=true
    setPreview(null);setError('');setFinished(false);setCanVerify(false);setBusy(true)
    api<Preview>(`${path}/sync-prepare`,{source}).then(result=>{if(active)setPreview(result)})
      .catch(reason=>{if(active){
        setCanVerify(canVerifyForgeOperation(reason))
        setError(reason instanceof Error?reason.message:'Comparaison indisponible.')
      }}).finally(()=>{if(active)setBusy(false)})
    return ()=>{active=false}
  },[open,path,source,attempt])

  const close=()=>{
    setOpen(false);setSource(null);setPreview(null);setError('');setFinished(false);setCanVerify(false)
  }
  const synchronize=async()=>{
    if(!preview)return
    setBusy(true);setError('')
    try{
      await api(`${path}/sync`,{nonce:preview.nonce})
      setFinished(true);setPreview(null)
    }catch(reason){
      setCanVerify(canVerifyForgeOperation(reason))
      setError(reason instanceof Error?reason.message:'Synchronisation non confirmée.')
      setPreview(null)
    }finally{setBusy(false)}
  }

  const reverse=source==='remote'
  const sourceBranch=reverse?preview?.branch:preview?.local_branch
  const targetBranch=reverse?preview?.local_branch:preview?.branch
  const sourceHead=reverse?preview?.remote:preview?.head
  const targetHead=reverse?preview?.head:preview?.remote
  return <>
    <button type="button" className={`forge-edit git-commit forge-sync-action${busy?' is-loading':''}`} aria-label={`Synchroniser ${label}`} title={`Synchroniser ${label}`} aria-busy={busy} disabled={busy} onClick={()=>setOpen(true)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.3 5A7 7 0 0 0 18 15"/><path d="M9 12h6"/></svg>
    </button>
    <dialog ref={dialog} className="lifecycle-dialog agent-config-dialog" style={{whiteSpace:'normal',overflowWrap:'anywhere'}} aria-label={`Synchroniser ${label}`}
      onCancel={event=>{if(busy)event.preventDefault();else close()}} onClose={close}>
      <h2>Synchroniser {label}</h2>
      {!source&&<>
        <p>Quel dépôt doit servir de source ?</p>
        <div className="form-actions">
          <button type="button" onClick={()=>setSource('local')}>Git local → Forge distante</button>
          <button type="button" onClick={()=>setSource('remote')}>Forge distante → Git local</button>
        </div>
      </>}
      {busy&&<p role="status">{preview?'Synchronisation en cours…':canVerify?'Vérification des références…':'Comparaison de la branche et des tags…'}</p>}
      {preview&&<>
        <p>Source {reverse?label:'Git local'} · <strong>{sourceBranch}</strong> · <code>{sourceHead?.slice(0,12)}</code><br/>
          Destination {reverse?'Git local':label} · <strong>{targetBranch}</strong> · <code>{targetHead?.slice(0,12)||'Branche absente'}</code></p>
        <p>La branche destinataire et ses tags seront alignés sur la source. Les tags qui existent uniquement dans la destination seront supprimés. Les autres branches resteront intactes.</p>
        {preview.dirty&&!reverse&&<p>Les modifications locales non commitées resteront locales.</p>}
        <h3>Modifications des tags</h3>
        {preview.changes.length?<div className="agent-config-content" style={{maxHeight:'35vh',overflow:'auto'}}><ul>
          {preview.changes.map(change=><li key={change.ref}><strong>{change.action}</strong> · <code>{change.ref.slice('refs/tags/'.length)}</code>{change.before&&<> · {change.before.slice(0,12)}</>}{change.after&&<> → {change.after.slice(0,12)}</>}</li>)}
        </ul></div>:<p>Aucun tag à modifier.</p>}
      </>}
      {finished&&<p role="status">{reverse?'Dépôt local aligné sur la forge.':'Forge alignée sur Git local.'}</p>}
      {error&&<p role="alert">{error}</p>}
      <div className="form-actions">
        {open&&canVerify&&<VerifyForgeOperation path={path} busy={busy} onBusy={setBusy} onVerified={()=>setError('')} onPrepare={()=>setAttempt(value=>value+1)}/>}
        {preview&&<button type="button" onClick={()=>void synchronize()} disabled={busy}>Synchroniser</button>}
        <button type="button" onClick={close} disabled={busy}>{preview?'Annuler':'Fermer'}</button>
      </div>
    </dialog>
  </>
}
