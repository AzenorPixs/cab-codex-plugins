import {filterTableRows,TableFiller,TableNavigation,tablePage,useTableSearch} from './TableNavigation'
import {useTablePageSize} from './Appearance'
import {useEffect,useState,type ReactNode} from 'react'
import {Shape,ShapeStream} from '@electric-sql/client'
import {Link} from '@tanstack/react-router'
import './BinaryCounters.css'

export type BinaryStatus='active'|'inactive'
type Binary={
  id:string
  pid:number
  username:string
  executable:string
  role:string
  active:boolean
  first_seen:string
  last_seen:string
  stopped:string|null
}

type SortColumn='pid'|'username'|'executable'|'role'|'first_seen'|'last_seen'|'stopped'
type Sort={column:SortColumn;descending:boolean}
const collator=new Intl.Collator('fr-FR',{numeric:true,sensitivity:'base'})
const columns=[
  ['pid','PID'],['username','Compte'],['executable','Exécutable'],['role','Rôle'],
  ['first_seen','Première observation'],
] as const
const dateFormat=new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'medium'})
function date(value:string|null){
  if(!value)return '—'
  const parsed=new Date(value)
  return Number.isNaN(parsed.getTime())?'—':dateFormat.format(parsed)
}

function binary(row:Record<string,unknown>):Binary|null {
  const {id,username,executable,role,first_seen,last_seen,stopped}=row
  const pid=Number(row.pid)
  const active=row.active===true||row.active==='true'||row.active==='t'
  const inactive=row.active===false||row.active==='false'||row.active==='f'
  if(typeof id!=='string'||!Number.isSafeInteger(pid)||pid<1||typeof username!=='string'||typeof executable!=='string'
    ||typeof role!=='string'||(!active&&!inactive)||typeof first_seen!=='string'||typeof last_seen!=='string'
    ||(stopped!==null&&typeof stopped!=='string'))return null
  return {id,pid,username,executable,role,active,first_seen,last_seen,stopped}
}

function compare(a:Binary,b:Binary,{column,descending}:Sort){
  const direction=descending?-1:1
  let result:number
  if(column==='pid')result=a.pid-b.pid
  else if(column==='first_seen'||column==='last_seen'||column==='stopped'){
    const left=Date.parse(a[column]??''),right=Date.parse(b[column]??'')
    if(Number.isNaN(left)!==Number.isNaN(right))return Number.isNaN(left)?1:-1
    result=Number.isNaN(left)?0:left-right
  }else result=collator.compare(a[column],b[column])
  return result*direction||collator.compare(a.id,b.id)
}

function BinaryTable({rows,active}:{rows:Binary[];active:boolean}){
  const pageSize=useTablePageSize('binaries')
  const [sort,setSort]=useState<Sort>({column:active?'pid':'stopped',descending:!active})
  const navigation=useTableSearch()
  const ordered=filterTableRows(rows.filter(row=>row.active===active),navigation.query,row=>[
    row.pid,row.username,row.executable,row.role,date(row.first_seen),date(active?row.last_seen:row.stopped),
  ]).sort((a,b)=>compare(a,b,sort))
  const {rows:selected,current,pages}=tablePage(ordered,navigation.page,pageSize)
  const displayed:readonly (readonly [SortColumn,string])[]=[...columns,active?['last_seen','Dernière observation']:['stopped','Arrêt']]
  function selectSort(column:SortColumn){
    setSort(previous=>({column,descending:previous.column===column&&!previous.descending}))
    navigation.setPage(1)
  }
  return <>
    <div className="table-wrap"><table className="monitor-table" aria-label={active?'Binaires actifs':'Binaires inactifs'}>
      <thead><tr>{displayed.map(([column,label])=><th key={column} scope="col"
        aria-sort={sort.column===column?(sort.descending?'descending':'ascending'):undefined}>
        <button type="button" className="binary-sort" onClick={()=>selectSort(column)}>
          {label}{sort.column===column&&<span aria-hidden="true">{sort.descending?'↓':'↑'}</span>}
        </button>
      </th>)}</tr></thead>
      <tbody>{selected.map(row=><tr key={row.id}>
        <td data-label="PID">{row.pid}</td><td data-label="Compte">{row.username}</td>
        <td data-label="Exécutable" className="binary-executable"><code>{row.executable}</code></td>
        <td data-label="Rôle">{row.role}</td><td data-label="Première observation">{date(row.first_seen)}</td>
        <td data-label={active?'Dernière observation':'Arrêt'}>{date(active?row.last_seen:row.stopped)}</td>
      </tr>)}
      <TableFiller count={selected.length} columns={displayed.length}
        empty={navigation.query.trim()?'Aucun résultat.':active?'Aucun binaire actif.':'Aucun binaire inactif.'}/></tbody>
    </table></div>
    <TableNavigation {...navigation} label="Pagination des binaires" searchLabel="Rechercher dans les binaires"
      current={current} pages={pages} total={ordered.length}/>
  </>
}

export function BinaryList({status,login}:{status:BinaryStatus;login:ReactNode}){
  const [rows,setRows]=useState<Binary[]|null>(null)
  const [error,setError]=useState<'auth'|'unavailable'|null>(null)
  useEffect(()=>{
    const controller=new AbortController()
    const stream=new ShapeStream({
      url:new URL('/api/v1/sync/binaries',location.origin).href,
      signal:controller.signal,
      onError:reason=>{
        if(controller.signal.aborted)return
        const unauthorized='status' in reason&&(reason.status===401||reason.status===403)
        setError(unauthorized?'auth':'unavailable')
        if(!unauthorized)return {}
      },
    })
    const shape=new Shape(stream)
    const update=()=>{
      if(controller.signal.aborted||shape.isLoading())return
      setRows(shape.currentRows.flatMap(row=>{const parsed=binary(row);return parsed?[parsed]:[]}))
      setError(null)
    }
    const unsubscribe=shape.subscribe(update)
    update()
    return ()=>{unsubscribe();controller.abort()}
  },[])
  const active=status==='active'
  return <section className="project-home project-forges-page binary-list">
    <div className="section-heading"><div className="project-identity"><h1>Binaires</h1></div></div>
    <nav className="table-tabs" aria-label="État des binaires">
      <Link to="/administration/binaries" search={{status:'active'}} aria-current={active?'page':undefined}>Actifs</Link>
      <Link to="/administration/binaries" search={{status:'inactive'}} aria-current={!active?'page':undefined}>Inactifs</Link>
    </nav>
    {error==='auth'?login:error==='unavailable'?<p role="status">Registre des binaires temporairement indisponible.</p>:rows===null?<p role="status">Chargement des binaires…</p>:
      <BinaryTable key={status} rows={rows} active={active}/>}
  </section>
}
