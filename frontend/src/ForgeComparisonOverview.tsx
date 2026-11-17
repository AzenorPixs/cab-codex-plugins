import {useEffect,useRef,useState} from 'react'
import {api} from './api'
import {type ForgeComparison} from './Projects'

type Details={available:boolean;local:string;remote:string;ahead?:number;behind?:number;local_commits?:string;remote_commits?:string}
function countLabel(count:number,kind:'avance'|'retard'){
  return `${count} commit${count===1?'':'s'} ${kind==='avance'?"d’avance":"en retard"}`
}
export function ForgeComparisonOverview({projectId,forge,comparison,local,remote}:{projectId:string;forge:string;comparison?:ForgeComparison;local?:string;remote?:string}){
  const [open,setOpen]=useState(false);const [details,setDetails]=useState<Details|null>(null);const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null)
  const current=!!comparison&&comparison.local===(local||'')&&comparison.remote===(remote||'')
  const label=!current?(local&&remote?'Comparaison en cours…':'Comparaison indisponible'):!comparison.available?'Comparaison indisponible':comparison.ahead===0&&comparison.behind===0?'À jour':[comparison.behind?countLabel(comparison.behind,'retard'):'',comparison.ahead?countLabel(comparison.ahead,'avance'):''].filter(Boolean).join(' · ')
  useEffect(()=>{
    if(!open){dialog.current?.close();return}
    dialog.current?.showModal();let active=true;setDetails(null);setError('')
    api<Details>(`projects/${encodeURIComponent(projectId)}/forges/${encodeURIComponent(forge)}/comparison`).then(result=>{if(active)setDetails(result)}).catch(()=>{if(active)setError('La comparaison est temporairement indisponible.')})
    return ()=>{active=false}
  },[open,projectId,forge])
  return <><button type="button" className="agent-config-link" onClick={()=>setOpen(true)} aria-label={`Détail de l’état ${forge}`}>{label}</button><dialog ref={dialog} className="lifecycle-dialog agent-config-dialog" aria-label={`État ${forge}`} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><h2>État {forge}</h2>{!details&&!error&&<p role="status">Chargement…</p>}{error&&<p role="alert">{error}</p>}{details&&<><p>Commit Git local : <code>{details.local||'Indisponible'}</code><br/>Commit de la forge : <code>{details.remote||'Indisponible'}</code></p>{!details.available?<p>Comparaison indisponible : les commits nécessaires ne sont pas tous connus localement.</p>:<><p>La forge a {details.ahead??0} commit{details.ahead===1?'':'s'} d’avance et {details.behind??0} en retard sur Git local.</p>{!!details.local_commits&&<><h3>Commits locaux absents de la forge</h3><pre className="agent-config-content git-commit-content">{details.local_commits}</pre></>}{!!details.remote_commits&&<><h3>Commits de la forge absents localement</h3><pre className="agent-config-content git-commit-content">{details.remote_commits}</pre></>}{((details.ahead??0)>100||(details.behind??0)>100)&&<p>Liste limitée à 100 commits par direction.</p>}</>}</>}<div className="form-actions"><button type="button" onClick={()=>setOpen(false)}>Fermer</button></div></dialog></>
}
