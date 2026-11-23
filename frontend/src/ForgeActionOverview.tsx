import {useEffect,useRef,type ReactNode} from 'react'
import {ApiError,apiErrorMessage} from './api'

export function actionMessage(error:unknown,fallback:string){
  return error instanceof Error?error.message:fallback
}

export function ForgeActionError({error,fallback}:{error:unknown;fallback:string}){
  if(!error)return null
  const details=error instanceof ApiError&&error.details&&typeof error.details==='object'?error.details:null
  const cause=details&&'cause' in details?details.cause:null
  const missing=details&&'missing' in details&&Array.isArray(details.missing)?
    details.missing.filter((item):item is string=>typeof item==='string'):[]
  return <div role="alert">
    <p>{actionMessage(error,fallback)}</p>
    {typeof cause==='string'&&error instanceof ApiError&&cause!==error.code&&<p>{apiErrorMessage(cause)}</p>}
    {missing.length>0&&<ul>{missing.map(item=><li key={item}>{item}</li>)}</ul>}
  </div>
}

export function ForgeActionOverview({title,children,close}:{title:string;children:ReactNode;close:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{if(!dialog.current?.open)dialog.current?.showModal()},[])
  return <dialog ref={dialog} className="lifecycle-dialog git-commit-console-dialog" aria-label={title} onClose={close}>
    <h2>{title}</h2>
    {children}
    <div className="form-actions"><button type="button" onClick={close} autoFocus>Fermer</button></div>
  </dialog>
}
