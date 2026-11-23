## ADDED Requirements

### Requirement: Présentation par onglets de l’interface

La page Interface MUST afficher Blocs, Colonnes, Général, Menus, Résolutions,
Tableaux, Titres et Top barre dans cet ordre. Général MUST rester ouvert au
chargement. La navigation MUST fonctionner au clavier et sur mobile.

#### Scenario: Accès aux réglages historiques
- **WHEN** un administrateur ouvre Interface
- **THEN** Général contient la taille globale des polices et Résolutions l’adaptation par résolution.

### Requirement: Réglages de disposition et de navigation

Blocs MUST régler largeur minimale, espacement, nombre maximal par ligne et
empilement. Colonnes MUST régler largeur et espacement latéraux, marges et
empilement. Titres MUST régler taille, graisse, couleur et espacements.
Top barre et Menus MUST régler dimensions, typographie, espacements, couleurs
et indicateurs visuels. Le bandeau MUST proposer un mode de défilement
et les menus MUST distinguer navigation latérale et onglets horizontaux.

#### Scenario: Application d’un réglage de disposition
- **WHEN** l’administrateur règle la largeur latérale ou l’espace d’un titre
- **THEN** les composants concernés appliquent la valeur avec l’échelle responsive de la page.

### Requirement: Présentation des tableaux administratifs et projets

Tableaux MUST régler la typographie, les hauteurs minimales, les marges, le
seuil d’empilement, les séparateurs, les couleurs par thème et la pagination
de Binaires, Sessions, Archives et Incidents. Les limites historiques de
pagination constituent les valeurs par défaut modifiables dans cet onglet.

#### Scenario: Retour à la présentation de référence
- **WHEN** aucune personnalisation des tableaux n’est enregistrée
- **THEN** la présentation reprend Binaires, avec 10 lignes par page pour Binaires, Sessions et Archives, et 25 pour Incidents.

### Requirement: Persistance synchronisée des styles de composants

Les réglages MUST être validés côté serveur, écrits dans PostgreSQL par un
administrateur et publiés via Electric. Chaque onglet MUST pouvoir enregistrer
ses champs modifiés et rétablir ses défauts indépendamment. Le rendu MUST
conserver les facteurs responsives globaux et les références par page.

#### Scenario: Enregistrement synchronisé
- **WHEN** un administrateur enregistre un réglage valide
- **THEN** CAB l’enregistre en PostgreSQL et actualise les fenêtres ouvertes via Electric.

#### Scenario: Réinitialisation isolée
- **WHEN** un administrateur réinitialise un onglet
- **THEN** CAB rétablit ses valeurs de référence et conserve les autres groupes.

## MODIFIED Requirements

### Requirement: Pagination à dix lignes
Les listes Sessions et Archives, globales et par projet, MUST afficher au plus
dix lignes par défaut, ou la limite réglée dans Interface. Elles MUST proposer
Premier, Précédent, Page X / Y, Suivant et Dernier. Les archives MUST être
paginées côté serveur après filtrage des autorisations.

#### Scenario: Parcours complet
- **WHEN** le nombre d’éléments dépasse la taille de page choisie
- **THEN** les pages permettent de parcourir tous les éléments autorisés sans omission
- **AND** les commandes indisponibles sont désactivées et une page devenue inexistante est ramenée à la dernière.
