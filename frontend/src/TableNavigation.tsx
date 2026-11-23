import {useState,type ReactNode} from 'react'

export const tablePageLimit=10
const searchable=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()

export function useTableSearch(){
  const [query,setQuery]=useState('')
  const [page,setPage]=useState(1)
  function search(value:string){
    setQuery(value)
    setPage(1)
  }
  return {query,page,setPage,search}
}

export function filterTableRows<Row>(rows:Row[],query:string,content:(row:Row)=>unknown[]){
  const words=searchable(query.trim()).split(/\s+/).filter(Boolean)
  return words.length?rows.filter(row=>{
    const value=searchable(content(row).join(' '))
    return words.every(word=>value.includes(word))
  }):rows
}

export function tablePage<Row>(rows:Row[],page:number,size=tablePageLimit){
  const pages=Math.max(1,Math.ceil(rows.length/size))
  const current=Math.min(page,pages)
  return {pages,current,rows:rows.slice((current-1)*size,current*size)}
}

export function TableNavigation({label,searchLabel,query,search,current,pages,total,setPage,busy=false,children}:{
  label:string;searchLabel:string;query:string;search:(value:string)=>void
  current:number;pages:number;total?:number;setPage:(page:number)=>void;busy?:boolean;children?:ReactNode
}){
  return <nav className="git-overview-controls" aria-label={label}>
    <button type="button" disabled={busy||current<=1} onClick={()=>setPage(1)}>Premier</button>
    <button type="button" disabled={busy||current<=1} onClick={()=>setPage(current-1)}>Précédent</button>
    <span aria-live="polite">Page {current} / {pages}{total!==undefined&&` · ${total} résultat${total===1?'':'s'}`}</span>
    <button type="button" disabled={busy||current>=pages} onClick={()=>setPage(current+1)}>Suivant</button>
    <div className="agent-catalog-pagination-tail">
      <div className="agent-catalog-pagination-search">
        <button type="button" disabled={busy||current>=pages} onClick={()=>setPage(pages)}>Dernier</button>
        <input className="agent-catalog-search" type="search" value={query} placeholder="Rechercher…"
          aria-label={searchLabel} onChange={event=>search(event.target.value)}
          onKeyDown={event=>{if(event.key==='Enter')event.preventDefault()}}/>
      </div>
      {children}
    </div>
  </nav>
}

export function TableFiller({count,columns,empty}:{
  count:number;columns:number;empty?:string
}){
  return <>{Array.from({length:Math.max(0,3-count)},(_,index)=>{
    const message=count===0&&index===0?empty:undefined
    return <tr key={index} className="table-filler" aria-hidden={message?undefined:true}>
      <td colSpan={columns}>{message||'\u00a0'}</td>
    </tr>
  })}</>
}
