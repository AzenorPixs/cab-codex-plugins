import {useEffect,useState,type FormEvent} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'

type Timers={quiet_seconds:number;interval_seconds:number;maximum_seconds:number;forge_auto_interval_minutes:number}
const fields=[['quiet_seconds','Temps sans changement'],['interval_seconds','Intervalle minimal entre deux analyses'],['maximum_seconds','Attente maximale en cas d’activité continue']] as const
export function GitMonitorSettings(){
  const client=useQueryClient();const query=useQuery({queryKey:['git-monitor-settings'],queryFn:()=>api<Timers>('administration/git')});const [values,setValues]=useState<Timers|null>(null);const [notice,setNotice]=useState('')
  useEffect(()=>{if(query.data)setValues(query.data)},[query.data])
  const save=useMutation({mutationFn:(value:Timers)=>api<Timers>('administration/git',value),onSuccess:value=>{client.setQueryData(['git-monitor-settings'],value);setValues(value);setNotice('Réglages enregistrés.')}})
  const submit=(event:FormEvent)=>{event.preventDefault();if(!values)return;setNotice('');save.mutate(values)}
  return <section className="administration"><h1>Git</h1><p>Surveillance des projets et regroupement des changements.</p>{query.isPending&&<p role="status">Chargement…</p>}{query.error&&<p role="alert">Réglages Git indisponibles.</p>}{values&&<form className="settings-form" onSubmit={submit}>{fields.map(([key,label])=><label key={key}>{label} (secondes)<input type="number" min="1" max="86400" required value={values[key]} onChange={event=>setValues({...values,[key]:Number(event.target.value)})}/></label>)}<label>Intervalle minimal automatique des forges (minutes)<input type="number" min="1" max="1440" required value={values.forge_auto_interval_minutes} onChange={event=>setValues({...values,forge_auto_interval_minutes:Number(event.target.value)})}/></label><p className="configuration-help">Une seule analyse Git est exécutée à la fois pour l’ensemble des projets. Les rafraîchissements manuels des forges restent possibles à tout moment.</p>{save.error&&<p role="alert">Vérifiez les délais : l’attente maximale doit être au moins égale au temps sans changement.</p>}{notice&&<p role="status">{notice}</p>}<button type="submit" disabled={save.isPending}>Enregistrer</button></form>}</section>
}
