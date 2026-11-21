import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,type FormEvent,type ReactNode} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {Shape,ShapeStream} from '@electric-sql/client'
import {api} from './api'
import {applyComponentStyle,tablePageSize,type ComponentStyle,type StyleAdjustment,type StyleFields,type TableName} from './InterfaceStyle'

type ProfileName='mobile'|'tablet'|'hd'|'fullhd'|'qhd'|'uhd'
type Profile={layout:number;font:number}
type Profiles=Record<ProfileName,Profile>
type PageProfiles=Record<string,Partial<Record<ProfileName,Partial<Profile>>>>
type Preference={font_scale:number;theme:'light'|'dark';responsive:Profiles;developer_mode:boolean;page_responsive:PageProfiles;component_style:ComponentStyle}
type SavedPreference=Preference&{persistent:boolean;style_fields?:StyleFields}
type AppearanceValue={preferences:Preference;page:string;selectPage:(page:string)=>void;adjustPage:(profile:ProfileName,field:keyof Profile,value:number)=>void;pending:boolean;status:string;update:(patch:Partial<Preference>)=>void;styleFields:StyleFields;saveStyle:(change:StyleAdjustment)=>Promise<void>}
const profiles:{id:ProfileName;label:string;width:number}[]=[{id:'mobile',label:'Mobile',width:390},{id:'tablet',label:'Tablette',width:768},{id:'hd',label:'HD',width:1366},{id:'fullhd',label:'Full HD',width:1920},{id:'qhd',label:'QHD',width:2560},{id:'uhd',label:'4K',width:3840}]
function defaultProfiles():Profiles{return Object.fromEntries(profiles.map(({id})=>[id,{layout:100,font:100}])) as Profiles}
function normalize(value:Partial<Preference>):Preference{
  const responsive=defaultProfiles()
  for(const {id} of profiles){const item=value.responsive?.[id];if(item&&Number.isInteger(item.layout)&&item.layout>=50&&item.layout<=150&&Number.isInteger(item.font)&&item.font>=50&&item.font<=150)responsive[id]={layout:item.layout,font:item.font}}
  const page_responsive:PageProfiles={}
  if(value.page_responsive&&typeof value.page_responsive==='object')for(const [page,items] of Object.entries(value.page_responsive)){if(!page.startsWith('/')||!items||typeof items!=='object')continue;const entry:Partial<Record<ProfileName,Partial<Profile>>>={};for(const {id} of profiles){const candidate=items[id];if(!candidate||typeof candidate!=='object')continue;const accepted:Partial<Profile>={};for(const field of ['layout','font'] as const){const n=candidate[field];if(typeof n==='number'&&Number.isInteger(n)&&n>=50&&n<=150)accepted[field]=n}if(Object.keys(accepted).length)entry[id]=accepted}if(Object.keys(entry).length)page_responsive[page]=entry}
  return {font_scale:typeof value.font_scale==='number'?value.font_scale:100,theme:value.theme==='dark'?'dark':'light',responsive,developer_mode:value.developer_mode===true,page_responsive,component_style:value.component_style??{}}
}
function pageProfiles(preferences:Preference,page:string):Profiles{const result=defaultProfiles();for(const {id} of profiles)result[id]={...result[id],...preferences.page_responsive[page]?.[id]};return result}
function interpolate(width:number,values:Profiles,field:keyof Profile){
  if(width<=profiles[0].width)return values[profiles[0].id][field]
  for(let i=1;i<profiles.length;i++){const left=profiles[i-1],right=profiles[i];if(width<=right.width){const a=values[left.id][field],b=values[right.id][field];return a+(b-a)*(width-left.width)/(right.width-left.width)}}
  return values[profiles[profiles.length-1].id][field]
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
  useEffect(()=>{
    const apply=()=>{const width=window.innerWidth;const effective=pageProfiles(preferences,page);const layout=interpolate(width,effective,'layout')*interpolate(width,preferences.responsive,'layout')/100;const font=interpolate(width,effective,'font')*interpolate(width,preferences.responsive,'font')/100;document.documentElement.style.setProperty('--responsive-layout-scale',String(layout/100));document.documentElement.style.setProperty('--font-scale',String(preferences.font_scale*font/10000));document.documentElement.dataset.theme=preferences.theme}
    apply();window.addEventListener('resize',apply);return ()=>window.removeEventListener('resize',apply)
  },[preferences,page])
  useLayoutEffect(()=>applyComponentStyle(document.documentElement,preferences.component_style),[preferences.component_style])
  const componentSave=useMutation({
    mutationFn:(change:StyleAdjustment)=>api<{component_style:ComponentStyle}>('interface/style',change),
    scope:{id:'interface-preferences'},
    onSuccess:({component_style}, {group})=>{
      const next={...latest.current.component_style}
      if(component_style[group])next[group]=component_style[group]
      else delete next[group]
      latest.current={...latest.current,component_style:next}
      setPreferences(latest.current)
    },
  })
  async function saveStyle(change:StyleAdjustment){await componentSave.mutateAsync(change)}
  const save=useMutation({mutationFn:(value:Preference)=>api<SavedPreference>('interface/preferences',value),scope:{id:'interface-preferences'},onSuccess:(value)=>{client.setQueryData(['interface-preferences'],value);setNotice('Préférences enregistrées.')},onError:()=>setNotice('Affichage appliqué ; enregistrement indisponible.')})
  const savePage=useMutation({mutationFn:(value:{page:string;profile:ProfileName;field:keyof Profile;value:number})=>api('interface/responsive/page',value),scope:{id:'interface-preferences'},onSuccess:()=>setNotice('Réglage de la page enregistré.'),onError:()=>setNotice('Enregistrement du réglage impossible.')})
  function adjustPage(profile:ProfileName,field:keyof Profile,value:number){const pages=latest.current.page_responsive;const next={...pages,[page]:{...pages[page],[profile]:{...pages[page]?.[profile],[field]:value}}};latest.current={...latest.current,page_responsive:next};setPreferences(latest.current);if(query.data?.persistent)savePage.mutate({page,profile,field,value});else setNotice('Préférences temporaires jusqu’à l’initialisation de CAB.')}
  function update(patch:Partial<Preference>){const value={...latest.current,...patch};latest.current=value;setPreferences(value);if(query.data?.persistent)save.mutate(value);else setNotice('Préférences temporaires jusqu’à l’initialisation de CAB.')}
  const status=save.isPending?'Enregistrement des préférences…':notice
  return <AppearanceContext.Provider value={{preferences,page,selectPage,adjustPage,pending:query.isPending||save.isPending||savePage.isPending,status,update,styleFields:query.data?.style_fields||{},saveStyle}}>{children}</AppearanceContext.Provider>
}
export function useComponentStyle(group:StyleAdjustment['group']){
  const {preferences,styleFields,saveStyle}=useAppearance()
  return {fields:styleFields[group]||[],values:preferences.component_style[group]||{},saveStyle}
}
export function useTablePageSize(table:TableName){return tablePageSize(useAppearance().preferences.component_style,table)}
export function PageAppearance({path}:{path:string}){const {selectPage}=useAppearance();useEffect(()=>selectPage(path),[path,selectPage]);return null}
export function FontControls(){const {preferences,pending,status,update}=useAppearance();return <div className="interface-font-controls" aria-label="Taille des polices">
    <div className="font-controls"><button type="button" className="header-control" aria-label="Réduire la taille du texte" title="Réduire les polices" disabled={pending||preferences.font_scale<=80} onClick={()=>update({font_scale:Math.max(80,preferences.font_scale-10)})}>−</button><output aria-label="Taille du texte">{preferences.font_scale}%</output><button type="button" className="header-control" aria-label="Augmenter la taille du texte" title="Agrandir les polices" disabled={pending||preferences.font_scale>=160} onClick={()=>update({font_scale:Math.min(160,preferences.font_scale+10)})}>+</button></div><p role="status">{status}</p></div>}
export function ResponsiveControls(){
  const {preferences,pending,status,update}=useAppearance();const [draft,setDraft]=useState<Profiles>(preferences.responsive);const [dirty,setDirty]=useState(false)
  useEffect(()=>{if(!dirty)setDraft(preferences.responsive)},[preferences.responsive,dirty])
  function change(id:ProfileName,field:keyof Profile,value:string){setDirty(true);setDraft(current=>({...current,[id]:{...current[id],[field]:value===''?0:Number(value)}}))}
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(profiles.some(({id})=>[draft[id].layout,draft[id].font].some(value=>!Number.isInteger(value)||value<50||value>150)))return;update({responsive:draft});setDirty(false)}
  return <form className="responsive-controls" onSubmit={submit}><h2>Adaptation par résolution</h2><p>Ces pourcentages globaux multiplient les réglages propres à chaque page sans les remplacer. Entre deux résolutions, CAB adapte progressivement les valeurs.</p><div className="responsive-profile-list">{profiles.map(({id,label,width})=><fieldset className="responsive-profile" key={id}><legend>{label} · {width} px</legend><label>Interface (%)<input type="number" min="50" max="150" step="1" required value={draft[id].layout||''} onChange={event=>change(id,'layout',event.target.value)}/></label><label>Police (%)<input type="number" min="50" max="150" step="1" required value={draft[id].font||''} onChange={event=>change(id,'font',event.target.value)}/></label></fieldset>)}</div><button type="submit" disabled={pending||!dirty}>Enregistrer</button><p role="status">{status}</p></form>
}
export function DeveloperModeToggle(){
  const {preferences,pending,status,update}=useAppearance()
  return <section className="developer-mode"><h2>Mode développeur</h2><label><input type="checkbox" checked={preferences.developer_mode} disabled={pending} onChange={event=>update({developer_mode:event.target.checked})}/> Activer les réglages responsives dans le bandeau</label><output aria-label="État du mode développeur">{preferences.developer_mode?'1':'0'}</output><p role="status">{status}</p></section>
}
export function DeveloperToolbar(){
  const {preferences,page,pending,status,adjustPage}=useAppearance();const [width,setWidth]=useState(()=>window.innerWidth)
  useEffect(()=>{const resize=()=>setWidth(window.innerWidth);window.addEventListener('resize',resize);return ()=>window.removeEventListener('resize',resize)},[])
  if(!preferences.developer_mode)return null
  const profile=profiles.reduce((best,item)=>Math.abs(item.width-width)<Math.abs(best.width-width)?item:best)
  const current=pageProfiles(preferences,page)[profile.id]
  function change(field:keyof Profile,delta:number){const value=Math.min(150,Math.max(50,current[field]+delta));adjustPage(profile.id,field,value)}
  return <div className="developer-toolbar" aria-label="Réglages responsives développeur"><span>Page · {profile.label} · {profile.width} px</span>{(['layout','font'] as const).map(field=><div className="developer-toolbar-control" key={field}><span>{field==='layout'?'Interface':'Police'}</span><button type="button" disabled={pending||current[field]<=50} aria-label={`Réduire ${field==='layout'?'interface':'police'} ${profile.label}`} onClick={()=>change(field,-1)}>−</button><output>{current[field]} %</output><button type="button" disabled={pending||current[field]>=150} aria-label={`Augmenter ${field==='layout'?'interface':'police'} ${profile.label}`} onClick={()=>change(field,1)}>+</button></div>)}<span className="sr-only" role="status">{status}</span></div>
}
export function ThemeToggle(){const {preferences,pending,status,update}=useAppearance();return <div className="appearance-controls" aria-label="Affichage">

    <button type="button" className="header-control theme-control" disabled={pending} aria-label={preferences.theme==='light'?'Activer le mode sombre':'Activer le mode clair'} title={preferences.theme==='light'?'Mode sombre':'Mode clair'} onClick={()=>update({theme:preferences.theme==='light'?'dark':'light'})}>
      {preferences.theme==='light'?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20.6 14.2A8.8 8.8 0 0 1 9.8 3.4 8.8 8.8 0 1 0 20.6 14.2Z"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>}
    </button><span className="sr-only" role="status">{status}</span></div>}
