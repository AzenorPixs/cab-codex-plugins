import {useEffect,useRef,useState} from 'react'
import type {StyleField,StyleGroup} from './InterfaceStyle'

const descriptions:Record<StyleGroup,Record<string,string>>={
  blocs:{
    gap:'Distance entre les cartes voisines, en ligne comme en colonne.',
    width:'Largeur minimale d’une carte avant qu’elle passe à la ligne suivante.',
    columns:'Limite le nombre de cartes côte à côte, même si l’écran offre davantage de place.',
    stack_width:'À cette largeur d’écran ou en dessous, les cartes passent sur une seule colonne.',
  },
  columns:{
    sidebar_width:'Largeur réservée au menu latéral quand il est à côté du contenu.',
    gap:'Distance entre le menu latéral et le début de la zone de contenu.',
    content_inline:'Espace intérieur ajouté à gauche et à droite du contenu.',
    content_block:'Espace laissé après le dernier élément de la page.',
    stack_width:'À cette largeur d’écran ou en dessous, le menu latéral passe au-dessus du contenu.',
  },
  menus:{
    side_font:'Dimension des libellés dans le menu latéral.',
    side_normal_weight:'Épaisseur du texte des rubriques non sélectionnées. Une valeur élevée épaissit les lettres.',
    side_weight:'Épaisseur du texte de la rubrique active.',
    side_icon:'Largeur et hauteur des icônes du menu latéral.',
    side_height:'Hauteur minimale de chaque entrée, y compris sa zone cliquable.',
    side_padding:'Espace intérieur entre le bord d’une entrée et son contenu.',
    side_gap:'Distance verticale entre deux entrées du menu.',
    side_hover:'Couleur de fond affichée au passage du pointeur sur une entrée.',
    side_active:'Couleur de fond qui repère la rubrique sélectionnée.',
    side_active_text:'Couleur du libellé de la rubrique sélectionnée.',
    side_marker:'Épaisseur du repère sur l’entrée active. Zéro masque le trait.',
    tabs_font:'Dimension des libellés de la navigation par onglets.',
    tabs_normal_weight:'Épaisseur du texte des onglets non sélectionnés.',
    tabs_weight:'Épaisseur du texte de l’onglet sélectionné.',
    tabs_icon:'Largeur et hauteur des icônes dans les onglets qui en affichent.',
    tabs_height:'Hauteur minimale de la zone cliquable d’un onglet.',
    tabs_padding:'Espace intérieur entre le bord d’un onglet et son libellé.',
    tabs_gap:'Distance horizontale entre deux onglets voisins.',
    tabs_hover:'Couleur du libellé au passage du pointeur sur un onglet.',
    tabs_active:'Couleur du libellé et de son repère lorsque l’onglet est sélectionné.',
    tabs_marker:'Épaisseur du trait sous l’onglet actif. Zéro masque le trait.',
  },
  tables:{
    head_font:'Dimension des libellés de colonnes dans l’en-tête.',
    head_weight:'Épaisseur du texte des libellés de colonnes.',
    head_height:'Hauteur minimale de la rangée d’en-tête. Le contenu peut la rendre plus haute.',
    head_padding:'Espace ajouté au-dessus et au-dessous des libellés de colonnes.',
    body_font:'Dimension du texte des données dans les cellules.',
    icon_size:'Dimension des logos et des icônes dans les cellules. Les boutons carrés s’adaptent à la taille choisie.',
    body_weight:'Épaisseur du texte dans les cellules de données.',
    row_height:'Hauteur minimale d’une ligne de données. Les lignes s’agrandissent selon leur contenu.',
    cell_padding:'Espace ajouté au-dessus et au-dessous du contenu des cellules.',
    inline_padding:'Espace ajouté à gauche et à droite du contenu des cellules.',
    header:'Couleur de fond de la rangée qui contient les libellés de colonnes.',
    header_text:'Couleur des libellés de colonnes dans l’en-tête.',
    odd:'Couleur de fond des lignes impaires, en comptant à partir de la première ligne de données.',
    even:'Couleur de fond des lignes paires dans la présentation alternée.',
    hover:'Couleur de fond de la ligne au passage du pointeur.',
    separator_width:'Épaisseur des traits qui séparent les rangées. Zéro masque les traits.',
    separator:'Couleur des traits entre les lignes du tableau.',
    stack_width:'À cette largeur d’écran ou en dessous, les cellules sont empilées avec leurs libellés.',
    page_binaries:'Nombre maximal de binaires affichés avant de passer à la page suivante.',
    page_sessions:'Nombre maximal de sessions affichées par page.',
    page_archives:'Nombre maximal d’archives affichées par page.',
    page_incidents:'Nombre maximal d’incidents affichés par page.',
  },
  titles:{
    admin_gap:'Espace au-dessus du titre dans la partie Administration.',
    page_gap:'Espace au-dessus du titre sur les pages Projets et Agents.',
    below:'Distance verticale entre un titre de page et son contenu.',
    font:'Dimension du texte des titres de page.',
    weight:'Épaisseur des lettres des titres de page.',
    color:'Couleur du texte des titres de page.',
  },
  top_bar:{
    height:'Hauteur minimale du bandeau. Il peut grandir si sa navigation revient à la ligne.',
    inline_padding:'Espace intérieur le long des bords gauche et droit du bandeau.',
    block_padding:'Espace intérieur au-dessus et au-dessous du contenu du bandeau.',
    brand_gap:'Distance entre le nom de l’application et les premiers liens de navigation.',
    link_gap:'Distance entre deux liens de navigation voisins.',
    tool_gap:'Distance entre les commandes situées dans le bandeau.',
    font:'Dimension du texte des liens et commandes de navigation.',
    brand_font:'Dimension du nom de l’application dans le bandeau.',
    button:'Largeur et hauteur de la zone cliquable des boutons du bandeau.',
    icon:'Dimension des symboles à l’intérieur des boutons, indépendamment de leur zone cliquable.',
    background:'Couleur de fond du bandeau.',
    color:'Couleur du texte et des commandes dans le bandeau.',
    border_width:'Épaisseur de la séparation sous le bandeau. Zéro masque la bordure.',
    border_color:'Couleur de la séparation entre le bandeau et le contenu.',
    scroll:'Détermine si le bandeau reste visible pendant le défilement. Le mode automatique adapte son comportement à la largeur.',
  },
}

function styleDescription(group:StyleGroup,key:string){
  const match=key.match(/_(light|dark)$/)
  const base=match?key.slice(0,-match[0].length):key
  const description=descriptions[group][base]??'Ce réglage s’applique au profil de résolution sélectionné.'
  return match?description.replace(/\.$/,match[1]==='light'?' en thème clair.':' en thème sombre.'):description
}

type HelpProps={
  id:string
  label:string
  description:string
  range?:{min:number;max:number;unit:string}
  options?:{value:string;label:string}[]
}

export function InterfaceFieldHelp({id,label,description,range,options}:HelpProps){
  const [open,setOpen]=useState(false)
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{if(open)dialog.current?.showModal()},[open])
  const close=()=>{dialog.current?.close();setOpen(false)}
  return <>
    <button type="button" id={id} className="interface-field-help-trigger" aria-haspopup="dialog"
      onClick={()=>setOpen(true)}>{label}</button>
    {open&&<dialog ref={dialog} className="lifecycle-dialog interface-field-help" aria-label={label}
      onCancel={event=>{event.preventDefault();close()}}>
      <h2>{label}</h2>
      <p>{description}</p>
      {range&&<p className="interface-field-range">De {range.min} à {range.max}{range.unit?' '+range.unit:''}.</p>}
      {options&&<ul>{options.map(option=><li key={option.value}>{option.label}</li>)}</ul>}
      <div className="form-actions"><button type="button" onClick={close}>Fermer</button></div>
    </dialog>}
  </>
}

export function ComponentFieldHelp({id,group,field}:{id:string;group:StyleGroup;field:StyleField}){
  const label=field.label+(field.kind==='number'&&field.unit?' ('+field.unit+')':'')
  return <InterfaceFieldHelp id={id} label={label} description={styleDescription(group,field.key)}
    range={field.kind==='number'?field:undefined} options={field.kind==='choice'?field.options:undefined}/>
}
