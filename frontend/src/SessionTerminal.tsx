import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from 'react'
import {api,ApiError} from './api'

type Snapshot={
  terminal_id:string
  offset:number
  output:string
  truncated:boolean
  closed:boolean
}
const limit=65536

export function SessionTerminal({projectId,runId,enabled}:{projectId:string;runId:string;enabled:boolean}){
  const path='projects/'+encodeURIComponent(projectId)+'/runs/'+encodeURIComponent(runId)+'/terminal'
  const [id,setId]=useState<string|null>(null)
  const [output,setOutput]=useState('')
  const [input,setInput]=useState('')
  const [pending,setPending]=useState(false)
  const [notice,setNotice]=useState('')
  const [failure,setFailure]=useState('')
  const terminal=useRef<string|null>(null)
  const offset=useRef(0)
  const decoder=useRef(new TextDecoder())
  const mounted=useRef(false)
  const transcript=useRef<HTMLPreElement>(null)
  const command=useRef<HTMLInputElement>(null)

  function ingest(reply:Snapshot){
    offset.current=reply.offset
    const result=decoder.current.decode(Uint8Array.from(atob(reply.output),character=>character.charCodeAt(0)),
      {stream:!reply.closed})
    const text=result.replace(/\r\n/g,'\n')
    setOutput(previous=>((reply.truncated?'[Sortie précédente tronquée]\n':previous)+text).slice(-limit))
    if(reply.closed){
      terminal.current=null
      setId(null)
      setNotice('Terminal fermé.')
    }
  }

  useEffect(()=>{
    mounted.current=true
    const release=()=>{
      if(terminal.current)void api(path,{action:'close',terminal_id:terminal.current},{},true).catch(()=>undefined)
    }
    window.addEventListener('pagehide',release)
    return ()=>{
      mounted.current=false
      release()
      window.removeEventListener('pagehide',release)
    }
  },[path])

  useEffect(()=>{
    if(!id)return
    let stopped=false
    let timer:number|undefined
    const poll=async()=>{
      try{
        const reply=await api<Snapshot>(path,{action:'poll',terminal_id:id,offset:offset.current})
        if(stopped||terminal.current!==id)return
        ingest(reply)
        setFailure('')
        if(reply.closed)return
      }catch(reason){
        if(stopped||terminal.current!==id)return
        if(reason instanceof ApiError&&reason.code==='session-terminal-not-found'){
          terminal.current=null
          setId(null)
          setNotice('Terminal fermé.')
          return
        }
        setFailure(reason instanceof Error?reason.message:'Connexion au terminal interrompue.')
      }
      timer=window.setTimeout(()=>void poll(),500)
    }
    void poll()
    return ()=>{stopped=true;window.clearTimeout(timer)}
  },[path,id])

  useEffect(()=>{
    if(transcript.current)transcript.current.scrollTop=transcript.current.scrollHeight
  },[output])

  useEffect(()=>{
    if(id)command.current?.focus()
  },[id])

  async function open(){
    setPending(true)
    setFailure('')
    setNotice('')
    try{
      const reply=await api<Snapshot>(path,{action:'open'})
      if(!mounted.current){
        if(!reply.closed)void api(path,{action:'close',terminal_id:reply.terminal_id},{},true).catch(()=>undefined)
        return
      }
      decoder.current=new TextDecoder()
      setOutput('')
      terminal.current=reply.closed?null:reply.terminal_id
      setId(terminal.current)
      ingest(reply)
    }catch(reason){
      if(mounted.current)setFailure(reason instanceof Error?reason.message:'Ouverture indisponible.')
    }finally{
      if(mounted.current)setPending(false)
    }
  }

  async function close(){
    if(!id)return
    setPending(true)
    try{
      await api(path,{action:'close',terminal_id:id})
      terminal.current=null
      setId(null)
      setNotice('Terminal fermé.')
      setFailure('')
    }catch(reason){
      setFailure(reason instanceof Error?reason.message:'Fermeture indisponible.')
    }finally{
      setPending(false)
    }
  }

  async function write(text:string){
    if(!id||pending)return
    setPending(true)
    try{
      // Le flux de lecture porte le curseur et peut continuer pendant la saisie.
      await api(path,{action:'write',terminal_id:id,text})
      setFailure('')
    }catch(reason){
      setFailure(reason instanceof Error?reason.message:'Saisie indisponible.')
    }finally{
      setPending(false)
      command.current?.focus()
    }
  }

  function send(event:FormEvent){
    event.preventDefault()
    if(!id||pending)return
    setInput('')
    void write(input+'\n')
  }

  function control(event:KeyboardEvent<HTMLInputElement>){
    if(!event.ctrlKey||event.altKey||event.metaKey)return
    if(event.key.toLowerCase()==='c'&&command.current?.selectionStart===command.current?.selectionEnd){
      event.preventDefault()
      void write('\u0003')
    }else if(event.key.toLowerCase()==='d'&&!input){
      event.preventDefault()
      void write('\u0004')
    }
  }

  return <section className="session-terminal" aria-label="Terminal de session">
    <div className="session-terminal-header">
      <h2>Terminal</h2>
      {id?<button className="secondary-button" type="button" disabled={pending} onClick={()=>void close()}>Fermer le terminal</button>
        :<button type="button" disabled={!enabled||pending} onClick={()=>void open()}>Ouvrir le terminal</button>}
    </div>
    {failure&&<p role="alert">{failure}</p>}
    <p role="status">{id?'Root dans l’atelier isolé.':notice||(!enabled?'Terminal disponible pendant un RUN actif.':'Terminal inactif.')}</p>
    {(id||output)&&<pre ref={transcript} aria-label="Sortie du terminal" tabIndex={0}>{output}</pre>}
    {id&&<form className="session-terminal-command" onSubmit={send}>
      <input ref={command} aria-label="Commande du terminal" value={input} maxLength={1023} autoComplete="off"
        spellCheck={false} onChange={event=>setInput(event.target.value)} onKeyDown={control}/>
      <button type="submit" disabled={pending}>Envoyer</button>
      <button type="button" className="secondary-button" disabled={pending} onClick={()=>void write('\u0003')}>Interrompre</button>
    </form>}
  </section>
}
