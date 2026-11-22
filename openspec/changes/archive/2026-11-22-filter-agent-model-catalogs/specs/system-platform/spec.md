## ADDED Requirements

### Requirement: Navigation dans les catalogues des agents

Les tableaux Clés API, Fournisseurs et Modèles SHALL proposer une recherche instantanée, un tri ascendant ou descendant sur chaque colonne de données et une navigation par page de dix lignes au plus.

#### Scenario: Rechercher et trier avant pagination

- **WHEN** l’administrateur recherche une entrée ou choisit un tri
- **THEN** CAB applique l’opération à l’ensemble des résultats de la vue et repart de la première page

#### Scenario: Supprimer un fournisseur

- **WHEN** l’administrateur confirme la suppression d’un fournisseur sans clé API liée
- **THEN** CAB retire le fournisseur et ses modèles
- **AND** en présence d’une clé liée, CAB refuse la suppression et laisse la clé disponible pour une suppression individuelle

### Requirement: Onglets de politiques de modèles

CAB SHALL offrir un premier onglet Tous et permettre de créer, éditer et supprimer des onglets nommés persistés dans PostgreSQL.

#### Scenario: Appliquer une politique

- **WHEN** une politique est ouverte
- **THEN** ses réglages Free et Payant s’appliquent indépendamment, Free couvrant le marqueur free ou deux tarifs de base connus et nuls
- **AND** les seuils de contexte et de sortie utilisent les crans convenus, avec 0, 500000, 1000000 et 1048576 ainsi que respectivement 262144 et 64000
- **AND** les minima et maxima de coût de base, le plafond de lecture et le plancher d’écriture du cache sont appliqués de manière inclusive
- **AND** zéro désactive une borne et une métrique inconnue est écartée pour une borne active

#### Scenario: Afficher des tarifs de cache

- **WHEN** la source ou l’enrichissement existant fournit un prix de cache
- **THEN** CAB affiche les coûts de lecture et d’écriture par million de tokens, avec la durée d’écriture la plus courte lorsqu’il existe plusieurs durées tarifées
- **AND** un tarif inconnu est affiché sans valeur numérique
