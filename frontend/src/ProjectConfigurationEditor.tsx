import {DirectoryPicker} from './DirectoryPicker'
import {useEffect,useRef,useState,type FormEvent} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {useNavigate} from '@tanstack/react-router'
import {api} from './api'
import {type Project} from './Projects'

type Snapshot={fields:Record<string,string>;project_path:string;revision:string}
const fields=['PROJECT_ID','PROJECT_NAME','PROJECT_TYPE','PROJECT_DOCKERED','PROJECT_DEBIAN_PACKAGE','PROJECT_VERSION']
export function ProjectConfigurationEditor({project,metadataRevision,git=false}:{project:Project;metadataRevision:number;git?:boolean}){
  const editorFields=git?['GIT_USER_NAME','GIT_USER_EMAIL','LOCAL_DEFAULT_BRANCH']:fields;const title=git?'Configuration Git':'Configuration du projet';const editLabel=git?'Modifier la configuration Git':'Modifier la configuration du projet'
  const [open,setOpen]=useState(false);const [snapshot,setSnapshot]=useState<Snapshot|null>(null);const [values,setValues]=useState<Record<string,string>>({});const [projectPath,setProjectPath]=useState('');const [dirty,setDirty]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null);const client=useQueryClient();const navigate=useNavigate()
  const path=`projects/${project.id}/configuration`
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open])
  useEffect(()=>{
    if(!open||dirty)return
    let active=true
    const refresh=async()=>{try{const data=await api<Snapshot>(path);if(active){setSnapshot(data);setValues(Object.fromEntries(editorFields.map(key=>[key,data.fields[key]||''])));setProjectPath(data.project_path);setError('')}}catch(reason){if(active)setError(reason instanceof Error?reason.message:'Lecture indisponible')}}
    void refresh();const timer=window.setInterval(()=>{void refresh()},5000)
    return ()=>{active=false;window.clearInterval(timer)}
  },[open,dirty,path,metadataRevision,git])
  const close=()=>{setOpen(false);setSnapshot(null);setValues({});setProjectPath('');setDirty(false);setError('')}
  const save=async(event:FormEvent)=>{
    event.preventDefault();if(!snapshot)return;setBusy(true);setError('')
    try{
      const result=await api<{saved:boolean;identifier:string}>(path,{fields:values,...(!git&&{project_path:projectPath}),revision:snapshot.revision})
      client.setQueryData<{projects:Project[]}>(['projects'],old=>old&&({...old,projects:old.projects.map(item=>item.id===project.id?{...item,identifier:result.identifier}:item)}))
      if(result.identifier!==(project.identifier||project.id))await navigate({to:'/projects/$projectId',params:{projectId:result.identifier},replace:true})
      await client.invalidateQueries({queryKey:['projects']});close()
    }catch(reason){setError(reason instanceof Error?reason.message:'Enregistrement indisponible')}finally{setBusy(false)}
  }
  return <><button type="button" className="forge-edit" aria-label={editLabel} title={editLabel} onClick={()=>setOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20l4-.8L19 8.2 15.8 5 4.8 16zM14.8 6l3.2 3.2M3 21h18"/></svg></button><dialog ref={dialog} className="lifecycle-dialog forge-editor" aria-label={editLabel} onCancel={event=>{if(event.target!==event.currentTarget)return;event.preventDefault();if(!busy)close()}} onClose={event=>{if(event.target===event.currentTarget&&open&&!busy)close()}}><form onSubmit={save}><h2>{title}</h2>{!snapshot&&!error&&<p role="status">Chargement…</p>}{snapshot&&editorFields.map(key=><div key={key}><label>{key}<input value={values[key]||''} required={key==='PROJECT_ID'} onChange={event=>{setValues(previous=>({...previous,[key]:event.target.value}));setDirty(true)}} autoComplete="off"/></label>{key==='PROJECT_NAME'&&<div className="project-path-field"><label htmlFor="project-configuration-path">Chemin du projet</label><div className="directory-input"><input id="project-configuration-path" value={projectPath} onChange={event=>{setProjectPath(event.target.value);setDirty(true)}} autoComplete="off"/><DirectoryPicker initialPath={projectPath} onSelect={value=>{setProjectPath(value);setDirty(true)}}/></div></div>}</div>)}{error&&<p role="alert">{error}</p>}<div className="form-actions"><button type="submit" disabled={!snapshot||!dirty||busy}>{busy?'Enregistrement…':'Enregistrer'}</button><button type="button" className="secondary-button" onClick={close} disabled={busy}>Fermer</button></div></form></dialog></>
}
