## MODIFIED Requirements

### Requirement: Navigation dans les catalogues des agents

Les tableaux Clés API, Fournisseurs et Modèles SHALL proposer une recherche instantanée, un tri ascendant ou descendant sur chaque colonne de données dans les vues qui autorisent le tri manuel et une navigation par page de dix lignes au plus.

#### Scenario: Rechercher et trier avant pagination

- **WHEN** l’administrateur recherche une entrée ou choisit un tri
- **THEN** CAB applique l’opération à l’ensemble des résultats de la vue et repart de la première page

#### Scenario: Supprimer un fournisseur

- **WHEN** l’administrateur confirme la suppression d’un fournisseur sans clé API liée
- **THEN** CAB retire le fournisseur et ses modèles
- **AND** en présence d’une clé liée, CAB refuse la suppression et laisse la clé disponible pour une suppression individuelle

#### Scenario: Ouvrir le tableau des modèles

- **WHEN** l’administrateur ouvre l’onglet Tous
- **THEN** le tableau affiche les colonnes Modèles et Fournisseurs, avec davantage de largeur pour Fournisseurs
- **AND** le tri initial se fait par coût d’entrée croissant, avec les prix nuls en premier et les prix inconnus en dernier
- **AND** le tri manuel reste disponible dans Tous

### Requirement: Onglets de politiques de modèles

CAB SHALL offrir un premier onglet Tous et permettre de créer, éditer et supprimer des onglets nommés persistés dans PostgreSQL. Les actions Éditer et Supprimer SHALL apparaître après Dernier pour la politique sélectionnée.

#### Scenario: Appliquer une politique

- **WHEN** une politique est ouverte
- **THEN** ses réglages Free et Payant s’appliquent indépendamment, Free couvrant le marqueur free ou deux tarifs de base connus et nuls
- **AND** les seuils de contexte et de sortie utilisent les crans convenus, avec 0, 500000, 1000000 et 1048576 ainsi que respectivement 262144 et 64000
- **AND** les minima et maxima de coût de base et de lecture et d’écriture du cache sont appliqués de manière inclusive
- **AND** zéro désactive une borne et une métrique inconnue est écartée pour une borne active

#### Scenario: Exclure des modèles par nom

- **WHEN** une politique contient un Filtre de modèles composé de termes séparés par des points-virgules
- **THEN** CAB exclut de cette politique tout modèle dont le nom affiché contient au moins un terme non vide, sans distinction de casse ni d’accents
- **AND** l’onglet Tous conserve le catalogue global

#### Scenario: Afficher des tarifs de cache

- **WHEN** la source ou l’enrichissement existant fournit un prix de cache
- **THEN** CAB affiche les coûts de lecture et d’écriture par million de tokens, avec la durée d’écriture la plus courte lorsqu’il existe plusieurs durées tarifées
- **AND** un tarif inconnu est affiché sans valeur numérique

#### Scenario: Trier un onglet de politique

- **WHEN** l’administrateur enregistre les réglages du bloc Triage
- **THEN** la politique conserve le tri ascendant ou descendant selon le coût d’entrée, de sortie, de lecture du cache ou d’écriture du cache
- **AND** le coût d’entrée croissant constitue le réglage par défaut des politiques nouvelles et existantes
- **AND** le tableau de la politique utilise ce tri sans contrôle de tri manuel et numérote les résultats à partir de 1, en continu sur les pages

#### Scenario: Éditer une politique

- **WHEN** l’Overview est affiché sur un écran suffisamment large
- **THEN** le nom et le filtre, les seuils de contexte et de sortie, puis les blocs Modèles à inclure et Triage s’affichent en paires sur trois lignes
