import {DirectoryPicker} from './DirectoryPicker'
import {useEffect,useId,useRef,useState,type FormEvent} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {useNavigate} from '@tanstack/react-router'
import {api} from './api'
import {type Project} from './Projects'

type Snapshot={fields:Record<string,string>;project_path:string;revision:string}
type PolicyPreview={preview_id:string;state:string;old_version:string|null;new_version:string|null;local_repository:boolean;moves:Record<string,string>;unchanged_tags:number}
type PolicyConflict={state:'CONFLICT';tags:string[]}
const help = {
  PROJECT_ID:'Identifiant unique du projet utilisé dans la navigation et les opérations CAB.',
  PROJECT_NAME:'Nom affiché du projet.',
  PROJECT_LANGUAGES:'Langages du projet, séparés par des virgules. Exemple : Python, TypeScript.',
  PROJECT_FRAMEWORKS:'Frameworks du projet, séparés par des virgules. Exemple : Django, React.',
  PROJECT_DB:'Base de données et composants liés, séparés par des virgules. Exemple : PostgreSQL, Electric. Laissez vide si le projet n’en utilise pas.',
  PROJECT_SPECIFICATIONS:'Outil utilisé pour les spécifications du projet. Valeur par défaut : OpenSpec.',
  PROJECT_DOCKERED:'Active la construction et la publication Docker. Valeurs : Yes ou No.',
  PROJECT_DOCKER_RETENTION:'Rétention Docker sur la forge après publication. 0 conserve tout. 3 conserve trois versions. 365D conserve les versions âgées d’au plus 365 jours. 3,365D cumule les deux garanties.',
  PROJECT_DEBIAN_PACKAGE:'Active la construction et la publication du paquet Debian. Valeurs : Yes ou No.',
  PROJECT_DEBIAN_RETENTION:'Rétention Debian par paquet et architecture après publication. 0 conserve tout. 3 conserve trois versions. 365D conserve les versions âgées d’au plus 365 jours. 0,700D applique seulement la durée de 700 jours.',
  PROJECT_VERSION:'Version numérique du projet, selon le nombre de composantes imposé par PROJECT_VERSION_POLICY.',
  PROJECT_VERSION_POLICY:'Nombre de composantes de la version. Une modification peut adapter la version et les tags Git locaux après validation de l’aperçu.',
  PROJECT_PATH:'Chemin absolu du projet enregistré dans PostgreSQL. Choisissez un dossier existant avec le même project.env.',
}
type ProjectField = keyof typeof help
type Draft = Record<string,{base:string;value:string}>
const projectFields = Object.keys(help) as ProjectField[]
const gitFields = ['GIT_USER_NAME','GIT_USER_EMAIL','LOCAL_DEFAULT_BRANCH']
const retentionFields = ['PROJECT_DEBIAN_RETENTION','PROJECT_DOCKER_RETENTION']
const configurationFields = [...projectFields.filter(key=>key!=='PROJECT_PATH'),...gitFields]

function configurationKey(fields:Record<string,string>,path:string){
  return JSON.stringify([path,...configurationFields.map(key=>fields[key]||'')])
}

function FieldHelp({field,onClose}:{field:ProjectField;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{dialog.current?.showModal()},[])
  const close=()=>{dialog.current?.close();onClose()}
  return <dialog ref={dialog} className="lifecycle-dialog project-variable-help" aria-label={field}
    onCancel={event=>{event.preventDefault();close()}}>
    <h2>{field}</h2>
    <p>{help[field]}</p>
    <div className="form-actions"><button type="button" onClick={close}>Fermer</button></div>
  </dialog>
}

function VersionPolicyEditor({projectId,current,revision,labelId,disabled,onSaved}:{projectId:string;current:string;revision:string;labelId:string;disabled:boolean;onSaved:()=>void}){
  const [target,setTarget]=useState(current)
  const [side,setSide]=useState('right')
  const [preview,setPreview]=useState<PolicyPreview|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const submit=async(confirm:boolean)=>{
    setBusy(true);setError('')
    try{
      const result=await api<PolicyPreview|PolicyConflict>(`projects/${projectId}/version-policy`,{
        policy:Number(target),side,revision,...(confirm&&preview?{preview_id:preview.preview_id}:{}),
      })
      if('tags' in result){setPreview(null);setError('Collision entre les tags : '+result.tags.join(', '))}
      else if(result.state==='COMPLETED')onSaved();else setPreview(result)
    }catch(reason){
      setError(reason instanceof Error?reason.message:'Adaptation indisponible')
    }finally{setBusy(false)}
  }
  return <fieldset className="project-policy-field" disabled={disabled||busy}>
    <select aria-labelledby={labelId} value={target} onChange={event=>{setTarget(event.target.value);setPreview(null)}}>
      {!current&&<option value="" disabled>—</option>}
      {[1,2,3,4,5,6,7].map(value=><option key={value} value={value}>{value}</option>)}
    </select>
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
export function ProjectConfigurationEditor({project,git=false}:{project:Project;metadataRevision:number;git?:boolean}){
  const title=git?'Configuration Git':'Configuration du projet'
  const editLabel=git?'Modifier la configuration Git':'Modifier la configuration du projet'
  const [open,setOpen]=useState(false)
  const [checked,setChecked]=useState<{snapshot:Snapshot;projectionKey:string}|null>(null)
  const [drafts,setDrafts]=useState<Draft>({})
  const [checking,setChecking]=useState(false)
  const [attempt,setAttempt]=useState(0)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [helpField,setHelpField]=useState<ProjectField|null>(null)
  const dialog=useRef<HTMLDialogElement>(null)
  const fieldPrefix=useId()
  const client=useQueryClient()
  const navigate=useNavigate()
  const path=`projects/${project.id}/configuration`
  const projected=project.public_metadata?.values||{}
  const projectedFields={
    ...projected,
    PROJECT_LANGUAGES:projected.PROJECT_LANGUAGES??projected.PROJECT_TYPE??'',
    PROJECT_SPECIFICATIONS:projected.PROJECT_SPECIFICATIONS||'OpenSpec',
  }
  const projectedPath=project.public_metadata?.project_root||project.root
  const projectionKey=configurationKey(projectedFields,projectedPath)
  const pendingProjection=checked?.projectionKey===projectionKey?checked.snapshot:null
  const baseline:Record<string,string>={...(pendingProjection?.fields||projectedFields),PROJECT_PATH:pendingProjection?.project_path??projectedPath}
  const activeKey=configurationKey(baseline,baseline.PROJECT_PATH)
  const validRevision=checked&&!checking&&configurationKey(checked.snapshot.fields,checked.snapshot.project_path)===activeKey
    ? checked.snapshot.revision : ''
  const changed=Object.entries(drafts).filter(([key,draft])=>draft.value!==(baseline[key]||''))
  const conflict=changed.some(([key,draft])=>draft.base!==(baseline[key]||''))
  const value=(key:string)=>drafts[key]?.value??baseline[key]??''
  const change=(key:string,value:string)=>setDrafts(previous=>{
    const updated={...previous}
    const observed=baseline[key]??''
    if(value===observed)delete updated[key]
    else updated[key]={value,base:previous[key]?.base??observed}
    return updated
  })
  const close=()=>{
    setOpen(false);setHelpField(null);setChecked(null);setDrafts({});setError('')
  }

  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open])
  useEffect(()=>{
    if(!open)return
    let active=true
    setChecking(true)
    setError('')
    api<Snapshot>(path).then(snapshot=>{
      if(active)setChecked({snapshot,projectionKey})
    }).catch(reason=>{
      if(active){setChecked(null);setError(reason instanceof Error?reason.message:'Vérification indisponible')}
    }).finally(()=>{if(active)setChecking(false)})
    return ()=>{active=false}
  },[open,path,projectionKey,attempt])

  const save=async(event:FormEvent)=>{
    event.preventDefault()
    if(!validRevision||conflict||!changed.length)return
    setBusy(true);setError('')
    const fields=Object.fromEntries(changed.filter(([key])=>key!=='PROJECT_PATH').map(([key,draft])=>[key,draft.value]))
    const projectPath=changed.find(([key])=>key==='PROJECT_PATH')?.[1].value
    try{
      const result=await api<{saved:boolean;identifier:string}>(path,{fields,...(!git&&projectPath!==undefined&&{project_path:projectPath}),revision:validRevision})
      client.setQueryData<{projects:Project[]}>(['projects'],old=>old&&({...old,projects:old.projects.map(item=>item.id===project.id?{...item,identifier:result.identifier}:item)}))
      if(result.identifier!==(project.identifier||project.id))await navigate({to:'/projects/$projectId',params:{projectId:result.identifier},replace:true})
      await client.invalidateQueries({queryKey:['projects']});close()
    }catch(reason){
      setChecked(null)
      setError(reason instanceof Error?reason.message:'Enregistrement indisponible')
    }finally{setBusy(false)}
  }

  const fieldLabel=(key:ProjectField)=><button id={fieldPrefix+key} className="project-variable-label" type="button"
    onClick={()=>setHelpField(key)}>{key}</button>

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
        {git?gitFields.map(key=><label key={key}>{key}
          <input value={value(key)} onChange={event=>change(key,event.target.value)} autoComplete="off"/>
        </label>):<div className="project-configuration-fields">
          {projectFields.map(key=>{
            const labelId=fieldPrefix+key
            if(key==='PROJECT_PATH')return <div className="project-path-field" key={key}>
              {fieldLabel(key)}
              <div className="directory-input">
                <input aria-labelledby={labelId} value={value(key)} onChange={event=>change(key,event.target.value)} autoComplete="off"/>
                <DirectoryPicker initialPath={value(key)} onSelect={path=>change(key,path)}/>
              </div>
            </div>
            if(key==='PROJECT_VERSION_POLICY')return <div key={key}>
              {fieldLabel(key)}
              <VersionPolicyEditor key={value(key)} projectId={project.id} current={value(key)} revision={validRevision} labelId={labelId}
                disabled={!validRevision||!value(key)||!!changed.length||busy}
                onSaved={()=>{void client.invalidateQueries({queryKey:['projects']});close()}}/>
            </div>
            const retention=retentionFields.includes(key)
            return <div key={key}>
              {fieldLabel(key)}
              <input aria-labelledby={labelId} value={value(key)} required={key==='PROJECT_ID'}
                placeholder={retention?'0':undefined}
                pattern={retention?'(?:[0-9]+(?:,[0-9]+D)?|[0-9]+D)':undefined}
                onChange={event=>change(key,event.target.value)} autoComplete="off"/>
            </div>
          })}
        </div>}
        {conflict&&<p role="alert">Une des variables modifiées a changé. Fermez et rouvrez l’éditeur avant de réessayer.</p>}
        {error&&<p role="alert">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={!validRevision||!changed.length||conflict||busy}>
            {busy?'Enregistrement…':checking?'Vérification…':'Enregistrer'}
          </button>
          {!checking&&error&&<button type="button" className="secondary-button" onClick={()=>setAttempt(n=>n+1)}>Revérifier</button>}
          <button type="button" className="secondary-button" onClick={close} disabled={busy}>Fermer</button>
        </div>
      </form>
    </dialog>
    {open&&helpField&&<FieldHelp field={helpField} onClose={()=>setHelpField(null)}/>}
  </>
}
