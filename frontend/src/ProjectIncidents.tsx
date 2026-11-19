import {useEffect,useRef,useState} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'
import {type Project} from './Projects'
import './ProjectIncidents.css'

type RecordValue=Record<string,unknown>
type Incident={incident_id:string;project_id:string;run_id:string|null;category:string;summary:string;evidence:RecordValue[];state:string;claim:RecordValue;resolution:RecordValue;created:string;purge_revision?:string|null}
type Registry={incidents:Incident[];total:number;page:number;page_size:number;has_next:boolean}
const record=(value:unknown):value is RecordValue=>!!value&&typeof value==='object'&&!Array.isArray(value)
function registry(value:unknown):Registry{
  if(!record(value)||!Array.isArray(value.incidents)||!Number.isSafeInteger(value.total)||Number(value.total)<0||!Number.isSafeInteger(value.page)||Number(value.page)<1||!Number.isSafeInteger(value.page_size)||Number(value.page_size)<1||typeof value.has_next!=='boolean')throw new Error('Registre CCAB invalide.')
  for(const row of value.incidents){
    if(!record(row)||!['incident_id','project_id','category','summary','state','created'].every(key=>typeof row[key]==='string')||(row.run_id!==null&&typeof row.run_id!=='string')||(row.purge_revision!=null&&typeof row.purge_revision!=='string')||!Array.isArray(row.evidence)||!row.evidence.every(record)||!record(row.claim)||!record(row.resolution))throw new Error('Déclaration CCAB invalide.')
  }
  return value as Registry
}
const stateLabel=(state:string)=>{const labels:Record<string,string>={OPEN:'Ouvert',CLAIMED:'Pris en charge',RESOLVED:'Résolu'};return Object.hasOwn(labels,state)?labels[state]:state}
const text=(value:unknown)=>typeof value==='string'&&value?value:'—'
function date(value:string|number|undefined){
  if(value===undefined)return '—'
  const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('fr-FR')
}
function IncidentOverview({incident,project,close}:{incident:Incident;project:Project;close:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const element=dialog.current;if(element){element.showModal();element.scrollTop=0;element.querySelector('h2')?.focus({preventScroll:true})}},[])
  const until=typeof incident.claim.until==='number'?incident.claim.until*1000:undefined
  return <dialog ref={dialog} className="lifecycle-dialog ccab-dialog" aria-labelledby="ccab-detail-title" onCancel={close} onClose={close}>
    <h2 id="ccab-detail-title" tabIndex={-1}>Déclaration CCAB</h2>
    <dl className="ccab-detail-grid"><div><dt>Identifiant</dt><dd>{incident.incident_id}</dd></div><div><dt>Catégorie</dt><dd>{incident.category}</dd></div><div><dt>État</dt><dd>{stateLabel(incident.state)}</dd></div><div><dt>Déclaré le</dt><dd>{date(incident.created)}</dd></div><div><dt>Projet</dt><dd>{project.identifier||project.name}</dd></div><div><dt>RUN</dt><dd>{incident.run_id||'—'}</dd></div></dl>
    <h3>Résumé</h3><p className="ccab-detail-text">{incident.summary}</p>
    <h3>Preuves ({incident.evidence.length})</h3>{incident.evidence.length?<ol className="ccab-evidence">{incident.evidence.map((item,index)=><li key={index}><span>{text(item.reference)}</span><code>{text(item.sha256)}</code></li>)}</ol>:<p>Aucune preuve enregistrée.</p>}
    <h3>Prise en charge</h3>{Object.keys(incident.claim).length?<dl className="ccab-detail-grid"><div><dt>Identifiant du claim</dt><dd>{text(incident.claim.id)}</dd></div><div><dt>Responsable</dt><dd>{text(incident.claim.actor)}</dd></div><div><dt>Bail jusqu’au</dt><dd>{date(until)}{until!==undefined&&until<Date.now()?' · Expiré':''}</dd></div></dl>:<p>Aucune prise en charge enregistrée.</p>}
    <h3>Résolution</h3>{Object.keys(incident.resolution).length?<pre>{JSON.stringify(incident.resolution,null,2)}</pre>:<p>Aucune résolution enregistrée.</p>}
    <details><summary>Déclaration complète (JSON)</summary><pre>{JSON.stringify(incident,null,2)}</pre></details>
    <div className="form-actions"><button type="button" onClick={close}>Fermer</button></div>
  </dialog>
}
function IncidentPurge({incident,close}:{incident:Incident;close:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  const queryClient=useQueryClient()
  useEffect(()=>{dialog.current?.showModal()},[])
  const purge=useMutation({
    mutationFn:()=>api<{status:string}>(`projects/${encodeURIComponent(incident.project_id)}/incidents/${encodeURIComponent(incident.incident_id)}/purge`,{expected_revision:incident.purge_revision}),
    onSuccess:async()=>{
      await queryClient.invalidateQueries({queryKey:['project-incidents',incident.project_id]})
      close()
    },
  })
  return <dialog ref={dialog} className="lifecycle-dialog" aria-labelledby="ccab-purge-title"
    onCancel={event=>{event.preventDefault();if(!purge.isPending)close()}}>
    <h2 id="ccab-purge-title">Supprimer la déclaration CCAB</h2>
    <p>Confirmer la suppression définitive de <strong>{incident.incident_id}</strong> du registre ?</p>
    {purge.error&&<p role="alert">{purge.error.message}</p>}
    <div className="form-actions">
      <button type="button" autoFocus disabled={purge.isPending} onClick={close}>Annuler</button>
      <button type="button" disabled={purge.isPending} onClick={()=>purge.mutate()}>{purge.isPending?'Suppression…':'Supprimer'}</button>
    </div>
  </dialog>
}
export function ProjectIncidents({project}:{project:Project}){
  const [page,setPage]=useState(1);const [selected,setSelected]=useState<Incident|null>(null)
  const [purgeTarget,setPurgeTarget]=useState<Incident|null>(null)
  const query=useQuery({queryKey:['project-incidents',project.id,page],queryFn:async()=>registry(await api<unknown>(`projects/${encodeURIComponent(project.id)}/incidents?`+new URLSearchParams({page:String(page),page_size:'25'}))),refetchInterval:15000})
  useEffect(()=>{setPage(1);setSelected(null);setPurgeTarget(null)},[project.id])
  useEffect(()=>{if(query.data&&query.data.page!==page)setPage(query.data.page)},[query.data,page])
  const shown=selected?(query.data?.incidents.find(row=>row.incident_id===selected.incident_id)||selected):null
  const pages=query.data?Math.max(1,Math.ceil(query.data.total/query.data.page_size)):1
  return <section className="ccab-incidents"><p className="eyebrow">REGISTRE CCAB</p>{query.isPending&&<p role="status">Chargement des déclarations…</p>}{query.error&&<p role="alert">Registre CCAB indisponible.</p>}
    <div className="table-wrap"><table aria-label="Déclarations d’incident CCAB">
      <thead><tr><th>Identifiant / RUN</th><th>Catégorie</th><th>Résumé</th><th>État</th><th>Déclaré le</th><th>Responsable</th><th>Preuves</th><th>Supprimer</th></tr></thead>
      <tbody>
        {query.data?.incidents.map(row=><tr key={row.incident_id}>
          <td data-label="Identifiant / RUN">
            <button type="button" className="text-button ccab-id" onClick={()=>setSelected(row)} aria-label={`Consulter l’incident ${row.incident_id}`}>{row.incident_id}</button>
            {row.run_id&&<small>{row.run_id}</small>}
          </td>
          <td data-label="Catégorie">{row.category}</td>
          <td data-label="Résumé"><span className="ccab-summary">{row.summary}</span></td>
          <td data-label="État"><span className="badge">{stateLabel(row.state)}</span></td>
          <td data-label="Déclaré le">{date(row.created)}</td>
          <td data-label="Responsable">{text(row.state==='RESOLVED'?(row.resolution.actor||row.claim.actor):row.claim.actor)}{row.state==='CLAIMED'&&typeof row.claim.until==='number'&&row.claim.until*1000<Date.now()&&<small>Bail expiré</small>}</td>
          <td data-label="Preuves">{row.evidence.length}</td>
          <td data-label="Supprimer" className="ccab-purge-cell">{row.state==='RESOLVED'&&row.purge_revision&&
            <button type="button" className="lifecycle-icon danger session-trash" aria-label={`Supprimer la déclaration ${row.incident_id}`} title="Supprimer la déclaration" onClick={()=>setPurgeTarget(row)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h16m-10 0V4h4v3M6.5 7l1 13h9l1-13m-7 3v7m3-7v7"/></svg>
            </button>}
          </td>
        </tr>)}
        {query.data&&!query.data.incidents.length&&<tr><td colSpan={8}>Aucune déclaration d’incident pour ce projet.</td></tr>}
      </tbody>
    </table></div>
    <nav className="ccab-pagination" aria-label="Pagination des incidents"><button type="button" disabled={query.isFetching||page<=1} onClick={()=>setPage(1)}>Premier</button><button type="button" disabled={query.isFetching||page<=1} onClick={()=>setPage(page-1)}>Précédent</button><span>Page {query.data?.page||page} / {query.data?pages:'…'}{query.data?` · ${query.data.total} incident${query.data.total>1?'s':''}`:''}</span><button type="button" disabled={query.isFetching||!query.data?.has_next} onClick={()=>setPage(page+1)}>Suivant</button><button type="button" disabled={query.isFetching||!query.data?.has_next} onClick={()=>setPage(pages)}>Dernier</button></nav>
    {shown&&<IncidentOverview incident={shown} project={project} close={()=>setSelected(null)}/>}
    {purgeTarget&&<IncidentPurge incident={purgeTarget} close={()=>setPurgeTarget(null)}/>}
  </section>
}
