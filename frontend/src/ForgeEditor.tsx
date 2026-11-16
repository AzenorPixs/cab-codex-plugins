import {useEffect,useRef,useState,type FormEvent} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {api} from './api'

type Snapshot={fields:Record<string,string>;token:string;revision:string}
const suffixes=['BASE_URL','OWNER','REPOSITORY','NAME','BRANCH','SSL_VERIFY']
export function ForgeEditor({projectId,forge,label,metadataRevision}:{projectId:string;forge:string;label:string;metadataRevision:number}){
  const [open,setOpen]=useState(false);const [snapshot,setSnapshot]=useState<Snapshot|null>(null);const [fields,setFields]=useState<Record<string,string>>({});const [token,setToken]=useState('');const [showToken,setShowToken]=useState(false);const [dirty,setDirty]=useState(false);const [tokenDirty,setTokenDirty]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null);const client=useQueryClient()
  const path=`projects/${projectId}/forges/${forge}`
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open])
  useEffect(()=>{
    if(!open||dirty)return
    let active=true
    const refresh=async()=>{try{const data=await api<Snapshot>(path);if(active){setSnapshot(data);setFields(data.fields);setToken(data.token);setError('')}}catch(reason){if(active)setError(reason instanceof Error?reason.message:'Lecture indisponible')}}
    void refresh();const timer=window.setInterval(()=>{void refresh()},5000)
    return ()=>{active=false;window.clearInterval(timer)}
  },[open,dirty,path,metadataRevision])
  const close=()=>{setOpen(false);setSnapshot(null);setFields({});setToken('');setShowToken(false);setDirty(false);setTokenDirty(false);setError('')}
  const save=async(event:FormEvent)=>{event.preventDefault();if(!snapshot)return;setBusy(true);setError('');try{await api(path,{fields,token:tokenDirty?token:null,revision:snapshot.revision});await client.invalidateQueries({queryKey:['projects']});close()}catch(reason){setError(reason instanceof Error?reason.message:'Enregistrement indisponible')}finally{setBusy(false)}}
  return <><button type="button" className="forge-edit" aria-label={'Modifier '+label} title={'Modifier '+label} onClick={()=>setOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20l4-.8L19 8.2 15.8 5 4.8 16zM14.8 6l3.2 3.2M3 21h18"/></svg></button><dialog ref={dialog} className="lifecycle-dialog forge-editor" aria-label={'Modifier '+label} onCancel={event=>{event.preventDefault();if(!busy)close()}} onClose={()=>{if(open&&!busy)close()}}><form onSubmit={save}><h2>Configuration {label}</h2>{!snapshot&&!error&&<p role="status">Chargement…</p>}{snapshot&&<>{suffixes.map(suffix=>{const key=`REMOTE_${forge}_${suffix}`;return <label key={key}>{key}<input value={fields[key]||''} onChange={event=>{setFields(previous=>({...previous,[key]:event.target.value}));setDirty(true)}} autoComplete="off"/></label>})}<label>Token — config/{forge.toLowerCase()}.token<span className="forge-token-field"><input type={showToken?"text":"password"} value={token} onChange={event=>{setToken(event.target.value);setTokenDirty(true);setDirty(true)}} autoComplete="off"/><button type="button" className="forge-token-eye" aria-label={showToken?"Masquer le token":"Afficher le token"} title={showToken?"Masquer le token":"Afficher le token"} onClick={()=>setShowToken(value=>!value)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>{showToken&&<path d="M4 4l16 16"/>}</svg></button></span></label></>}{error&&<p role="alert">{error}</p>}<div className="form-actions"><button type="submit" disabled={!snapshot||!dirty||busy}>{busy?'Enregistrement…':'Enregistrer'}</button><button type="button" className="secondary-button" onClick={close} disabled={busy}>Fermer</button></div></form></dialog></>
}
