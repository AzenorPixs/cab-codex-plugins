export type StyleGroup='blocs'|'columns'|'menus'|'tables'|'titles'|'top_bar'
export type SettingsGroup=StyleGroup|'general'|'resolutions'
export type ProfileName='mobile'|'tablet'|'hd'|'fullhd'|'qhd'|'uhd'
export type StyleValue=number|string
export type ComponentStyle=Partial<Record<StyleGroup,Record<string,StyleValue>>>
export type StyleField=(
  | {key:string;label:string;kind:'number';default:number;min:number;max:number;unit:string}
  | {key:string;label:string;kind:'color';default:string}
  | {key:string;label:string;kind:'choice';default:string;options:{value:string;label:string}[]}
)&{references?:Record<ProfileName,StyleValue|null>;reference_hint?:string}
export type StyleFields=Partial<Record<StyleGroup,StyleField[]>>
export type ProfileStyles=Partial<Record<ProfileName,ComponentStyle&{general?:{font_scale:number}}>>
export type StyleAdjustment={group:SettingsGroup;profile:ProfileName;values?:Record<string,StyleValue>;reset?:boolean}

export const profiles:{id:ProfileName;label:string;width:number}[]=[
  {id:'mobile',label:'Mobile',width:390},{id:'tablet',label:'Tablette',width:768},
  {id:'hd',label:'HD',width:1366},{id:'fullhd',label:'Full HD',width:1920},
  {id:'qhd',label:'QHD',width:2560},{id:'uhd',label:'4K',width:3840},
]

const groups:StyleGroup[]=['blocs','columns','menus','tables','titles','top_bar']
const pageSizes={binaries:10,sessions:10,archives:10,incidents:25}
export type TableName=keyof typeof pageSizes

export function nearestProfile(width:number){
  return profiles.reduce((best,item)=>Math.abs(item.width-width)<Math.abs(best.width-width)?item:best)
}

export function profileInterval(width:number){
  const rightIndex=profiles.findIndex(item=>item.width>=width)
  if(rightIndex===-1){const last=profiles[profiles.length-1];return {left:last,right:last,ratio:0}}
  const right=profiles[rightIndex]
  if(rightIndex===0)return {left:right,right,ratio:0}
  const left=profiles[rightIndex-1]
  return {left,right,ratio:(width-left.width)/(right.width-left.width)}
}

export function styleAtWidth(base:ComponentStyle,overrides:ProfileStyles,width:number):ComponentStyle{
  if(!Object.keys(overrides).length)return base
  const {left,right,ratio}=profileInterval(width)
  const nearest=ratio<=.5?left:right
  const style:ComponentStyle={}
  for(const group of groups){
    const current={...base[group],...overrides[nearest.id]?.[group]}
    const start={...base[group],...overrides[left.id]?.[group]}
    const end={...base[group],...overrides[right.id]?.[group]}
    for(const key of Object.keys(current)){
      const [a,b]=[start[key],end[key]]
      if(typeof a==='number'&&typeof b==='number'&&key!=='columns'&&key!=='stack_width'
          &&!key.startsWith('page_')&&!key.endsWith('weight'))current[key]=a+(b-a)*ratio
    }
    style[group]=current
  }
  return style
}

export function tablePageSize(style:ComponentStyle,table:TableName){
  const size=style.tables?.[`page_${table}`]
  return typeof size==='number'&&Number.isInteger(size)&&size>=5&&size<=100?size:pageSizes[table]
}

export function applyComponentStyle(root:HTMLElement,style:ComponentStyle,width:number){
  const properties:string[]=[]
  root.toggleAttribute('data-custom-blocs-grid',style.blocs?.width!==undefined||style.blocs?.columns!==undefined)
  root.toggleAttribute('data-custom-title-font',style.titles?.font!==undefined)
  root.toggleAttribute('data-custom-title-weight',style.titles?.weight!==undefined)
  root.toggleAttribute('data-custom-title-below',style.titles?.below!==undefined)
  root.toggleAttribute('data-custom-title-color',style.titles?.color_light!==undefined||style.titles?.color_dark!==undefined)
  root.toggleAttribute('data-custom-page-title-gap',style.titles?.page_gap!==undefined)
  root.toggleAttribute('data-custom-tabs-padding',style.menus?.tabs_padding!==undefined)
  root.toggleAttribute('data-custom-tabs-font',style.menus?.tabs_font!==undefined)
  root.toggleAttribute('data-custom-tabs-icon',style.menus?.tabs_icon!==undefined)
  root.toggleAttribute('data-custom-header-font',style.top_bar?.font!==undefined)
  root.toggleAttribute('data-custom-tabs-hover',style.menus?.tabs_hover!==undefined)
  for(const group of groups){
    for(const [key,value] of Object.entries(style[group]||{})){
      if(!/^[a-z_]+$/.test(key)||key==='stack_width'||key.startsWith('page_'))continue
      const unit=key==='columns'||key.endsWith('weight')?'':'px'
      const css=typeof value==='number'&&Number.isFinite(value)?`${value}${unit}`:
        typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value:
        group==='top_bar'&&key==='scroll'&&(value==='sticky'||value==='relative')?value:null
      if(css===null)continue
      const prop=`--ui-${group.replaceAll('_','-')}-${key.replaceAll('_','-')}`
      properties.push(prop)
      root.style.setProperty(prop,css)
    }
  }
  const columns=style.columns?.stack_width
  const blocs=style.blocs?.stack_width
  const tables=style.tables?.stack_width
  root.toggleAttribute('data-compact-columns',width<=(typeof columns==='number'?columns:600))
  root.toggleAttribute('data-compact-blocs',typeof blocs==='number'&&width<=blocs)
  root.toggleAttribute('data-compact-tables',width<=(typeof tables==='number'?tables:1300))
  return ()=>{
    for(const prop of properties)root.style.removeProperty(prop)
  }
}
