import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {api} from './api'

type Preference={font_scale:number;theme:'light'|'dark'}
type SavedPreference=Preference&{persistent:boolean}
type AppearanceValue={preferences:Preference;pending:boolean;status:string;update:(patch:Partial<Preference>)=>void}
const AppearanceContext=createContext<AppearanceValue|null>(null)
function useAppearance(){const value=useContext(AppearanceContext);if(!value)throw new Error('Affichage indisponible');return value}
export function AppearanceProvider({children}:{children:ReactNode}){
  const client=useQueryClient();const loaded=useRef(false)
  const [preferences,setPreferences]=useState<Preference>({font_scale:100,theme:'light'});const [notice,setNotice]=useState('')
  const latest=useRef(preferences)
  const query=useQuery({queryKey:['interface-preferences'],queryFn:()=>api<SavedPreference>('interface/preferences')})
  useEffect(()=>{if(query.data&&!loaded.current){latest.current={font_scale:query.data.font_scale,theme:query.data.theme};setPreferences(latest.current);loaded.current=true}},[query.data])
  useEffect(()=>{document.documentElement.style.setProperty('--font-scale',String(preferences.font_scale/100));document.documentElement.dataset.theme=preferences.theme},[preferences])
  const save=useMutation({mutationFn:(value:Preference)=>api<SavedPreference>('interface/preferences',value),scope:{id:'interface-preferences'},onSuccess:(value)=>{client.setQueryData(['interface-preferences'],value);setNotice('Préférences enregistrées.')},onError:()=>setNotice('Affichage appliqué ; enregistrement indisponible.')})
  function update(patch:Partial<Preference>){
    const value={...latest.current,...patch};latest.current=value;setPreferences(value)
    if(query.data?.persistent)save.mutate(value)
    else setNotice('Préférences temporaires jusqu’à l’initialisation de CAB.')
  }
  const status=save.isPending?'Enregistrement des préférences…':notice
  return <AppearanceContext.Provider value={{preferences,pending:query.isPending,status,update}}>{children}</AppearanceContext.Provider>
}
export function FontControls(){const {preferences,pending,status,update}=useAppearance();return <div className="interface-font-controls" aria-label="Taille des polices">
    <div className="font-controls"><button type="button" className="header-control" aria-label="Réduire la taille du texte" title="Réduire les polices" disabled={pending||preferences.font_scale<=80} onClick={()=>update({font_scale:Math.max(80,preferences.font_scale-10)})}>−</button><output aria-label="Taille du texte">{preferences.font_scale}%</output><button type="button" className="header-control" aria-label="Augmenter la taille du texte" title="Agrandir les polices" disabled={pending||preferences.font_scale>=160} onClick={()=>update({font_scale:Math.min(160,preferences.font_scale+10)})}>+</button></div><p role="status">{status}</p></div>}
export function ThemeToggle(){const {preferences,pending,status,update}=useAppearance();return <div className="appearance-controls" aria-label="Affichage">

    <button type="button" className="header-control theme-control" disabled={pending} aria-label={preferences.theme==='light'?'Activer le mode sombre':'Activer le mode clair'} title={preferences.theme==='light'?'Mode sombre':'Mode clair'} onClick={()=>update({theme:preferences.theme==='light'?'dark':'light'})}>
      {preferences.theme==='light'?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20.6 14.2A8.8 8.8 0 0 1 9.8 3.4 8.8 8.8 0 1 0 20.6 14.2Z"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>}
    </button><span className="sr-only" role="status">{status}</span></div>}
