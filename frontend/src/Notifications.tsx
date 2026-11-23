import {useEffect,useRef,useState} from 'react'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'

type Choice={id:string;label:string}
type Notice={id:string;sender:string;title:string;body:string;kind:'message'|'question';choices:Choice[];read_at:string|null;created:string;updated:string;answered?:string}
function notice(value:unknown):Notice|null{
  if(!value||typeof value!=='object')return null
  const row=value as Record<string,unknown>
  if(!['id','sender','title','body','created','updated'].every(key=>typeof row[key]==='string')||!['message','question'].includes(String(row.kind)))return null
  let choices:unknown=row.choices
  if(typeof choices==='string'){try{choices=JSON.parse(choices)}catch{return null}}
  if(!Array.isArray(choices)||!choices.every(item=>item&&typeof item.id==='string'&&typeof item.label==='string'))return null
  return {id:String(row.id),sender:String(row.sender),title:String(row.title),body:String(row.body),kind:row.kind as Notice['kind'],choices,read_at:typeof row.read_at==='string'?row.read_at:null,created:String(row.created),updated:String(row.updated)}
}
export function Notifications(){
  const dialog=useRef<HTMLDialogElement>(null)
  const content=useRef<HTMLDivElement>(null)
  const [rows,setRows]=useState<Notice[]>([]),[snapshot,setSnapshot]=useState<Notice[]>([]),[open,setOpen]=useState(false),[index,setIndex]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false)
  const acknowledged=useRef(new Set<string>()),reading=useRef(new Set<string>()),generation=useRef(0)
  const cleared=useRef(new Set<string>())
  const current=snapshot[index],unread=rows.filter(row=>!row.read_at).length
  useEffect(()=>{
    const controller=new AbortController()
    const stream=new ShapeStream({url:new URL('/api/v1/sync/notifications',location.origin).href,signal:controller.signal,onError:()=>({})})
    const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows:values})=>{
      const next=values.map(notice).filter((row):row is Notice=>row!==null&&!cleared.current.has(row.id)).sort((a,b)=>a.created.localeCompare(b.created)||a.id.localeCompare(b.id))
      setRows(next)
    })
    return ()=>{unsubscribe();controller.abort()}
  },[])
  useEffect(()=>{
    if(!open)return
    setSnapshot(old=>{
      const ids=new Set(old.map(row=>row.id))
      return [...old.map(row=>{const live=rows.find(item=>item.id===row.id);return live?{...live,answered:row.answered}:row}),...rows.filter(row=>!ids.has(row.id))]
    })
  },[rows,open])
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open])
  useEffect(()=>{if(content.current)content.current.scrollTop=0},[current?.id])
  useEffect(()=>{
    if(!open||loading||!current||acknowledged.current.has(current.id)||reading.current.has(current.id))return
    const id=current.id;reading.current.add(id)
    api('notifications/read',{id}).then(()=>{acknowledged.current.add(id);setRows(old=>old.flatMap(row=>row.id!==id?[row]:row.kind==='question'?[{...row,read_at:new Date().toISOString()}]:[]))}).catch(reason=>setError(reason instanceof Error?reason.message:'Lecture indisponible.')).finally(()=>reading.current.delete(id))
  },[open,current?.id,loading])
  async function show(){
    const token=++generation.current
    setSnapshot(rows);setIndex(0);setError('');setLoading(true);setOpen(true)
    try{const result=await api<{notifications:unknown[]}>('notifications');if(token!==generation.current)return
      const next=result.notifications.map(notice).filter((row):row is Notice=>row!==null&&!cleared.current.has(row.id));setRows(next);setSnapshot(next)
    }catch(reason){if(token===generation.current)setError(reason instanceof Error?reason.message:'Notifications indisponibles.')}
    finally{if(token===generation.current)setLoading(false)}
  }
  function close(){generation.current++;setOpen(false);setSnapshot([]);setIndex(0);setError('');setLoading(false)}
  async function answer(choice:Choice){
    if(!current)return
    setBusy(true);setError('')
    try{await api('notifications/answer',{id:current.id,choice:choice.id});acknowledged.current.add(current.id);setRows(old=>old.filter(row=>row.id!==current.id));setSnapshot(old=>old.map(row=>row.id===current.id?{...row,answered:choice.label}:row))}
    catch(reason){setError(reason instanceof Error?reason.message:'Réponse non enregistrée.')}
    finally{setBusy(false)}
  }
  async function clearMessages(){
    const visibleIds=snapshot.filter(row=>row.kind==='message').map(row=>row.id)
    setBusy(true);setError('')
    try{
      const result=await api<{cleared_ids:string[]}>('notifications/clear-messages',{})
      for(const id of [...visibleIds,...result.cleared_ids])cleared.current.add(id)
      setRows(old=>old.filter(row=>!cleared.current.has(row.id)))
      setSnapshot(old=>old.filter(row=>!cleared.current.has(row.id)))
      setIndex(0)
    }catch(reason){setError(reason instanceof Error?reason.message:'Effacement des messages indisponible.')}
    finally{setBusy(false)}
  }
  const hasMessages=snapshot.some(row=>row.kind==='message')||rows.some(row=>row.kind==='message')
  return <>
    <button type="button" className={`header-control notification-bell${unread?' has-unread':''}`} aria-label={unread?`Notifications : ${unread} non lue${unread>1?'s':''}`:'Notifications'} title="Notifications" onClick={()=>void show()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
      {unread>0&&<span className="notification-count">{unread}</span>}
    </button>
    <dialog ref={dialog} className="lifecycle-dialog notifications-dialog" aria-label="Notifications CAB" onCancel={event=>{event.preventDefault();if(!busy)close()}} onClose={close}>
      <div className="notification-heading"><h2>Notifications</h2><button type="button" aria-label="Fermer les notifications" onClick={close} disabled={busy}>×</button></div>
      <div className="notification-content" ref={content} tabIndex={0}>
        {error&&<p role="alert">{error}</p>}
        {loading?<p role="status">Chargement…</p>:current?<article className="notification-message">
          <p className="notification-sender">{current.sender}</p>
          <h3>{current.title}</h3>
          <time dateTime={current.created}>{new Date(current.created).toLocaleString('fr-FR')}</time>
          <div className="notification-body">{current.body}</div>
          {current.kind==='question'&&(current.answered?<p role="status">Réponse enregistrée : {current.answered}</p>:<div className="notification-choices">
            {current.choices.map(choice=><button key={choice.id} type="button" disabled={busy} onClick={()=>void answer(choice)}>{choice.label}</button>)}
          </div>)}
        </article>:<p className="empty">Aucune notification.</p>}
      </div>
      <div className="notification-navigation">
        <button type="button" aria-label="Notification précédente" disabled={busy||index===0} onClick={()=>{setError('');setIndex(value=>value-1)}}>←</button>
        <span>{snapshot.length?`${index+1} / ${snapshot.length}`:'0 / 0'}</span>
        <button type="button" aria-label="Notification suivante" disabled={busy||index>=snapshot.length-1} onClick={()=>{setError('');setIndex(value=>value+1)}}>→</button>
        <button type="button" disabled={busy||loading||!hasMessages} onClick={()=>void clearMessages()}>Effacer les messages</button>
      </div>
    </dialog>
  </>
}
