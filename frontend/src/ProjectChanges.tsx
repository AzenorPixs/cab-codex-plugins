import {useEffect,useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {Link} from '@tanstack/react-router'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api,ApiError} from './api'
import {filterTableRows,TableFiller,TableNavigation,tablePage,tablePageLimit,useTableSearch} from './TableNavigation'

type ChangeRow={
  source:string
  identifier:string
  title:string|null
  tasks_done:number|null
  tasks_total:number|null
  changed_at:string
  archived:boolean
  archived_at:string|null
}
type RecordRow={id:string;catalogue:unknown}
type ListedChange=ChangeRow&{id:string}
export type ChangeStatus='open'|'archived'

function rowsFrom(records:RecordRow[]):ListedChange[]{
  return records.flatMap(record=>{
    if(!Array.isArray(record.catalogue))return []
    return record.catalogue.flatMap((row:Partial<ChangeRow>|null)=>{
      if(!row||typeof row.source!=='string'||typeof row.identifier!=='string'
        ||typeof row.archived!=='boolean'||typeof row.changed_at!=='string'
        ||!Number.isFinite(Date.parse(row.changed_at)))return []
      return [{
        id:record.id,source:row.source,identifier:row.identifier,archived:row.archived,changed_at:row.changed_at,
        title:typeof row.title==='string'?row.title:null,
        tasks_done:typeof row.tasks_done==='number'?row.tasks_done:null,
        tasks_total:typeof row.tasks_total==='number'?row.tasks_total:null,
        archived_at:typeof row.archived_at==='string'&&Number.isFinite(Date.parse(row.archived_at))?row.archived_at:null,
      }]
    })
  })
}

function ChangeTable({rows,archived,projectId,reload}:{
  rows:ListedChange[];archived:boolean;projectId:string;reload:()=>Promise<unknown>
}){
  const navigation=useTableSearch()
  const [pending,setPending]=useState<Set<string>>(new Set())
  const [message,setMessage]=useState('')
  const matching=filterTableRows(rows,navigation.query,row=>[row.identifier,row.title])
  const {rows:visible,current,pages}=tablePage(matching,navigation.page,tablePageLimit)
  async function refresh(row:ListedChange){
    setPending(previous=>new Set(previous).add(row.id))
    setMessage('')
    try{
      await api('projects/'+encodeURIComponent(projectId)+'/changes/'+encodeURIComponent(row.id)+'/refresh',{})
      setMessage('Change actualisé.')
      await reload()
    }catch(error){
      const unavailable=error instanceof ApiError&&error.code==='change-catalogue-unavailable'
      setMessage(unavailable||!(error instanceof Error)?'Lecture des fichiers OpenSpec temporairement indisponible.':error.message)
    }finally{
      setPending(previous=>{const next=new Set(previous);next.delete(row.id);return next})
    }
  }
  return <>
    <div className="table-wrap"><table className="monitor-table">
      <thead><tr>
        <th scope="col"><span>Identifiant</span></th>
        <th scope="col"><span>Titre</span></th>
        <th scope="col"><span>Tâches</span></th>
        <th scope="col"><span>Dernière modification</span></th>
        {archived&&<th scope="col"><span>Archivage</span></th>}
        <th scope="col"><span>Actions</span></th>
      </tr></thead>
      <tbody>{visible.map(row=><tr key={row.source}>
        <td data-label="Identifiant">{row.identifier}</td>
        <td data-label="Titre">{row.title||'—'}</td>
        <td data-label="Tâches">{row.tasks_done===null||row.tasks_total===null?'—':row.tasks_done+'/'+row.tasks_total}</td>
        <td data-label="Dernière modification"><time dateTime={row.changed_at}>{new Date(row.changed_at).toLocaleString('fr-FR')}</time></td>
        {archived&&<td data-label="Archivage">{row.archived_at?<time dateTime={row.archived_at}>{new Date(row.archived_at).toLocaleDateString('fr-FR',{timeZone:'UTC'})}</time>:'—'}</td>}
        <td data-label="Actions"><button type="button" className="text-button" disabled={pending.has(row.id)}
          aria-label={'Actualiser '+row.identifier} onClick={()=>void refresh(row)}>Actualiser</button></td>
      </tr>)}
      <TableFiller columns={archived?6:5} count={visible.length} empty={navigation.query.trim()?'Aucun résultat.':archived?'Aucun change archivé.':'Aucun change ouvert.'}/>
      </tbody>
    </table></div>
    <TableNavigation {...navigation} label="Pagination des changes" searchLabel="Rechercher dans les changes"
      current={current} pages={pages} total={matching.length}/>
    {message&&<p role="status">{message}</p>}
  </>
}

export function ProjectChanges({projectId,routeId,status}:{
  projectId:string;routeId:string;status:ChangeStatus
}){
  const archived=status==='archived'
  const [live,setLive]=useState<{rows:ListedChange[];receivedAt:number}|null>(null)
  const [warning,setWarning]=useState('')
  const query=useQuery({
    queryKey:['project-changes',projectId],
    queryFn:()=>api<{changes:RecordRow[]}>('projects/'+encodeURIComponent(projectId)+'/changes'),
  })
  useEffect(()=>{
    const controller=new AbortController()
    const stream=new ShapeStream({
      url:new URL('/api/v1/sync/project-changes',location.origin).href,
      params:{project_id:projectId},
      signal:controller.signal,
      onError:()=>{
        if(controller.signal.aborted)return
        setWarning('Suivi temporairement indisponible · reconnexion en cours')
        return {}
      },
    })
    const shape=new Shape(stream)
    const update=()=>{
      if(controller.signal.aborted||shape.isLoading())return
      setLive({
        rows:rowsFrom(shape.currentRows.map(row=>({id:String(row.id),catalogue:row.catalogue}))),
        receivedAt:Date.now(),
      })
      setWarning('')
    }
    const unsubscribe=shape.subscribe(update)
    update()
    return ()=>{unsubscribe();controller.abort()}
  },[projectId])
  const snapshot=query.data?rowsFrom(query.data.changes):null
  const source=warning&&query.dataUpdatedAt>(live?.receivedAt??0)?snapshot:(live?.rows??snapshot)
  const rows=source?.filter(row=>row.archived===archived).sort((left,right)=>
    Date.parse(right.changed_at)-Date.parse(left.changed_at)||left.source.localeCompare(right.source))
  return <>
    <nav className="table-tabs" aria-label="État des changes">
      <Link to="/projects/$projectId/changes" params={{projectId:routeId}} search={{status:'open'}} aria-current={!archived?'page':undefined}>Ouverts</Link>
      <Link to="/projects/$projectId/changes" params={{projectId:routeId}} search={{status:'archived'}} aria-current={archived?'page':undefined}>Archivés</Link>
    </nav>
    {warning&&<p role="status">{warning}</p>}
    {rows?<ChangeTable key={status} rows={rows} archived={archived} projectId={projectId} reload={query.refetch}/>:
      query.error?<p role="alert">{query.error.message}</p>:<p role="status">Chargement des changes…</p>}
  </>
}
