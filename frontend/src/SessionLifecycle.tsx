import {newRequestId} from './requestId'
import {useEffect,useRef,useState} from 'react'
import {Link} from '@tanstack/react-router'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'
import {Shape,ShapeStream} from '@electric-sql/client'
import type {Project} from './Projects'

export type Evaluation={run_id:string;action:string;state:string;suspension:string;reasons:string[];archive_allowed:boolean;archive_path?:string;evaluation_digest?:string;evidence_digest?:string}
const reasons:Record<string,string>={
  'session-git-index-protected':'L’index Git de cette session doit être conservé tant que sa livraison n’est pas confirmée.',
  'session-not-closed':'La session doit être clôturée sur preuves avant suppression.',
  'session-delete-protected':'Les conditions de suppression ne sont pas réunies.',
  'session-delete-preview-stale':'Les liens ont changé. Fermez cette fenêtre et vérifiez à nouveau.',
  'session-shared-coordination-protected':'D’autres sessions utilisent encore ses avis de coordination.',
  'session-incident-unresolved':'Un incident non résolu référence encore cette session.',
  'session-receipt-pending':'Un reçu d’exécution reste à réconcilier.',
  'legacy-service-still-running':'Le composant historique fonctionne encore.',
  'legacy-service-observation-unavailable':'Le retrait du composant historique ne peut pas être vérifié.',
  'finalization-contract-required':'Le contrat initial de finalisation manque.',
  'reserved-review-required':'La décision finale réservée à l’autorité du RUN est attendue.',
  'finalization-policy-divergent':'Le contrat et son empreinte ne concordent pas.',
  'finalization-owner-inactive':'Le compte propriétaire du RUN est inactif.',
  'closure-effects-protected':'Un effet reste en cours, inconnu ou conserve un bail.',
  'closure-measurement-open':'Une période de mesure est encore ouverte.',
  'closure-exception-unresolved':'Une exception attend une décision.',
  'change-still-open':'Le change est encore ouvert.',
  'archive-missing-or-ambiguous':'L’archive est absente ou ambiguë.',
  'archive-tasks-incomplete':'Les tâches sont absentes ou incomplètes.',
  'historical-tasks-incomplete':'Les tâches sont absentes ou incomplètes.',
  'historical-proof-unavailable':'Une preuve documentaire requise est indisponible.',
  'service-terminal-proof-required':'Session de service : aucune preuve de fin. Les tâches ne sont pas applicables.',
  'explicit-historical-confirmation-required':'Une régularisation historique exige votre confirmation explicite.',
  'accepted-source-stale':'Les sources ont changé depuis leur acceptation.',
  'accepted-receipt-stale':'Les reçus ne prouvent plus l’acceptation courante.',
  'final-acceptance-required':'La revue finale n’a pas été acceptée.',
  'legacy-terminal-proof-missing':'Le snapshot importé ne prouve pas la clôture de cette identité.',
  'legacy-snapshot-divergent':'Le snapshot et sa référence d’import ne concordent pas.',
  'legacy-terminal-proof-unavailable':'La preuve de clôture importée est indisponible.',
  'maintenance-in-progress':'Une maintenance est en cours.',
  'terminal-proof-required':'Une preuve terminale manque.',
  'terminal-receipt-missing':'Le reçu de clôture manque.',
  'terminal-audit-missing':'Le reçu de clôture n’a pas de trace d’audit correspondante.',
}
export function reasonText(code:string){
  if(code.startsWith('evidence:')){const [,id,why]=code.split(':');return `Preuve « ${id} » : ${({'missing':'manquante','source-stale':'les sources ont changé','not-passed':'le contrôle n’est pas satisfait','producer-inactive':'producteur désactivé','receipt-stale':'le reçu ne correspond plus','integrity':'empreinte divergente','scope':'périmètre divergent'} as Record<string,string>)[why]||why}.`}
  if(code.startsWith('artifact:'))return 'Les preuves ne concernent pas le même artefact.'
  return reasons[code]||code
}
const runStates:Record<string,string>={FINALIZATION_PENDING:'Finalisation en attente',FINALIZING:'Finalisation en cours',CLOSURE_INVALID:'Clôture à régulariser',BLOCKING:'Arrêt en cours',BLOCKED:'Bloquée'}
export function runStateLabel(state:string){return runStates[state]||state}
export function useEvaluations(projectId:string){return useQuery({queryKey:['closures',projectId],queryFn:()=>api<{evaluations:Evaluation[]}>('closures?'+new URLSearchParams({project_id:projectId})),refetchInterval:5000})}
export function SessionActions({projectId,runId,evaluation}:{projectId:string;runId:string;evaluation?:Evaluation}){
  const client=useQueryClient();const dialog=useRef<HTMLDialogElement>(null);const [view,setView]=useState<Evaluation>();const [pending,setPending]=useState(false);const [error,setError]=useState('');const [reason,setReason]=useState('');const [authorized,setAuthorized]=useState(false)
  const request=useRef(newRequestId())
  useEffect(()=>{if(view&&!dialog.current?.open)dialog.current?.showModal()},[view])
  async function refresh(){await client.invalidateQueries({queryKey:['closures',projectId]});await client.invalidateQueries({queryKey:['session-archives']})}
  async function recheck(){setPending(true);setError('');try{const result=await api<Evaluation>('command',{name:'run.reevaluate',data:{project_id:projectId,run_id:runId}});setView(result);setAuthorized(false);await refresh()}catch(e){setError(e instanceof Error?e.message:'Réévaluation impossible.');setView(evaluation||{run_id:runId,action:'blocked',state:'',suspension:'',reasons:[],archive_allowed:false})}finally{setPending(false)}}
  async function closeHistorical(){if(!view?.archive_path||!view.evidence_digest)return;setPending(true);setError('');try{await api('command',{name:'run.close_historical',data:{project_id:projectId,run_id:runId,archive_path:view.archive_path,evidence_digest:view.evidence_digest,receipt_id:'WEB-HISTORY-'+request.current,developer_authorized:authorized,authorization:'Confirmation explicite de l’administrateur dans l’interface CAB pour ce RUN et ses preuves.',reason}});setView(await api<Evaluation>('command',{name:'run.reevaluate',data:{project_id:projectId,run_id:runId}}));await refresh()}catch(e){setError(e instanceof Error?e.message:'Clôture refusée.')}finally{setPending(false)}}
  async function archive(){if(!evaluation?.evaluation_digest)return;setPending(true);setError('');try{await api('command',{name:'session.archive',data:{project_id:projectId,run_id:runId,evaluation_digest:evaluation.evaluation_digest,request_id:'WEB-ARCHIVE-'+request.current}});await refresh()}catch(e){setError(e instanceof Error?e.message:'Archivage refusé.');setView(evaluation)}finally{setPending(false)}}
  const tone=evaluation?.action==='historical'?'historical':evaluation&&(['close','normalize','closed'].includes(evaluation.action))?'ready':'blocked'
  const hint=evaluation?.reasons.map(reasonText).join(' ')||'Réévaluer les preuves et clôturer si les conditions sont réunies.'
  return <div className="session-actions"><button type="button" className={'lifecycle-icon '+tone} disabled={pending} aria-label={'Réévaluer/clôturer '+runId} title={hint} onClick={()=>void recheck()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 7V3l-3 3a8 8 0 1 0 3 9M8 12l3 3 5-6"/></svg></button>{evaluation?.archive_allowed&&<button type="button" className="lifecycle-icon ready" disabled={pending} aria-label={'Archiver la session '+runId} title="Archiver cette session CLOSED validée" onClick={()=>void archive()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6"/></svg></button>}
    <SessionTrash projectId={projectId} runId={runId}/><dialog ref={dialog} className="lifecycle-dialog" onClose={()=>setView(undefined)}><h2>Réévaluer / clôturer</h2><p><strong>{runId}</strong> · {view?.state}</p>{view?.suspension&&<p>Protection conservée : {view.suspension}</p>}{view?.reasons.map(r=><p key={r}>{reasonText(r)}</p>)}{view?.archive_path&&<p>Archive : <code>{view.archive_path}</code></p>}{view?.action==='closed'&&<p>La clôture est prouvée. La session peut être archivée si le bouton est disponible.</p>}{view?.action==='historical'&&<><p>Cette régularisation ne reconstitue aucune acceptation normale et ne rejoue aucun travail.</p><label>Justification<textarea value={reason} onChange={event=>setReason(event.target.value)} minLength={10} maxLength={4000}/></label><label className="historical-consent"><input type="checkbox" checked={authorized} onChange={event=>setAuthorized(event.target.checked)}/>J’autorise explicitement cette régularisation historique sur les preuves présentées.</label><button type="button" disabled={pending||!authorized||reason.trim().length<10} onClick={()=>void closeHistorical()}>Confirmer la clôture historique</button></>}{error&&<p role="alert">{error}</p>}<button type="button" onClick={()=>dialog.current?.close()}>Fermer</button></dialog>
  </div>
}
type DeletePreview={allowed:boolean;reasons:string[];deletion_digest:string;shared:{kind:string;label:string;preserved:boolean;runs:{project:string;run_id:string}[]}[]}
export function SessionTrash({projectId,runId}:{projectId:string;runId:string}){
  const client=useQueryClient();const dialog=useRef<HTMLDialogElement>(null);const request=useRef(newRequestId())
  const [preview,setPreview]=useState<DeletePreview>();const [pending,setPending]=useState(false);const [error,setError]=useState('');const [confirmed,setConfirmed]=useState(false);const [sharedConfirmed,setSharedConfirmed]=useState(false)
  async function open(){setPending(true);setError('');setConfirmed(false);setSharedConfirmed(false);try{setPreview(await api<DeletePreview>('command',{name:'session.delete_preview',data:{project_id:projectId,run_id:runId}}))}catch(e){setPreview(undefined);setError(e instanceof Error?reasonText(e.message):'Vérification impossible.')}finally{setPending(false);dialog.current?.showModal()}}
  async function remove(){if(!preview?.allowed||!confirmed||preview.shared.length&&!sharedConfirmed)return;setPending(true);setError('');try{await api('command',{name:'session.delete',data:{project_id:projectId,run_id:runId,request_id:'WEB-DELETE-'+request.current,expected_deletion_digest:preview.deletion_digest,confirm_irreversible:confirmed,confirm_shared:sharedConfirmed}});dialog.current?.close();await client.invalidateQueries({queryKey:['closures',projectId]});await client.invalidateQueries({queryKey:['session-archives']});await client.invalidateQueries({queryKey:['sessions',projectId]})}catch(e){setError(e instanceof Error?reasonText(e.message):'Suppression refusée.')}finally{setPending(false)}}
  return <><button type="button" className="lifecycle-icon danger session-trash" disabled={pending} title="Supprimer définitivement cette session de CAB" aria-label={'Supprimer définitivement '+runId} onClick={()=>void open()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button><dialog ref={dialog} className="lifecycle-dialog deletion-dialog"><h2>Suppression définitive</h2><p><strong>{runId}</strong></p><p className="deletion-warning">Attention : cette action est irréversible. La session et ses données propres seront supprimées de CAB.</p><p>Le projet, ses fichiers et les ressources partagées seront conservés.</p>{preview?.reasons.map(reason=><p role="alert" key={reason}>{reasonText(reason)}</p>)}{!!preview?.shared.length&&<section className="shared-warning"><h3>Attention : ressources CAB partagées</h3><p>Cette suppression est transversale. Vérifiez les liens ci-dessous ; les ressources partagées seront conservées.</p>{preview.shared.map(group=><details key={group.kind}><summary>{group.label} · {group.runs.length} autre(s) RUN</summary><ul>{group.runs.map(row=><li key={row.project+row.run_id}><Link to="/projects/$projectId/runs/$runId" params={{projectId:row.project,runId:row.run_id}}>{row.project} / {row.run_id}</Link></li>)}</ul></details>)}<label className="historical-consent"><input type="checkbox" checked={sharedConfirmed} onChange={e=>setSharedConfirmed(e.target.checked)}/>J’ai vérifié les liens et les ressources partagées indiqués.</label></section>}<label className="historical-consent"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Je comprends que cette suppression est irréversible.</label>{error&&<p role="alert">{error}</p>}<div className="deletion-buttons"><button type="button" disabled={pending} onClick={()=>dialog.current?.close()}>Annuler</button><button type="button" className="danger" disabled={pending||!preview?.allowed||!confirmed||!!preview?.shared.length&&!sharedConfirmed} onClick={()=>void remove()}>Supprimer définitivement</button></div></dialog></>
}
type ArchivedSession={project_id:string;run_id:string;session_id:string;change:string;state:string;stage:number|null;archived_at:string}
type ArchivePage={sessions:ArchivedSession[];page:number;total_pages:number;total:number;has_next:boolean}
export function SessionArchives({projectId,routeId,projects=[]}:{projectId?:string;routeId?:string;projects?:Project[]}){
  const [page,setPage]=useState(1),[liveError,setLiveError]=useState('');const client=useQueryClient()
  const query=useQuery({queryKey:['session-archives',projectId||null,page],queryFn:()=>{const params=new URLSearchParams({page:String(page)});if(projectId)params.set('project_id',projectId);return api<ArchivePage>('session-archives?'+params)},refetchInterval:5000})
  useEffect(()=>setPage(1),[projectId])
  useEffect(()=>{if(query.data&&query.data.page!==page)setPage(query.data.page)},[query.data?.page,page])
  useEffect(()=>{
    const controller=new AbortController()
    const stream=new ShapeStream({url:new URL(projectId?'/api/v1/sync/sessions':'/api/v1/sync/project-archives',location.origin).href,params:projectId?{project_id:projectId}:undefined,signal:controller.signal,onError:()=>{setLiveError('Suivi temporairement indisponible · reconnexion en cours');return {}}})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(()=>{setLiveError('');void client.invalidateQueries({queryKey:['session-archives',projectId||null]}).catch(()=>setLiveError('Actualisation des archives temporairement indisponible.'))})
    return ()=>{unsubscribe();controller.abort()}
  },[projectId,client])
  const current=query.data?.page||page,pages=query.data?.total_pages||1
  return <section><p className="eyebrow">SESSIONS CONSERVÉES</p>{query.error&&<p role="alert">{query.error.message}</p>}{liveError&&<p role="status">{liveError}</p>}<div className="table-wrap"><table><thead><tr>{!projectId&&<th>Projets</th>}<th>RUN / Session</th><th>Change</th><th>État</th><th>Archivage</th><th>Supprimer</th></tr></thead><tbody>{query.data?.sessions.map(row=>{const project=projects.find(project=>project.id===row.project_id),id=projectId||row.project_id,route=routeId||project?.identifier||id;return <tr key={`${id}:${row.run_id}`}>{!projectId&&<td data-label="Projets"><Link className="text-button" to="/projects/$projectId" params={{projectId:route}}>{project?.identifier||id}</Link></td>}<td data-label="RUN / Session"><Link to="/projects/$projectId/runs/$runId" params={{projectId:route,runId:row.run_id}}>{row.run_id}</Link><small>{row.session_id}</small></td><td data-label="Change">{row.change}</td><td data-label="État">{row.state}</td><td data-label="Archivage">{new Date(row.archived_at).toLocaleString('fr-FR')}</td><td data-label="Supprimer"><div className="session-actions"><SessionTrash projectId={id} runId={row.run_id}/></div></td></tr>})}</tbody></table>{!query.isPending&&!query.data?.sessions.length&&<p>Aucune session archivée.</p>}</div><nav className="git-overview-controls" aria-label="Pagination des archives"><button type="button" disabled={query.isFetching||!query.data||current<=1} onClick={()=>setPage(1)}>Premier</button><button type="button" disabled={query.isFetching||!query.data||current<=1} onClick={()=>setPage(current-1)}>Précédent</button><span>Page {current} / {query.data?pages:'…'}{query.data?` · ${query.data.total} archive${query.data.total>1?'s':''}`:''}</span><button type="button" disabled={query.isFetching||!query.data?.has_next} onClick={()=>setPage(current+1)}>Suivant</button><button type="button" disabled={query.isFetching||!query.data?.has_next} onClick={()=>setPage(pages)}>Dernier</button></nav></section>
}
