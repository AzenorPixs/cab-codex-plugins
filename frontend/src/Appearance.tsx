import {createContext,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'
import {applyComponentStyle,nearestProfile,profileInterval,profiles,styleAtWidth,tablePageSize,
  type ComponentStyle,type ProfileName,type ProfileStyles,type StyleAdjustment,type StyleFields,type StyleGroup,type TableName} from './InterfaceStyle'

type Profile={layout:number;font:number}
type Profiles=Record<ProfileName,Profile>
type PageProfiles=Record<string,Partial<Record<ProfileName,Partial<Profile>>>>
type Preference={font_scale:number;theme:'light'|'dark';responsive:Profiles;developer_mode:boolean;page_responsive:PageProfiles;component_style:ComponentStyle;profile_styles:ProfileStyles}
type SavedPreference=Preference&{persistent:boolean;style_fields?:StyleFields}
type AppearanceValue={preferences:Preference;width:number;componentStyle:ComponentStyle;page:string;selectPage:(page:string)=>void;adjustPage:(profile:ProfileName,field:keyof Profile,value:number)=>void;pending:boolean;status:string;update:(patch:Partial<Preference>)=>void;styleFields:StyleFields;saveStyle:(change:StyleAdjustment)=>Promise<void>}
function defaultProfiles():Profiles{return Object.fromEntries(profiles.map(({id})=>[id,{layout:100,font:100}])) as Profiles}
function normalize(value:Partial<Preference>):Preference{
  const responsive=defaultProfiles()
  for(const {id} of profiles){const item=value.responsive?.[id];if(item&&Number.isInteger(item.layout)&&item.layout>=50&&item.layout<=150&&Number.isInteger(item.font)&&item.font>=50&&item.font<=150)responsive[id]={layout:item.layout,font:item.font}}
  const page_responsive:PageProfiles={}
  if(value.page_responsive&&typeof value.page_responsive==='object')for(const [page,items] of Object.entries(value.page_responsive)){if(!page.startsWith('/')||!items||typeof items!=='object')continue;const entry:Partial<Record<ProfileName,Partial<Profile>>>={};for(const {id} of profiles){const candidate=items[id];if(!candidate||typeof candidate!=='object')continue;const accepted:Partial<Profile>={};for(const field of ['layout','font'] as const){const n=candidate[field];if(typeof n==='number'&&Number.isInteger(n)&&n>=50&&n<=150)accepted[field]=n}if(Object.keys(accepted).length)entry[id]=accepted}if(Object.keys(entry).length)page_responsive[page]=entry}
  return {font_scale:typeof value.font_scale==='number'?value.font_scale:100,theme:value.theme==='dark'?'dark':'light',responsive,developer_mode:value.developer_mode===true,page_responsive,component_style:value.component_style??{},profile_styles:value.profile_styles??{}}
}
function pageProfiles(preferences:Preference,page:string):Profiles{const result=defaultProfiles();for(const {id} of profiles)result[id]={...result[id],...preferences.page_responsive[page]?.[id]};return result}
function interpolate(width:number,value:(profile:ProfileName)=>number){
  const {left,right,ratio}=profileInterval(width)
  const start=value(left.id)
  return start+(value(right.id)-start)*ratio
}
const AppearanceContext=createContext<AppearanceValue|null>(null)
function useAppearance(){const value=useContext(AppearanceContext);if(!value)throw new Error('Affichage indisponible');return value}
export function AppearanceProvider({children}:{children:ReactNode}){
  const client=useQueryClient();const loaded=useRef(false);const electricLoaded=useRef(false)
  const [preferences,setPreferences]=useState<Preference>(()=>normalize({}));const [notice,setNotice]=useState('');const [page,selectPage]=useState(()=>location.pathname)
  const latest=useRef(preferences)
  const query=useQuery({queryKey:['interface-preferences'],queryFn:()=>api<SavedPreference>('interface/preferences')})
  useEffect(()=>{if(query.data&&!loaded.current&&!electricLoaded.current){latest.current=normalize(query.data);setPreferences(latest.current);loaded.current=true}},[query.data])
  useEffect(()=>{
    if(!query.data?.persistent)return
    const controller=new AbortController();const stream=new ShapeStream({url:new URL('/api/v1/sync/interface-preferences',location.origin).href,signal:controller.signal,onError:()=>({})});const shape=new Shape(stream)
    const unsubscribe=shape.subscribe(({rows})=>{const row=rows.find(value=>Number(value.id)===1);if(!row)return;try{const raw=typeof row.preferences==='string'?JSON.parse(row.preferences):row.preferences;if(!raw||typeof raw!=='object')return;latest.current=normalize(raw as Partial<Preference>);electricLoaded.current=true;loaded.current=true;setPreferences(latest.current)}catch{return}})
    return ()=>{unsubscribe();controller.abort()}
  },[query.data?.persistent])
  const [width,setWidth]=useState(()=>window.innerWidth)
  useLayoutEffect(()=>{
    const resize=()=>setWidth(window.innerWidth)
    window.addEventListener('resize',resize)
    resize()
    return ()=>window.removeEventListener('resize',resize)
  },[])
  const componentStyle=useMemo(()=>styleAtWidth(preferences.component_style,preferences.profile_styles,width),
    [preferences.component_style,preferences.profile_styles,width])
  useLayoutEffect(()=>{
    const root=document.documentElement
    const effective=pageProfiles(preferences,page)
    const layout=interpolate(width,id=>effective[id].layout)*interpolate(width,id=>preferences.responsive[id].layout)
    const font=interpolate(width,id=>effective[id].font)*interpolate(width,id=>preferences.responsive[id].font)
    const baseFont=interpolate(width,id=>preferences.profile_styles[id]?.general?.font_scale??preferences.font_scale)
    root.style.setProperty('--responsive-layout-scale',String(layout/10000))
    root.style.setProperty('--font-scale',String(baseFont*font/1000000))
    root.dataset.theme=preferences.theme
    return applyComponentStyle(root,componentStyle,width)
  },[preferences,page,width,componentStyle])
  const componentSave=useMutation({
    mutationFn:(change:StyleAdjustment)=>api<Pick<Preference,'responsive'|'profile_styles'>>('interface/style',change),
    scope:{id:'interface-preferences'},
    onSuccess:(saved, {group,profile})=>{
      if(group==='resolutions'){
        const responsive={...latest.current.responsive,[profile]:saved.responsive[profile]??{layout:100,font:100}}
        latest.current={...latest.current,responsive}
      }else{
        const profileStyles={...latest.current.profile_styles}
        const next={...profileStyles[profile]}
        if(group==='general'){
          if(saved.profile_styles[profile]?.general)next.general=saved.profile_styles[profile].general
          else delete next.general
        }else{
          const value=saved.profile_styles[profile]?.[group]
          if(value)next[group]=value
          else delete next[group]
        }
        if(Object.keys(next).length)profileStyles[profile]=next
        else delete profileStyles[profile]
        latest.current={...latest.current,profile_styles:profileStyles}
      }
      setPreferences(latest.current)
    },
  })
  async function saveStyle(change:StyleAdjustment){await componentSave.mutateAsync(change)}
  const save=useMutation({mutationFn:(value:Preference)=>api<SavedPreference>('interface/preferences',value),scope:{id:'interface-preferences'},onSuccess:(value)=>{client.setQueryData(['interface-preferences'],value);setNotice('Préférences enregistrées.')},onError:()=>setNotice('Affichage appliqué ; enregistrement indisponible.')})
  const savePage=useMutation({mutationFn:(value:{page:string;profile:ProfileName;field:keyof Profile;value:number})=>api('interface/responsive/page',value),scope:{id:'interface-preferences'},onSuccess:()=>setNotice('Réglage de la page enregistré.'),onError:()=>setNotice('Enregistrement du réglage impossible.')})
  function adjustPage(profile:ProfileName,field:keyof Profile,value:number){const pages=latest.current.page_responsive;const next={...pages,[page]:{...pages[page],[profile]:{...pages[page]?.[profile],[field]:value}}};latest.current={...latest.current,page_responsive:next};setPreferences(latest.current);if(query.data?.persistent)savePage.mutate({page,profile,field,value});else setNotice('Préférences temporaires jusqu’à l’initialisation de CAB.')}
  function update(patch:Partial<Preference>){const value={...latest.current,...patch};latest.current=value;setPreferences(value);if(query.data?.persistent)save.mutate(value);else setNotice('Préférences temporaires jusqu’à l’initialisation de CAB.')}
  const status=save.isPending?'Enregistrement des préférences…':notice
  return <AppearanceContext.Provider value={{preferences,width,componentStyle,page,selectPage,adjustPage,pending:query.isPending||save.isPending||savePage.isPending,status,update,styleFields:query.data?.style_fields||{},saveStyle}}>{children}</AppearanceContext.Provider>
}
export function useCurrentProfile(){return nearestProfile(useAppearance().width).id}
export function useComponentStyle(group:StyleGroup,profile:ProfileName){
  const {preferences,styleFields,saveStyle}=useAppearance()
  return {fields:styleFields[group]||[],values:{...preferences.component_style[group],...preferences.profile_styles[profile]?.[group]},
    hasOverrides:Object.keys(preferences.profile_styles[profile]?.[group]||{}).length>0,saveStyle}
}
export function useTablePageSize(table:TableName){return tablePageSize(useAppearance().componentStyle,table)}
export function PageAppearance({path}:{path:string}){const {selectPage}=useAppearance();useEffect(()=>selectPage(path),[path,selectPage]);return null}

export function FontControls({profile}:{profile:ProfileName}){
  const {preferences,saveStyle}=useAppearance()
  const [pending,setPending]=useState(false)
  const [message,setMessage]=useState('')
  const saved=preferences.profile_styles[profile]?.general?.font_scale
  const size=saved??preferences.font_scale
  async function change(value?:number){
    setPending(true)
    try{
      await saveStyle({profile,group:'general',...(value===undefined?{reset:true}:{values:{font_scale:value}})})
      setMessage('Réglage enregistré.')
    }catch{setMessage('Impossible d’enregistrer la taille du texte.')}
    finally{setPending(false)}
  }
  return <div className="interface-font-controls" aria-label="Taille des polices">
    <div className="font-controls">
      <button type="button" className="header-control" aria-label="Réduire la taille du texte" disabled={pending||size<=80}
        onClick={()=>void change(Math.max(80,size-10))}>−</button>
      <output aria-label="Taille du texte">{size}%</output>
      <button type="button" className="header-control" aria-label="Augmenter la taille du texte" disabled={pending||size>=160}
        onClick={()=>void change(Math.min(160,size+10))}>+</button>
    </div>
    <button type="button" disabled={pending||saved===undefined} onClick={()=>void change()}>Rétablir la taille héritée</button>
    <p role="status">{message}</p>
  </div>
}

export function ResponsiveControls({profile}:{profile:ProfileName}){
  const {preferences,saveStyle}=useAppearance()
  const [draft,setDraft]=useState<Partial<Profile>>({})
  const [pending,setPending]=useState(false)
  const [message,setMessage]=useState('')
  const current=preferences.responsive[profile]
  const value={...current,...draft}
  async function save(reset=false){
    setPending(true)
    try{
      await saveStyle({profile,group:'resolutions',...(reset?{reset:true}:{values:draft})})
      setDraft({})
      setMessage('Réglages enregistrés.')
    }catch{setMessage('Impossible d’enregistrer les réglages.')}
    finally{setPending(false)}
  }
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void save()}
  return <form className="responsive-controls" onSubmit={submit}>
    <h2>Adaptation par résolution</h2>
    <p>Ces pourcentages multiplient les références de chaque page. CAB interpole les valeurs entre deux résolutions.</p>
    <fieldset className="responsive-profile"><legend>Facteurs globaux</legend>
      {(['layout','font'] as const).map(field=><label key={field}>{field==='layout'?'Interface (%)':'Police (%)'}
        <input type="number" min="50" max="150" step="1" required value={value[field]||''} disabled={pending}
          onChange={event=>setDraft({...draft,[field]:Number(event.target.value)})}/>
      </label>)}
    </fieldset>
    <div className="interface-component-actions">
      <button type="submit" disabled={pending||!Object.keys(draft).length}>Enregistrer</button>
      <button type="button" disabled={pending||(current.layout===100&&current.font===100&&!Object.keys(draft).length)}
        onClick={()=>void save(true)}>Rétablir les valeurs par défaut</button>
    </div>
    <p role="status">{message}</p>
  </form>
}
export function DeveloperModeToggle(){
  const {preferences,pending,status,update}=useAppearance()
  return <section className="developer-mode"><h2>Mode développeur</h2><label><input type="checkbox" checked={preferences.developer_mode} disabled={pending} onChange={event=>update({developer_mode:event.target.checked})}/> Activer les réglages responsives dans le bandeau</label><output aria-label="État du mode développeur">{preferences.developer_mode?'1':'0'}</output><p role="status">{status}</p></section>
}
export function DeveloperToolbar(){
  const {preferences,page,pending,status,adjustPage,width}=useAppearance()
  if(!preferences.developer_mode)return null
  const profile=nearestProfile(width)
  const current=pageProfiles(preferences,page)[profile.id]
  function change(field:keyof Profile,delta:number){const value=Math.min(150,Math.max(50,current[field]+delta));adjustPage(profile.id,field,value)}
  return <div className="developer-toolbar" aria-label="Réglages responsives développeur"><span>Page · {profile.label} · {profile.width} px</span>{(['layout','font'] as const).map(field=><div className="developer-toolbar-control" key={field}><span>{field==='layout'?'Interface':'Police'}</span><button type="button" disabled={pending||current[field]<=50} aria-label={`Réduire ${field==='layout'?'interface':'police'} ${profile.label}`} onClick={()=>change(field,-1)}>−</button><output>{current[field]} %</output><button type="button" disabled={pending||current[field]>=150} aria-label={`Augmenter ${field==='layout'?'interface':'police'} ${profile.label}`} onClick={()=>change(field,1)}>+</button></div>)}<span className="sr-only" role="status">{status}</span></div>
}
export function ThemeToggle(){const {preferences,pending,status,update}=useAppearance();return <div className="appearance-controls" aria-label="Affichage">

    <button type="button" className="header-control theme-control" disabled={pending} aria-label={preferences.theme==='light'?'Activer le mode sombre':'Activer le mode clair'} title={preferences.theme==='light'?'Mode sombre':'Mode clair'} onClick={()=>update({theme:preferences.theme==='light'?'dark':'light'})}>
      {preferences.theme==='light'?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20.6 14.2A8.8 8.8 0 0 1 9.8 3.4 8.8 8.8 0 1 0 20.6 14.2Z"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>}
    </button><span className="sr-only" role="status">{status}</span></div>}
