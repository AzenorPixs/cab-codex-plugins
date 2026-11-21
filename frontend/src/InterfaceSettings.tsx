import {useState,type FormEvent,type KeyboardEvent} from 'react'
import {FontControls,ResponsiveControls,useComponentStyle} from './Appearance'
import type {StyleGroup,StyleValue} from './InterfaceStyle'
import './InterfaceSettings.css'

const tabs=[
  {id:'blocs',label:'Blocs'},
  {id:'columns',label:'Colonnes'},
  {id:'general',label:'Général'},
  {id:'menus',label:'Menus'},
  {id:'resolutions',label:'Résolutions'},
  {id:'tables',label:'Tableaux'},
  {id:'titles',label:'Titres'},
  {id:'top_bar',label:'Top barre'},
] as const

function ComponentStyleControls({group}:{group:StyleGroup}){
  const {fields,values,saveStyle}=useComponentStyle(group)
  const [draft,setDraft]=useState<Record<string,string>>({})
  const [status,setStatus]=useState('')
  const [error,setError]=useState(false)
  const [saving,setSaving]=useState(false)

  async function save(reset=false){
    setSaving(true)
    setStatus('')
    setError(false)
    const changes:Record<string,StyleValue>={}
    for(const field of fields){
      const edited=draft[field.key]
      if(edited!==undefined)changes[field.key]=field.kind==='number'?Number(edited):edited
    }
    try{
      await saveStyle(reset?{group,reset:true}:{group,values:changes})
      setDraft({})
      setStatus(reset?'Valeurs par défaut rétablies.':'Réglages enregistrés.')
    }catch{
      setError(true)
      setStatus('Impossible d’enregistrer les réglages.')
    }finally{setSaving(false)}
  }
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void save()}
  function edit(key:string,value:string){setDraft(previous=>({...previous,[key]:value}));setStatus('')}
  if(!fields.length)return <p role="status">Réglages indisponibles.</p>
  return <form className="interface-component-settings" onSubmit={submit}>
    <div className="interface-component-fields">
      {fields.map(field=>{
        const value=draft[field.key]??String(values[field.key]??field.default)
        return <label key={field.key}>{field.label}{field.kind==='number'&&field.unit?` (${field.unit})`:''}
          {field.kind==='choice'
            ?<select name={field.key} value={value} disabled={saving} onChange={event=>edit(field.key,event.target.value)}>
              {field.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            :<input name={field.key} type={field.kind} value={value} disabled={saving}
              {...(field.kind==='number'?{required:true,min:field.min,max:field.max,step:1}:{})}
              onChange={event=>edit(field.key,event.target.value)}/>}
        </label>
      })}
    </div>
    <div className="interface-component-actions">
      <button type="submit" disabled={saving||!Object.keys(draft).length}>Enregistrer</button>
      <button type="button" disabled={saving||!Object.keys(values).length&&!Object.keys(draft).length} onClick={()=>void save(true)}>
        Rétablir les valeurs par défaut
      </button>
    </div>
    <p role={error?'alert':'status'}>{status}</p>
  </form>
}

export function InterfaceSettings(){
  const [selected,setSelected]=useState(()=>tabs.findIndex(tab=>tab.id==='general'))

  function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
    let next:number
    switch(event.key){
      case 'ArrowLeft':next=(index+tabs.length-1)%tabs.length;break
      case 'ArrowRight':next=(index+1)%tabs.length;break
      case 'Home':next=0;break
      case 'End':next=tabs.length-1;break
      default:return
    }
    event.preventDefault()
    setSelected(next)
    event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus()
  }

  return <>
    <div className="interface-tabs" role="tablist" aria-label="Réglages de l’interface">
      {tabs.map(({id,label},index)=><button key={id} type="button" role="tab" id={`interface-tab-${id}`}
        aria-selected={index===selected} aria-controls={`interface-panel-${id}`} tabIndex={index===selected?0:-1}
        onClick={()=>setSelected(index)} onKeyDown={event=>navigate(event,index)}>{label}</button>)}
    </div>
    {tabs.map(({id},index)=><div key={id} role="tabpanel" id={`interface-panel-${id}`}
      aria-labelledby={`interface-tab-${id}`} hidden={index!==selected}>
      {id==='general'&&<>
        <h2>Taille des polices</h2>
        <p>Ces réglages s’appliquent à toute l’interface et sont enregistrés en base de données. Le bouton clair/sombre reste dans le bandeau.</p>
        <FontControls/>
      </>}
      {id==='resolutions'&&<ResponsiveControls/>}
      {id!=='general'&&id!=='resolutions'&&<ComponentStyleControls group={id}/>}
    </div>)}
  </>
}
