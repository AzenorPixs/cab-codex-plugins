import {useEffect,useRef,useState} from 'react'
import {Link} from '@tanstack/react-router'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'

export type Evaluation={run_id:string;action:string;state:string;suspension:string;reasons:string[];archive_allowed:boolean;archive_path?:string;evaluation_digest?:string;evidence_digest?:string}
const reasons:Record<string,string>={
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
export function useEvaluations(projectId:string){return useQuery({queryKey:['closures',projectId],queryFn:()=>api<{evaluations:Evaluation[]}>('closures?'+new URLSearchParams({project_id:projectId})),refetchInterval:5000})}
export function SessionActions({projectId,runId,evaluation}:{projectId:string;runId:string;evaluation?:Evaluation}){
  const client=useQueryClient();const dialog=useRef<HTMLDialogElement>(null);const [view,setView]=useState<Evaluation>();const [pending,setPending]=useState(false);const [error,setError]=useState('');const [reason,setReason]=useState('');const [authorized,setAuthorized]=useState(false)
  const request=useRef(crypto.randomUUID())
  useEffect(()=>{if(view&&!dialog.current?.open)dialog.current?.showModal()},[view])
  async function refresh(){await client.invalidateQueries({queryKey:['closures',projectId]});await client.invalidateQueries({queryKey:['session-archives',projectId]})}
  async function recheck(){setPending(true);setError('');try{const result=await api<Evaluation>('command',{name:'run.reevaluate',data:{project_id:projectId,run_id:runId}});setView(result);setAuthorized(false);await refresh()}catch(e){setError(e instanceof Error?e.message:'Réévaluation impossible.');setView(evaluation||{run_id:runId,action:'blocked',state:'',suspension:'',reasons:[],archive_allowed:false})}finally{setPending(false)}}
  async function closeHistorical(){if(!view?.archive_path||!view.evidence_digest)return;setPending(true);setError('');try{await api('command',{name:'run.close_historical',data:{project_id:projectId,run_id:runId,archive_path:view.archive_path,evidence_digest:view.evidence_digest,receipt_id:'WEB-HISTORY-'+request.current,developer_authorized:authorized,authorization:'Confirmation explicite de l’administrateur dans l’interface CAB pour ce RUN et ses preuves.',reason}});setView(await api<Evaluation>('command',{name:'run.reevaluate',data:{project_id:projectId,run_id:runId}}));await refresh()}catch(e){setError(e instanceof Error?e.message:'Clôture refusée.')}finally{setPending(false)}}
  async function archive(){if(!evaluation?.evaluation_digest)return;setPending(true);setError('');try{await api('command',{name:'session.archive',data:{project_id:projectId,run_id:runId,evaluation_digest:evaluation.evaluation_digest,request_id:'WEB-ARCHIVE-'+request.current}});await refresh()}catch(e){setError(e instanceof Error?e.message:'Archivage refusé.');setView(evaluation)}finally{setPending(false)}}
  const tone=evaluation?.action==='historical'?'historical':evaluation&&(['close','normalize','closed'].includes(evaluation.action))?'ready':'blocked'
  const hint=evaluation?.reasons.map(r=>reasons[r]||r).join(' ')||'Réévaluer les preuves et clôturer si les conditions sont réunies.'
  return <div className="session-actions"><button type="button" className={'lifecycle-icon '+tone} disabled={pending} aria-label={'Réévaluer/clôturer '+runId} title={hint} onClick={()=>void recheck()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 7V3l-3 3a8 8 0 1 0 3 9M8 12l3 3 5-6"/></svg></button>{evaluation?.archive_allowed&&<button type="button" className="lifecycle-icon ready" disabled={pending} aria-label={'Archiver la session '+runId} title="Archiver cette session CLOSED validée" onClick={()=>void archive()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6"/></svg></button>}
    <dialog ref={dialog} className="lifecycle-dialog" onClose={()=>setView(undefined)}><h2>Réévaluer / clôturer</h2><p><strong>{runId}</strong> · {view?.state}</p>{view?.suspension&&<p>Protection conservée : {view.suspension}</p>}{view?.reasons.map(r=><p key={r}>{reasons[r]||r}</p>)}{view?.archive_path&&<p>Archive : <code>{view.archive_path}</code></p>}{view?.action==='closed'&&<p>La clôture est prouvée. La session peut être archivée si le bouton est disponible.</p>}{view?.action==='historical'&&<><p>Cette régularisation ne reconstitue aucune acceptation normale et ne rejoue aucun travail.</p><label>Justification<textarea value={reason} onChange={event=>setReason(event.target.value)} minLength={10} maxLength={4000}/></label><label className="historical-consent"><input type="checkbox" checked={authorized} onChange={event=>setAuthorized(event.target.checked)}/>J’autorise explicitement cette régularisation historique sur les preuves présentées.</label><button type="button" disabled={pending||!authorized||reason.trim().length<10} onClick={()=>void closeHistorical()}>Confirmer la clôture historique</button></>}{error&&<p role="alert">{error}</p>}<button type="button" onClick={()=>dialog.current?.close()}>Fermer</button></dialog>
  </div>
}
export function SessionArchives({projectId,routeId}:{projectId:string;routeId:string}){
  const query=useQuery({queryKey:['session-archives',projectId],queryFn:()=>api<{sessions:{run_id:string;session_id:string;change:string;state:string;stage:number|null;archived_at:string}[]}>('session-archives?'+new URLSearchParams({project_id:projectId})),refetchInterval:5000})
  return <section><p className="eyebrow">SESSIONS CONSERVÉES</p><h1>Archives des sessions</h1>{query.error&&<p role="alert">{query.error.message}</p>}<div className="table-wrap"><table><thead><tr><th>RUN / Session</th><th>Change</th><th>État</th><th>Archivage</th></tr></thead><tbody>{query.data?.sessions.map(row=><tr key={row.run_id}><td><Link to="/projects/$projectId/runs/$runId" params={{projectId:routeId,runId:row.run_id}}>{row.run_id}</Link><small>{row.session_id}</small></td><td>{row.change}</td><td>{row.state}</td><td>{new Date(row.archived_at).toLocaleString('fr-FR')}</td></tr>)}</tbody></table>{!query.isPending&&!query.data?.sessions.length&&<p>Aucune session archivée.</p>}</div></section>
}
