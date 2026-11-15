import {useEffect,useRef,useState} from 'react'

type Preview={content:string}
export function ConfigPreview({agent,userId,path}:{agent:string;userId:number;path:string}){
  const [open,setOpen]=useState(false)
  const [content,setContent]=useState<string|null>(null)
  const [error,setError]=useState('')
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    if(!open){dialog.current?.close();setContent(null);setError('');return}
    if(!dialog.current?.open)dialog.current?.showModal()
    const controller=new AbortController()
    const params=new URLSearchParams({agent,id:String(userId)})
    void fetch('/api/v1/administration/agent-config-preview?'+params,{credentials:'same-origin',cache:'no-store',signal:controller.signal}).then(async response=>{
      if(!response.ok)throw new Error(response.status===404?'Fichier de configuration introuvable.':'Lecture du fichier de configuration impossible.')
      const value:Preview=await response.json()
      if(typeof value.content!=='string')throw new Error('Aperçu de configuration invalide.')
      if(!controller.signal.aborted)setContent(value.content)
    }).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Aperçu indisponible')})
    return ()=>controller.abort()
  },[open,agent,userId])
  return <><button type="button" className="agent-config-link" onClick={()=>setOpen(true)}>{path}</button><dialog ref={dialog} className="lifecycle-dialog agent-config-dialog" aria-labelledby="agent-config-dialog-title" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><h2 id="agent-config-dialog-title">Aperçu de la configuration</h2><p>{path}</p>{error?<p role="alert">{error}</p>:content===null?<p role="status">Chargement…</p>:<pre className="agent-config-content">{content}</pre>}<button type="button" onClick={()=>setOpen(false)}>Fermer</button></dialog></>
}
