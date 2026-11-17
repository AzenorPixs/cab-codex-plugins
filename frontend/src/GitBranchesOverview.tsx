import {useEffect,useRef,useState} from 'react'
import {api} from './api'

export function GitBranchesOverview({projectId,branch}:{projectId:string;branch:string}){
  const [open,setOpen]=useState(false);const [content,setContent]=useState('');const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    if(!open){dialog.current?.close();return}
    dialog.current?.showModal();let active=true;setContent('');setError('')
    api<{content:string}>(`projects/${encodeURIComponent(projectId)}/git/branches`).then(result=>{if(active)setContent(result.content)}).catch(()=>{if(active)setError('Les informations des branches sont temporairement indisponibles.')})
    return ()=>{active=false}
  },[open,projectId])
  return <><button type="button" className="agent-config-link" onClick={()=>setOpen(true)} aria-label={`Afficher les branches Git : ${branch}`}>{branch}</button><dialog ref={dialog} className="lifecycle-dialog agent-config-dialog" aria-label="Branches et dépôts Git" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><h2>Branches et dépôts Git</h2>{!content&&!error&&<p role="status">Chargement…</p>}{error&&<p role="alert">{error}</p>}{content&&<pre className="agent-config-content git-commit-content">{content}</pre>}<div className="form-actions"><button type="button" onClick={()=>setOpen(false)}>Fermer</button></div></dialog></>
}
