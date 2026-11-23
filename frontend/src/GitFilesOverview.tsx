import {actionMessage} from './ForgeActionOverview'
import {useEffect,useMemo,useRef,useState} from 'react'
import {api} from './api'

export function GitFilesOverview({projectId,kind,label,count}:{projectId:string;kind:string;label:string;count:number}){
  const [open,setOpen]=useState(false);const [page,setPage]=useState(0);const [search,setSearch]=useState('');const [content,setContent]=useState('');const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    if(!open){dialog.current?.close();return}
    dialog.current?.showModal();let active=true;setPage(0);setSearch('');setContent('');setError('')
    api<{content:string}>(`projects/${encodeURIComponent(projectId)}/git/files/${encodeURIComponent(kind)}`).then(result=>{if(active)setContent(result.content)}).catch(reason=>{if(active)setError(actionMessage(reason,'La liste des fichiers est temporairement indisponible.'))})
    return ()=>{active=false}
  },[open,projectId,kind])
  const displayLabel=label==='Conflits'?'en conflit':label.toLowerCase()
  const lines=useMemo(()=>{const query=search.trim().toLocaleLowerCase();return content?content.split('\n').filter(line=>!query||line.toLocaleLowerCase().includes(query)):[]},[content,search]);const pages=Math.max(1,Math.ceil(lines.length/500))
  return <><button type="button" className="agent-config-link" onClick={()=>setOpen(true)} aria-label={`Afficher les fichiers ${displayLabel}`}>{count}</button><dialog ref={dialog} className="lifecycle-dialog agent-config-dialog" aria-label={`Fichiers ${displayLabel}`} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><h2>Fichiers {displayLabel}</h2>{!content&&!error&&<p role="status">Chargement…</p>}{error&&<p role="alert">{error}</p>}{content&&<><pre className="agent-config-content git-commit-content">{lines.length?lines.slice(page*500,(page+1)*500).join("\n"):"Aucun résultat."}</pre><div className="git-overview-controls">{pages>1&&<><button type="button" disabled={page===0} onClick={()=>setPage(page-1)}>Précédent</button><span>Page {page+1} / {pages}</span><button type="button" disabled={page+1>=pages} onClick={()=>setPage(page+1)}>Suivant</button></>}<input type="search" aria-label="Rechercher dans les fichiers" placeholder="Rechercher…" value={search} onChange={event=>{setSearch(event.target.value);setPage(0)}}/></div></>}<div className="form-actions"><button type="button" onClick={()=>setOpen(false)}>Fermer</button></div></dialog></>
}
