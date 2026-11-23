import {useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {api} from './api'
import {GitCommitOverview} from './GitCommitOverview'

type Tag={name:string;description:string;object_id:string;commit:string;annotated:boolean}
export function GitTagEditor({projectId,name,commit,defaultTag=''}:{projectId:string;name:string;commit?:string;defaultTag?:string}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const client=useQueryClient()
  const remove=async()=>{setBusy(true);setError('');try{const current=await api<Tag>(`projects/${encodeURIComponent(projectId)}/git/tag?name=${encodeURIComponent(name)}`);await api(`projects/${encodeURIComponent(projectId)}/git/tag`,{name:current.name,new_name:'',description:'',expected_oid:current.object_id,expected_commit:current.commit});await client.invalidateQueries({queryKey:['projects']})}catch(reason){setError(reason instanceof Error?reason.message:'Suppression du tag indisponible.')}finally{setBusy(false)}}
  return <><span className="git-tag-inline"><GitCommitOverview projectId={projectId} commit={commit||''} editor={{tag:name,defaultTag:!name?defaultTag:undefined,label:name||'—'}}/>{!!name&&<button type="button" className="forge-edit git-tag-delete" onClick={()=>void remove()} disabled={busy} aria-label={`Supprimer le tag ${name}`} title={`Supprimer le tag ${name}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg></button>}</span>{error&&<span role="alert">{error}</span>}</>
}
