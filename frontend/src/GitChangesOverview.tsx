import {actionMessage} from './ForgeActionOverview'
import {useEffect,useRef,useState} from 'react'
import {api} from './api'

export function GitChangesOverview({projectId,count}:{projectId:string;count?:number}){
  const [open,setOpen]=useState(false);const [search,setSearch]=useState('');const [content,setContent]=useState('');const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    if(!open){dialog.current?.close();return}
    dialog.current?.showModal();let active=true;setSearch('');setContent('');setError('')
    api<{content:string}>(`projects/${encodeURIComponent(projectId)}/git/changes`).then(result=>{if(active)setContent(result.content)}).catch(reason=>{if(active)setError(actionMessage(reason,'Les modifications Git sont temporairement indisponibles.'))})
    return ()=>{active=false}
  },[open,projectId])
  const query=search.trim().toLocaleLowerCase();const lines=content.split('\n').filter(line=>!query||line.toLocaleLowerCase().includes(query))
  return <><button type="button" className="agent-config-link" onClick={()=>setOpen(true)} aria-label="Afficher les modifications non indexées">{count??"Modifications"}</button><dialog ref={dialog} className="lifecycle-dialog agent-config-dialog" aria-label="Modifications non indexées" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><h2>Modifications non indexées</h2>{!content&&!error&&<p role="status">Chargement…</p>}{error&&<p role="alert">{error}</p>}{content&&<><pre className="agent-config-content git-commit-content">{lines.length?lines.join("\n"):"Aucun résultat."}</pre><div className="git-overview-controls"><input type="search" aria-label="Rechercher dans les modifications" placeholder="Rechercher…" value={search} onChange={event=>setSearch(event.target.value)}/></div></>}<div className="form-actions"><button type="button" onClick={()=>setOpen(false)}>Fermer</button></div></dialog></>
}
