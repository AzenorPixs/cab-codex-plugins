export type StyleGroup='blocs'|'columns'|'menus'|'tables'|'titles'|'top_bar'
export type StyleValue=number|string
export type ComponentStyle=Partial<Record<StyleGroup,Record<string,StyleValue>>>
export type StyleField=
  | {key:string;label:string;kind:'number';default:number;min:number;max:number;unit:string}
  | {key:string;label:string;kind:'color';default:string}
  | {key:string;label:string;kind:'choice';default:string;options:{value:string;label:string}[]}
export type StyleFields=Partial<Record<StyleGroup,StyleField[]>>
export type StyleAdjustment={group:StyleGroup;values?:Record<string,StyleValue>;reset?:boolean}

const groups:StyleGroup[]=['blocs','columns','menus','tables','titles','top_bar']
const pageSizes={binaries:10,sessions:10,archives:10,incidents:25}
export type TableName=keyof typeof pageSizes

export function tablePageSize(style:ComponentStyle,table:TableName){
  const size=style.tables?.[`page_${table}`]
  return typeof size==='number'&&Number.isInteger(size)&&size>=5&&size<=100?size:pageSizes[table]
}

export function applyComponentStyle(root:HTMLElement,style:ComponentStyle){
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
  function resize(){
    const columns=style.columns?.stack_width
    const blocs=style.blocs?.stack_width
    const tables=style.tables?.stack_width
    root.toggleAttribute('data-compact-columns',window.innerWidth<=(typeof columns==='number'?columns:600))
    root.toggleAttribute('data-compact-blocs',typeof blocs==='number'&&window.innerWidth<=blocs)
    root.toggleAttribute('data-compact-tables',window.innerWidth<=(typeof tables==='number'?tables:1300))
  }
  resize()
  window.addEventListener('resize',resize)
  return ()=>{
    window.removeEventListener('resize',resize)
    for(const prop of properties)root.style.removeProperty(prop)
  }
}
