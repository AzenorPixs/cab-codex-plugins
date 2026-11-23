import {useEffect,useState} from 'react'
import {Shape,ShapeStream} from '@electric-sql/client'
import {Link} from '@tanstack/react-router'
import './BinaryCounters.css'

type Counts={inactive:number;active:number}
const format=new Intl.NumberFormat('fr-FR')

function count(value:unknown):number|null {
  if(typeof value!=='number'&&(typeof value!=='string'||!/^[0-9]+$/.test(value)))return null
  const result=Number(value)
  return Number.isSafeInteger(result)&&result>=0?result:null
}

export function BinaryCounters(){
  const [counts,setCounts]=useState<Counts|null>(null)
  const [unavailable,setUnavailable]=useState(false)
  useEffect(()=>{
    const controller=new AbortController()
    const stream=new ShapeStream({
      url:new URL('/api/v1/sync/binary-counts',location.origin).href,
      signal:controller.signal,
      onError:error=>{
        if(!controller.signal.aborted){setCounts(null);setUnavailable(true)}
        if('status' in error&&(error.status===401||error.status===403))return
        return {}
      },
    })
    const shape=new Shape(stream)
    const update=({rows}:{rows:readonly Record<string,unknown>[]})=>{
      if(controller.signal.aborted)return
      const row=rows[0]
      const inactive=count(row?.inactive),active=count(row?.active)
      if(inactive===null||active===null)return
      setCounts({inactive,active})
      setUnavailable(false)
    }
    const unsubscribe=shape.subscribe(update)
    update({rows:shape.currentRows})
    return ()=>{unsubscribe();controller.abort()}
  },[])
  const placeholder=unavailable?'—':'…'
  return <section className="binary-counters" aria-labelledby="binary-counters-title">
    <h2 id="binary-counters-title"><Link to="/administration/binaries">Binaires</Link></h2>
    <dl aria-live="polite" aria-label={unavailable?'Compteurs indisponibles':'État des binaires'}>
      <div className="binary-active">
        <dt><Link to="/administration/binaries" search={{status:'active'}}>Actifs</Link></dt>
        <dd>{counts?format.format(counts.active):placeholder}</dd>
      </div>
      <div className="binary-inactive">
        <dt><Link to="/administration/binaries" search={{status:'inactive'}}>Inactifs</Link></dt>
        <dd>{counts?format.format(counts.inactive):placeholder}</dd>
      </div>
    </dl>
  </section>
}
