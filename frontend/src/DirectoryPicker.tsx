import {useEffect,useRef,useState} from 'react'
import {api} from './api'

type DirectoryList={path:string;parent:string;directories:string[];truncated:boolean}
export function DirectoryPicker({initialPath,onSelect}:{initialPath:string;onSelect:(path:string)=>void}){
  const [open,setOpen]=useState(false);const [path,setPath]=useState('');const [data,setData]=useState<DirectoryList|null>(null);const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open])
  useEffect(()=>{if(!open)return;let active=true;setError('');void api<DirectoryList>('projects/browse?'+new URLSearchParams({path})).then(value=>{if(active)setData(value)}).catch(reason=>{if(active){setData(null);setError(reason instanceof Error?reason.message:'Dossier inaccessible')}});return ()=>{active=false}},[open,path])
  const close=()=>{setOpen(false);setData(null);setError('')}
  return <><button type="button" className="secondary-button directory-browse" onClick={()=>{setPath(initialPath);setOpen(true)}}>Parcourir</button><dialog ref={dialog} className="lifecycle-dialog directory-picker" aria-label="Choisir un dossier" onCancel={event=>{event.preventDefault();close()}} onClose={()=>{if(open)close()}}><h2>Choisir un dossier</h2>{data&&<><p className="directory-current">{data.path}</p><div className="directory-list">{data.parent&&<button type="button" onClick={()=>setPath(data.parent)}>..</button>}{data.directories.map(name=><button type="button" key={name} onClick={()=>setPath((data.path==='/'?'':data.path)+'/'+name)}>{name}</button>)}{data.truncated&&<p>Liste limitée à 1 000 dossiers.</p>}</div></>}{!data&&!error&&<p role="status">Chargement…</p>}{error&&<><p role="alert">{error}</p><button type="button" className="secondary-button" onClick={()=>setPath('')}>Racine des projets</button></>}<div className="form-actions"><button type="button" disabled={!data} onClick={()=>{if(data){onSelect(data.path);close()}}}>Choisir ce dossier</button><button type="button" className="secondary-button" onClick={close}>Annuler</button></div></dialog></>
}
