import {DirectoryPicker} from './DirectoryPicker'
import {useEffect,useRef,useState,type FormEvent} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {useNavigate} from '@tanstack/react-router'
import {api} from './api'
import {type Project} from './Projects'

type Snapshot={fields:Record<string,string>;project_path:string;revision:string}
type PolicyPreview={preview_id:string;state:string;old_version:string|null;new_version:string|null;local_repository:boolean;moves:Record<string,string>;unchanged_tags:number}
type PolicyConflict={state:'CONFLICT';tags:string[]}
const retentionFields=['PROJECT_DEBIAN_RETENTION','PROJECT_DOCKER_RETENTION']
const fields=['PROJECT_ID','PROJECT_NAME','PROJECT_TYPE','PROJECT_DOCKERED','PROJECT_DEBIAN_PACKAGE','PROJECT_VERSION',...retentionFields]

function VersionPolicyEditor({projectId,current,disabled,onSaved}:{projectId:string;current:string;disabled:boolean;onSaved:()=>void}){
  const [target,setTarget]=useState(current)
  const [side,setSide]=useState('right')
  const [preview,setPreview]=useState<PolicyPreview|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const submit=async(confirm:boolean)=>{
    setBusy(true);setError('')
    try{
      const result=await api<PolicyPreview|PolicyConflict>(`projects/${projectId}/version-policy`,{
        policy:Number(target),side,...(confirm&&preview?{preview_id:preview.preview_id}:{}),
      })
      if('tags' in result){setPreview(null);setError('Collision entre les tags : '+result.tags.join(', '))}
      else if(result.state==='COMPLETED')onSaved();else setPreview(result)
    }catch(reason){
      setError(reason instanceof Error?reason.message:'Adaptation indisponible')
    }finally{setBusy(false)}
  }
  return <fieldset disabled={disabled||busy}><legend>Politique de version</legend>
    <label>PROJECT_VERSION_POLICY <select value={target} onChange={event=>{setTarget(event.target.value);setPreview(null)}}>
      {[1,2,3,4,5,6,7].map(value=><option key={value} value={value}>{value}</option>)}
    </select></label>
    {target!==current&&<>
      <label>{Number(target)>Number(current)?'Ajouter les zéros':'Retirer les composantes'}
        <select value={side} onChange={event=>{setSide(event.target.value);setPreview(null)}}>
          <option value="left">À gauche</option><option value="right">À droite</option>
        </select>
      </label>
      <button type="button" onClick={()=>void submit(false)}>Afficher l’aperçu</button>
    </>}
    {preview&&<div aria-label="Aperçu de l’adaptation locale">
      {preview.old_version&&<p>Version : {preview.old_version} → {preview.new_version}</p>}
      {preview.local_repository?<p>{preview.unchanged_tags} tags conservés.</p>:<p>Aucun dépôt Git local.</p>}
      {Object.keys(preview.moves).length>0&&<ul>{Object.entries(preview.moves).map(([before,after])=><li key={before}>{before} → {after}</li>)}</ul>}
      <button type="button" onClick={()=>void submit(true)}>{preview.state==='PENDING'?'Reprendre la conversion':'Confirmer la conversion'}</button>
    </div>}
    {error&&<p role="alert">{error}</p>}
  </fieldset>
}
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
  return <>
    <button type="button" className="forge-edit" aria-label={editLabel} title={editLabel} onClick={()=>setOpen(true)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20l4-.8L19 8.2 15.8 5 4.8 16zM14.8 6l3.2 3.2M3 21h18"/></svg>
    </button>
    <dialog ref={dialog} className={git?'lifecycle-dialog forge-editor':'lifecycle-dialog forge-editor project-configuration-editor'}
      aria-label={editLabel}
      onCancel={event=>{if(event.target!==event.currentTarget)return;event.preventDefault();if(!busy)close()}}
      onClose={event=>{if(event.target===event.currentTarget&&open&&!busy)close()}}>
      <form onSubmit={save}>
        <h2>{title}</h2>
        {!snapshot&&!error&&<p role="status">Chargement…</p>}
        {snapshot&&<div className={git?undefined:'project-configuration-fields'}>
          {editorFields.map(key=>{
            const retention=retentionFields.includes(key)
            return <label key={key}>
              {key}
              <input value={values[key]||''} required={key==='PROJECT_ID'}
                placeholder={retention?'0':undefined}
                pattern={retention?'(?:[0-9]+(?:,[0-9]+D)?|[0-9]+D)':undefined}
                aria-describedby={retention?'project-retention-help':undefined}
                onChange={event=>{setValues(previous=>({...previous,[key]:event.target.value}));setDirty(true)}}
                autoComplete="off"/>
            </label>
          })}
          {!git&&<div className="project-path-field">
            <label htmlFor="project-configuration-path">Chemin du projet</label>
            <div className="directory-input">
              <input id="project-configuration-path" value={projectPath}
                onChange={event=>{setProjectPath(event.target.value);setDirty(true)}} autoComplete="off"/>
              <DirectoryPicker initialPath={projectPath} onSelect={value=>{setProjectPath(value);setDirty(true)}}/>
            </div>
          </div>}
          {!git&&<p id="project-retention-help">0 conserve tout. 3 conserve trois versions, 365D fixe une durée en jours. 3,365D cumule les deux.</p>}
        </div>}
        {snapshot&&!git&&snapshot.fields.PROJECT_VERSION_POLICY&&<VersionPolicyEditor key={snapshot.fields.PROJECT_VERSION_POLICY}
          projectId={project.id} current={snapshot.fields.PROJECT_VERSION_POLICY} disabled={dirty||busy}
          onSaved={()=>{void client.invalidateQueries({queryKey:['projects']});close()}}/>}
        {error&&<p role="alert">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={!snapshot||!dirty||busy}>{busy?'Enregistrement…':'Enregistrer'}</button>
          <button type="button" className="secondary-button" onClick={close} disabled={busy}>Fermer</button>
        </div>
      </form>
    </dialog>
  </>
}
