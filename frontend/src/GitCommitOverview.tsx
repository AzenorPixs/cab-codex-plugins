import {useEffect,useRef,useState} from 'react'
import {api} from './api'

export function GitCommitOverview({projectId,commit,forge,historyHead}:{projectId:string;commit:string;forge?:string;historyHead?:string}){
  const [open,setOpen]=useState(false);const [content,setContent]=useState('');const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    if(!open){dialog.current?.close();return}
    dialog.current?.showModal();let active=true;setContent('');setError('')
    api<{content:string}>(historyHead?`projects/${encodeURIComponent(projectId)}/git/history/commit/${encodeURIComponent(commit)}?${new URLSearchParams({head:historyHead})}`:forge?`projects/${encodeURIComponent(projectId)}/forges/${encodeURIComponent(forge)}/commit/${encodeURIComponent(commit)}`:`projects/${encodeURIComponent(projectId)}/git/commit/${encodeURIComponent(commit)}`).then(result=>{if(active)setContent(result.content)}).catch(()=>{if(active)setError('Le détail de ce commit est indisponible. Actualisez la page si le dépôt a changé.')})
    return ()=>{active=false}
  },[open,projectId,commit,forge,historyHead])
  return <><button type="button" className="agent-config-link" onClick={()=>setOpen(true)} aria-label={`Afficher ${historyHead?"le commit":"le dernier commit"} ${commit.slice(0,historyHead?8:12)}`}>{commit.slice(0,historyHead?8:12)}</button><dialog ref={dialog} className="lifecycle-dialog agent-config-dialog" aria-label={historyHead?"Détail du commit":"Dernier commit"} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><h2>{historyHead?"Détail du commit":"Dernier commit"}</h2>{!content&&!error&&<p role="status">Chargement…</p>}{error&&<p role="alert">{error}</p>}{content&&<pre className="agent-config-content git-commit-content">{content}</pre>}<div className="form-actions"><button type="button" onClick={()=>setOpen(false)}>Fermer</button></div></dialog></>
}
