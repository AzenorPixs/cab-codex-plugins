import {useEffect,useRef,useState,type FormEvent} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'
import {ConfigPreview} from './ConfigPreview'

type AgentUser={id:number;username:string;home:string;config_present:boolean|null;config_path:string;config_error:string;reconcile_state:string}
type AgentUsers={users:AgentUser[]}
const errors:Record<string,string>={'agent-cab-conflict':'L’entrée MCP cab existe avec une autre configuration ; elle n’a pas été modifiée.','agent-config-invalid':'Le fichier de configuration est invalide.','agent-config-unsafe':'Le fichier de configuration ne peut pas être vérifié en sécurité.','agent-config-changed':'Le fichier a changé pendant la vérification ; ouvrez à nouveau cette page.','agent-config-write-uncertain':'Résultat incertain : vérification nécessaire.'}

export function AgentUsers({agent}:{agent:string}){
  const client=useQueryClient()
  const [open,setOpen]=useState(false)
  const [username,setUsername]=useState('')
  const dialog=useRef<HTMLDialogElement>(null)
  const query=useQuery({queryKey:['agent-users',agent],queryFn:()=>api<AgentUsers>('administration/agent-users?'+new URLSearchParams({agent}))})
  const add=useMutation({mutationFn:()=>api<AgentUser>('administration/agent-users',{agent,username:username.trim()}),onSuccess:()=>{client.invalidateQueries({queryKey:['agent-users',agent]});setOpen(false);setUsername('')}})
  const remove=useMutation({mutationFn:(id:number)=>api<{removed:boolean}>('administration/agent-users/remove',{agent,id}),onSuccess:()=>client.invalidateQueries({queryKey:['agent-users',agent]})})
  useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();else if(!open&&dialog.current?.open)dialog.current.close()},[open])
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();add.mutate()}
  return <section className="agent-card"><div className="agent-block-heading agent-block-header"><h2>Utilisateur(s) lié(s) à l’Agent</h2><button type="button" className="add-project" aria-label="Déclarer un utilisateur" onClick={()=>{add.reset();setOpen(true)}}>+</button></div>
    <div className="agent-card-content">{query.isPending?<p role="status">Chargement des utilisateurs…</p>:query.error?<p role="alert">Utilisateurs indisponibles : {query.error.message}</p>:query.data.users.map(user=><div key={user.id}><div className="agent-user-row"><strong>{user.username}</strong><div className="agent-user-config">{user.config_present===true?<ConfigPreview agent={agent} userId={user.id} path={user.config_path}/>:<span>{user.config_present===false?'Configuration non présente':user.config_error?'Configuration à vérifier':'Vérification en cours'}</span>}</div><button type="button" className="agent-user-remove" aria-label={'Retirer '+user.username} title={'Retirer '+user.username} disabled={remove.isPending} onClick={()=>remove.mutate(user.id)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 3v7m4-7v7"/></svg></button></div>{user.config_error&&<p className="agent-user-config-error" role="status">{errors[user.config_error]||'Déclaration MCP à vérifier.'}</p>}</div>)}
    {remove.error&&<p role="alert">{remove.error.message}</p>}</div>
    <dialog ref={dialog} aria-labelledby="agent-user-dialog-title" className="lifecycle-dialog" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><form onSubmit={submit}><h2 id="agent-user-dialog-title">Déclarer un utilisateur</h2><label>Identifiant du compte<input value={username} onChange={event=>setUsername(event.target.value)} required autoFocus autoComplete="off"/></label>{add.error&&<p role="alert">{add.error.message==='agent-account-missing'?'Compte inexistant':add.error.message==='agent-home-missing'?`Home inexistante pour le compte ${username.trim()}`:add.error.message}</p>}<div className="form-actions"><button type="submit" disabled={add.isPending}>{add.isPending?'Enregistrement…':'Ajouter'}</button><button type="button" className="secondary-button" onClick={()=>setOpen(false)} disabled={add.isPending}>Annuler</button></div></form></dialog>
  </section>
}
