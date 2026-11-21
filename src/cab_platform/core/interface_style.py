"""Catalogue et validation des préférences de présentation par composant."""
import re


def number(key, label, default, minimum, maximum, unit='px'):
    return dict(key=key, label=label, kind='number', default=default, min=minimum, max=maximum, unit=unit)


def color(key, label, default):
    return dict(key=key, label=label, kind='color', default=default)


def choice(key, label, default, options):
    return dict(key=key, label=label, kind='choice', default=default,
                options=[dict(value=value, label=text) for value, text in options])


FIELDS = {
    'blocs': [
        number('gap', 'Espacement entre les blocs', 24, 0, 64),
        number('width', 'Largeur minimale des blocs', 400, 180, 800),
        number('columns', 'Nombre maximal de blocs par ligne', 4, 1, 6, ''),
        number('stack_width', 'Empiler les blocs sous cette largeur d’écran', 600, 320, 1600),
    ],
    'columns': [
        number('sidebar_width', 'Largeur de la colonne latérale', 260, 160, 420),
        number('gap', 'Espacement entre la colonne et le contenu', 0, 0, 64),
        number('content_inline', 'Marges latérales du contenu', 40, 0, 96),
        number('content_block', 'Marge inférieure du contenu', 34, 0, 96),
        number('stack_width', 'Empiler le menu et le contenu sous cette largeur', 600, 320, 1400),
    ],
    'menus': [
        number('side_font', 'Menu latéral · taille du texte', 17, 10, 32),
        number('side_normal_weight', 'Menu latéral · graisse du texte', 400, 300, 900, ''),
        number('side_weight', 'Menu latéral · graisse de l’élément actif', 700, 400, 900, ''),
        number('side_icon', 'Menu latéral · taille des icônes', 22, 12, 36),
        number('side_height', 'Menu latéral · hauteur minimale des entrées', 44, 24, 100),
        number('side_padding', 'Menu latéral · marge des entrées', 12, 0, 32),
        number('side_gap', 'Menu latéral · espacement entre entrées', 6, 0, 32),
        color('side_hover', 'Menu latéral · fond au survol', '#dcefe8'),
        color('side_active', 'Menu latéral · fond de la sélection', '#dcefe8'),
        color('side_active_text', 'Menu latéral · texte de la sélection', '#377f71'),
        number('side_marker', 'Menu latéral · épaisseur du trait de sélection', 0, 0, 8),
        number('tabs_font', 'Onglets horizontaux · taille du texte', 17, 10, 32),
        number('tabs_normal_weight', 'Onglets horizontaux · graisse du texte', 400, 300, 900, ''),
        number('tabs_weight', 'Onglets horizontaux · graisse de l’onglet actif', 700, 400, 900, ''),
        number('tabs_icon', 'Onglets horizontaux · taille des icônes', 22, 12, 36),
        number('tabs_height', 'Onglets horizontaux · hauteur minimale', 44, 24, 100),
        number('tabs_padding', 'Onglets horizontaux · marge des entrées', 12, 0, 32),
        number('tabs_gap', 'Onglets horizontaux · espacement entre entrées', 24, 0, 48),
        color('tabs_hover', 'Onglets horizontaux · couleur au survol', '#377f71'),
        color('tabs_active', 'Onglets horizontaux · couleur de la sélection', '#377f71'),
        number('tabs_marker', 'Onglets horizontaux · épaisseur du trait de sélection', 2, 0, 8),
    ],
    'tables': [
        number('head_font', 'En-tête · taille du texte', 20, 10, 32),
        number('head_weight', 'En-tête · graisse', 700, 400, 900, ''),
        number('head_height', 'En-tête · hauteur minimale', 52, 20, 120),
        number('head_padding', 'En-tête · marge verticale', 15, 0, 40),
        number('body_font', 'Cellules · taille du texte', 20, 10, 32),
        number('body_weight', 'Cellules · graisse', 400, 300, 900, ''),
        number('row_height', 'Lignes · hauteur minimale', 48, 20, 120),
        number('cell_padding', 'Cellules · marge verticale', 14, 0, 40),
        number('inline_padding', 'Cellules · marge latérale', 20, 0, 48),
        color('header_light', 'Clair · fond de l’en-tête', '#215e54'),
        color('header_dark', 'Sombre · fond de l’en-tête', '#215e54'),
        color('header_text_light', 'Clair · texte de l’en-tête', '#ffffff'),
        color('header_text_dark', 'Sombre · texte de l’en-tête', '#ffffff'),
        color('odd_light', 'Clair · fond des lignes impaires', '#ffffff'),
        color('odd_dark', 'Sombre · fond des lignes impaires', '#1b2d35'),
        color('even_light', 'Clair · fond des lignes paires', '#eaf0ed'),
        color('even_dark', 'Sombre · fond des lignes paires', '#243b44'),
        color('hover_light', 'Clair · fond de survol des lignes', '#eaf0ed'),
        color('hover_dark', 'Sombre · fond de survol des lignes', '#243b44'),
        number('separator_width', 'Épaisseur des séparateurs', 1, 0, 6),
        color('separator_light', 'Clair · couleur des séparateurs', '#dae3e0'),
        color('separator_dark', 'Sombre · couleur des séparateurs', '#375158'),
        number('stack_width', 'Empiler les cellules sous cette largeur', 1300, 390, 1800),
        number('page_binaries', 'Binaires · lignes par page', 10, 5, 100, ''),
        number('page_sessions', 'Sessions · lignes par page', 10, 5, 100, ''),
        number('page_archives', 'Archives · lignes par page', 10, 5, 100, ''),
        number('page_incidents', 'Incidents · lignes par page', 25, 5, 100, ''),
    ],
    'titles': [
        number('admin_gap', 'Administration · espace au-dessus du titre', 12, 0, 64),
        number('page_gap', 'Pages des projets et agents · espace au-dessus du titre', 20, 0, 64),
        number('below', 'Espace sous les titres de page', 12, 0, 64),
        number('font', 'Taille des titres de page', 36, 20, 68),
        number('weight', 'Graisse des titres de page', 800, 400, 900, ''),
        color('color_light', 'Clair · couleur des titres', '#183039'),
        color('color_dark', 'Sombre · couleur des titres', '#e1ece9'),
    ],
    'top_bar': [
        number('height', 'Hauteur minimale', 76, 40, 150),
        number('inline_padding', 'Marge latérale', 28, 0, 64),
        number('block_padding', 'Marge verticale', 14, 0, 32),
        number('brand_gap', 'Espacement entre marque et navigation', 28, 0, 64),
        number('link_gap', 'Espacement entre liens', 26, 0, 48),
        number('tool_gap', 'Espacement entre les outils', 22, 0, 48),
        number('font', 'Taille du texte de navigation', 17, 10, 32),
        number('brand_font', 'Taille du texte de la marque', 28, 14, 44),
        number('button', 'Taille des boutons', 40, 28, 72),
        number('icon', 'Taille des icônes', 22, 12, 40),
        color('background_light', 'Clair · fond', '#152c36'),
        color('background_dark', 'Sombre · fond', '#0a161c'),
        color('color_light', 'Clair · texte', '#ffffff'),
        color('color_dark', 'Sombre · texte', '#ffffff'),
        number('border_width', 'Épaisseur de la bordure inférieure', 0, 0, 8),
        color('border_color', 'Couleur de la bordure inférieure', '#68818b'),
        choice('scroll', 'Position au défilement', 'auto', [
            ('auto', 'Automatique selon la largeur'), ('sticky', 'En haut de l’écran'), ('relative', 'Avec la page'),
        ]),
    ],
}

_INDEX = {group: {field['key']: field for field in fields} for group, fields in FIELDS.items()}
_PROFILE_FIELDS = {
    'general': {'font_scale': number('font_scale', 'Taille du texte', 100, 80, 160, '%')},
    'resolutions': {key: number(key, key, 100, 50, 150, '%') for key in ('layout', 'font')},
}


def valid_value(field, value):
    if field['kind'] == 'number':
        return type(value) is int and field['min'] <= value <= field['max']
    if field['kind'] == 'color':
        return isinstance(value, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', value) is not None
    return any(option['value'] == value for option in field['options'])


def patch_group(previous, group, values, reset):
    """Retourne un nouveau document sans modifier les autres groupes."""
    fields = _INDEX[group]
    if (reset and values) or any(key not in fields or not valid_value(fields[key], value) for key, value in values.items()):
        raise ValueError('interface-style-invalid')
    result = dict(previous or {})
    if reset:
        result.pop(group, None)
    elif values:
        result[group] = {**result.get(group, {}), **values}
    return result


def patch_profile(preferences, profile, group, values, reset):
    """Amande une résolution sans écraser les autres groupes ou profils."""
    fields = _PROFILE_FIELDS.get(group)
    if fields is not None and ((reset and values) or any(
        key not in fields or not valid_value(fields[key], value) for key, value in values.items()
    )):
        raise ValueError('interface-style-invalid')
    result = dict(preferences)
    if group == 'resolutions':
        responsive = dict(preferences.get('responsive') or {})
        if reset:
            responsive.pop(profile, None)
        elif values:
            responsive[profile] = {'layout':100,'font':100,**responsive.get(profile, {}),**values}
        result['responsive'] = responsive
        return result
    profiles = dict(preferences.get('profile_styles') or {})
    profile_values = dict(profiles.get(profile, {}))
    if group == 'general':
        if reset:
            profile_values.pop(group, None)
        elif values:
            profile_values[group] = {**profile_values.get(group, {}), **values}
    else:
        profile_values = patch_group(profile_values, group, values, reset)
    if profile_values:
        profiles[profile] = profile_values
    else:
        profiles.pop(profile, None)
    result['profile_styles'] = profiles
    return result
