import {useId,useState,type FormEvent,type KeyboardEvent} from 'react'
import {FontControls,ResponsiveControls,useComponentStyle,useCurrentProfile} from './Appearance'
import {profiles,type ProfileName,type StyleGroup,type StyleValue} from './InterfaceStyle'
import {ComponentFieldHelp} from './InterfaceSettingHelp'
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

function ComponentStyleControls({group,profile}:{group:StyleGroup;profile:ProfileName}){
  const {fields,values,hasOverrides,saveStyle}=useComponentStyle(group,profile)
  const fieldPrefix=useId()
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
      await saveStyle(reset?{group,profile,reset:true}:{group,profile,values:changes})
      setDraft({})
      setStatus(reset?'Valeurs par défaut rétablies.':'Réglages enregistrés.')
    }catch{
      setError(true)
      setStatus('Impossible d’enregistrer les réglages.')
    }finally{setSaving(false)}
  }
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void save()}
  function edit(key:string,value:string,baseline:string){
    setDraft(previous=>{
      const next={...previous}
      if(value===baseline)delete next[key]
      else next[key]=value
      return next
    })
    setStatus('')
  }
  if(!fields.length)return <p role="status">Réglages indisponibles.</p>
  return <form className="interface-component-settings" onSubmit={submit}>
    <div className="interface-component-fields">
      {fields.map(field=>{
        const reference=field.references?field.references[profile]:field.default
        const saved=values[field.key]
        const current=field.kind==='number'&&group==='tables'&&field.key.startsWith('page_')&&typeof saved==='number'
          ?Math.min(saved,field.max):saved??reference
        const baseline=String(current??'')
        const value=draft[field.key]??baseline
        const automatic=current===null&&draft[field.key]===undefined
        const labelId=fieldPrefix+field.key
        return <div key={field.key}>
          <ComponentFieldHelp id={labelId} group={group} field={field}/>
          {field.kind==='choice'
            ?<select aria-labelledby={labelId} name={field.key} value={value} disabled={saving} onChange={event=>edit(field.key,event.target.value,baseline)}>
              {field.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            :<input aria-labelledby={labelId} name={field.key} type={field.kind} value={field.kind==='color'&&!value?field.default:value} disabled={saving}
              {...(field.kind==='number'?{required:draft[field.key]!==undefined,min:field.min,max:field.max,step:1,
                placeholder:automatic?'Automatique':undefined}:{})}
              onChange={event=>edit(field.key,event.target.value,baseline)}/>}
          {automatic&&field.kind==='color'&&<small>Automatique</small>}
          {values[field.key]===undefined&&draft[field.key]===undefined&&field.reference_hint&&
            <small>{field.reference_hint}</small>}
        </div>
      })}
    </div>
    <div className="interface-component-actions">
      <button type="submit" disabled={saving||!Object.keys(draft).length}>Enregistrer</button>
      <button type="button" disabled={saving||!hasOverrides&&!Object.keys(draft).length} onClick={()=>void save(true)}>
        Rétablir les valeurs par défaut
      </button>
    </div>
    <p role={error?'alert':'status'}>{status}</p>
  </form>
}

type Tab={id:string;label:string;width?:number}

export function TabBar({items,selected,select,prefix,label,secondary=false}:{
  items:readonly Tab[];selected:number;select:(index:number)=>void;prefix:string;label:string;secondary?:boolean
}){
  function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
    let next:number
    switch(event.key){
      case 'ArrowLeft':next=(index+items.length-1)%items.length;break
      case 'ArrowRight':next=(index+1)%items.length;break
      case 'Home':next=0;break
      case 'End':next=items.length-1;break
      default:return
    }
    event.preventDefault()
    select(next)
    event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus()
  }

  return <div className={secondary?'interface-tabs interface-resolution-tabs':'interface-tabs'} role="tablist" aria-label={label}>
    {items.map(({id,label,width},index)=><button key={id} type="button" role="tab" id={`${prefix}-tab-${id}`}
      aria-selected={index===selected} aria-controls={`${prefix}-panel-${id}`} tabIndex={index===selected?0:-1}
      title={width?`${width} px`:undefined} onClick={()=>select(index)} onKeyDown={event=>navigate(event,index)}>{label}</button>)}
  </div>
}

export function InterfaceSettings(){
  const [selected,setSelected]=useState(()=>tabs.findIndex(tab=>tab.id==='general'))
  const currentProfile=useCurrentProfile()
  const [chosenProfile,setChosenProfile]=useState<ProfileName>()
  const profile=chosenProfile??currentProfile

  return <>
    <TabBar items={tabs} selected={selected} select={setSelected} prefix="interface" label="Réglages de l’interface"/>
    {tabs.map(({id},index)=><div key={id} role="tabpanel" id={`interface-panel-${id}`}
      aria-labelledby={`interface-tab-${id}`} hidden={index!==selected}>
      {index===selected&&<>
        <TabBar items={profiles} selected={profiles.findIndex(item=>item.id===profile)}
          select={index=>setChosenProfile(profiles[index].id)} prefix={`interface-${id}-resolution`} label="Résolution de référence" secondary/>
        {profiles.map(({id:profileId})=><div key={profileId} role="tabpanel" id={`interface-${id}-resolution-panel-${profileId}`}
          aria-labelledby={`interface-${id}-resolution-tab-${profileId}`} hidden={profileId!==profile}>
          {profileId===profile&&<>
            {id==='general'&&<><h2>Taille des polices</h2><FontControls profile={profile}/></>}
            {id==='resolutions'&&<ResponsiveControls profile={profile}/>}
            {id!=='general'&&id!=='resolutions'&&<ComponentStyleControls group={id} profile={profile}/>}
          </>}
        </div>)}
      </>}
    </div>)}
  </>
}
