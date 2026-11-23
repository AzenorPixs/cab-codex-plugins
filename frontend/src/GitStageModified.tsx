import {useEffect,useRef,useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {api} from './api'

type Preview={files:{path:string;status:string}[];digest:string}
export function GitStageModified({projectId}:{projectId:string}){
  const [open,setOpen]=useState(false);const [preview,setPreview]=useState<Preview|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null);const client=useQueryClient()
  useEffect(()=>{
    if(!open){dialog.current?.close();return}
    if(!dialog.current?.open)dialog.current?.showModal();let active=true;setPreview(null);setError('')
    api<Preview>(`projects/${encodeURIComponent(projectId)}/git/stage-modified`).then(value=>{if(active)setPreview(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Liste indisponible.')})
    return ()=>{active=false}
  },[open,projectId])
  const stage=async()=>{if(!preview?.files.length)return;setBusy(true);setError('');try{await api(`projects/${encodeURIComponent(projectId)}/git/stage-modified`,{digest:preview.digest});await client.invalidateQueries({queryKey:['projects']});setOpen(false)}catch(reason){setPreview(null);setError(reason instanceof Error?reason.message:'Indexation non confirmée.') }finally{setBusy(false)}}
  return <><button type="button" className="forge-edit" aria-label="Indexer tous les fichiers modifiés" title="Indexer tous les fichiers modifiés" onClick={()=>setOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button><dialog ref={dialog} className="lifecycle-dialog agent-config-dialog" style={{whiteSpace:'normal',overflowWrap:'anywhere'}} aria-label="Indexer les fichiers modifiés" onCancel={event=>{if(busy)event.preventDefault();else setOpen(false)}} onClose={()=>setOpen(false)}><h2>Indexer les fichiers modifiés</h2><p>Ces fichiers suivis seront ajoutés à l’index. Les fichiers non suivis ne sont pas inclus.</p>{!preview&&!error&&<p role="status">Lecture des fichiers…</p>}{preview&&(preview.files.length?<div className="agent-config-content" style={{maxHeight:'45vh',overflow:'auto'}}><ul>{preview.files.map(file=><li key={file.path}><strong>{file.status==='D'?'Supprimé':'Modifié'}</strong> · <code>{file.path}</code></li>)}</ul></div>:<p>Aucun fichier modifié à indexer.</p>)}{error&&<p role="alert">{error}</p>}{busy&&<p role="status">Indexation en cours…</p>}<div className="form-actions"><button type="button" onClick={()=>void stage()} disabled={busy||!preview?.files.length}>Valider</button><button type="button" onClick={()=>setOpen(false)} disabled={busy}>Annuler</button></div></dialog></>
}
