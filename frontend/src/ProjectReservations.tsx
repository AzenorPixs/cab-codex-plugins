import {filterTableRows,TableFiller,TableNavigation,tablePage,useTableSearch} from './TableNavigation'
import {useEffect, useRef, useState, type FormEvent} from 'react'
import {Shape, ShapeStream} from '@electric-sql/client'
import {useQuery} from '@tanstack/react-query'
import {Link} from '@tanstack/react-router'
import {api} from './api'
import {useTablePageSize} from './Appearance'
import type {Project} from './Projects'

type Reservation = {
  id: string; project_id: string; session_id: string; change: string
  kind: string; description: string; count: number
  started: string; expires: string
}
type FileSnapshot = {path: string; text: string; digest: string; editable: boolean}
const kinds: Record<string, string> = {file:'Fichier', docker:'Docker', lxc:'LXC', browser:'Navigateur', resource:'Ressource'}
const columns = ['Projet', 'Session', 'Change', 'Type de réservation', 'Nombre de réservations', 'Début', 'Échéance', 'Description']

function ReservationFile({id, path, close}: {id:string; path:string; close:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const endpoint = 'reservations/' + id + '/file'
  const query = useQuery({queryKey:['reservation-file', id], queryFn:()=>api<FileSnapshot>(endpoint), gcTime:0})
  const [draft, setDraft] = useState<{content:string; base:FileSnapshot}>()
  const [saved, setSaved] = useState<FileSnapshot>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const snapshot = draft?.base || saved || query.data
  useEffect(()=>{dialog.current?.showModal()}, [])

  async function save(event:FormEvent) {
    event.preventDefault()
    if (!draft || busy) return
    setBusy(true)
    setError('')
    try {
      setSaved(await api<FileSnapshot>(endpoint, {content:draft.content, digest:draft.base.digest}))
      setDraft(undefined)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Enregistrement impossible.')
    } finally {
      setBusy(false)
    }
  }

  return <dialog ref={dialog} className="lifecycle-dialog forge-editor" aria-label="Aperçu du fichier"
    onCancel={event=>{event.preventDefault(); if (!busy) close()}}>
    <form onSubmit={save}>
      <h2>Aperçu du fichier</h2>
      <p>{path}</p>
      {query.isPending && <p role="status">Chargement…</p>}
      {query.error && <p role="alert">{query.error.message}</p>}
      {snapshot && <textarea aria-label="Contenu du fichier" rows={18} spellCheck={false}
        style={{width:'100%', fontFamily:'monospace', whiteSpace:'pre'}}
        readOnly={!snapshot.editable || busy} value={draft?.content ?? snapshot.text}
        onChange={event=>setDraft({content:event.target.value, base:snapshot})}/>}
      {error && <p role="alert">{error}</p>}
      <div className="form-actions">
        {snapshot?.editable && <button type="submit" disabled={busy || !draft || draft.content === snapshot.text}>Enregistrer</button>}
        <button type="button" className="secondary-button" disabled={busy} onClick={close}>Fermer</button>
      </div>
    </form>
  </dialog>
}

export function ProjectReservations({projects}:{projects:Project[]}) {
  const pageSize = useTablePageSize('sessions')
  const [rows, setRows] = useState<Reservation[]>([])
  const [status, setStatus] = useState('Chargement des réservations…')
  const navigation = useTableSearch()
  const [preview, setPreview] = useState<{id:string; path:string}>()

  useEffect(()=>{
    const controller = new AbortController()
    const stream = new ShapeStream({
      url:new URL('/api/v1/sync/reservations', location.origin).href,
      signal:controller.signal,
      onError:()=>{setStatus('Suivi temporairement indisponible · reconnexion en cours'); return {}},
    })
    const unsubscribe = new Shape(stream).subscribe(({rows})=>{
      setRows(rows.map(row=>({
        id:String(row.id), project_id:String(row.project_id), session_id:String(row.session_id),
        change:String(row.change), kind:String(row.kind),
        description:String(row.description), count:Number(row.count),
        started:String(row.started), expires:String(row.expires),
      })).sort((left, right)=>Date.parse(left.expires)-Date.parse(right.expires) || left.id.localeCompare(right.id)))
      setStatus('')
    })
    return ()=>{unsubscribe(); controller.abort()}
  }, [])

  const projectById = new Map(projects.map(project=>[project.id, project]))
  const matching = filterTableRows(rows,navigation.query,row=>{
    const project=projectById.get(row.project_id)
    return [project?.name,project?.identifier,row.session_id,row.change,kinds[row.kind]||kinds.resource,
      row.count,new Date(row.started).toLocaleString('fr-FR'),new Date(row.expires).toLocaleString('fr-FR'),row.description]
  })
  const {rows:displayed,current,pages}=tablePage(matching,navigation.page,pageSize)
  return <>
    <section className="project-home project-forges-page"><div className="section-heading">
      <div className="project-identity"><h1>Réservations</h1></div>
      {status && <p role="status" className="live">{status}</p>}
    </div></section>
    <div className="table-wrap">
      <table className="monitor-table">
        <thead><tr>{columns.map(column=><th scope="col" key={column}><span>{column}</span></th>)}</tr></thead>
        <tbody>{displayed.map(row=>{
          const project = projectById.get(row.project_id)
          return <tr key={row.id}>
            <td data-label={columns[0]}>{project && <Link className="text-button" to="/projects/$projectId"
              params={{projectId:project.identifier || project.id}}>{project.name || project.identifier || project.id}</Link>}</td>
            <td data-label={columns[1]}>{row.session_id}</td>
            <td data-label={columns[2]}>{row.change}</td>
            <td data-label={columns[3]}>{kinds[row.kind] || kinds.resource}</td>
            <td data-label={columns[4]}>{row.count}</td>
            <td data-label={columns[5]}><time dateTime={row.started}>{new Date(row.started).toLocaleString('fr-FR')}</time></td>
            <td data-label={columns[6]}><time dateTime={row.expires}>{new Date(row.expires).toLocaleString('fr-FR')}</time></td>
            <td data-label={columns[7]}>{row.kind==='file'
              ? <button type="button" className="text-button" onClick={()=>setPreview({id:row.id, path:row.description})}>{row.description}</button>
              : row.description}</td>
          </tr>
        })}
          <TableFiller count={displayed.length} columns={columns.length}
            empty={!status?(navigation.query.trim()?'Aucun résultat.':'Aucune réservation active.'):undefined}/>
        </tbody>
      </table>
    </div>
    <TableNavigation {...navigation} label="Pagination des réservations" searchLabel="Rechercher dans les réservations"
      current={current} pages={pages} total={matching.length}/>
    {preview && <ReservationFile key={preview.id} {...preview} close={()=>setPreview(undefined)}/>}
  </>
}
