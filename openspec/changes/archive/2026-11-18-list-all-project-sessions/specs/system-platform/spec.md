## ADDED Requirements

### Requirement: Tableau global des sessions de projets
CAB MUST proposer Sessions dans le menu de /projects et exposer la page
/projects/sessions. Cette page MUST reprendre le tableau des sessions par projet
avec une colonne Projets contenant son identifiant cliquable vers son accueil.

#### Scenario: Sessions de plusieurs projets
- **WHEN** le développeur ouvre /projects/sessions
- **THEN** les sessions non archivées des projets accessibles apparaissent dans le tableau
- **AND** la colonne Projets mène à l'accueil de chaque projet
- **AND** les liens RUN et actions restent rattachés au bon projet
- **AND** les pages de sessions par projet conservent leur présentation

### Requirement: Portée et actualisation des sessions globales
Le flux Electric global MUST être authentifié et calculer sa portée côté
serveur. Les acteurs non administrateurs MUST recevoir uniquement les projets
autorisés. Les sessions MUST être actualisées sans rechargement de la page.

#### Scenario: Acteur limité
- **WHEN** un acteur demande le flux global avec des paramètres de table ou de filtre arbitraires
- **THEN** CAB conserve la projection et le filtre de projets autorisés calculés côté serveur
- **AND** aucun projet autorisé implique un résultat vide
- **AND** une demande non authentifiée ne transmet aucune requête à Electric

#### Scenario: Changement d'étape
- **WHEN** une session visible change d'étape en base
- **THEN** la ligne correspondante est actualisée par Electric sans rechargement

### Requirement: Nouvelle réservation d'un snapshot libéré
CAB MUST pouvoir réserver un fichier déjà libéré par le même acteur et la même
session native si son index protégé, son empreinte et le contenu du fichier
correspondent toujours au reçu de libération. Les modifications nouvelles et
les réservations étrangères MUST rester protégées.

#### Scenario: Évolution hôte successive
- **WHEN** une nouvelle évolution réserve un fichier modifié mais déjà validé et libéré dans cette session
- **THEN** CAB autorise la reprise seulement après vérification de son snapshot conservé
- **AND** un contenu changé depuis sa libération est refusé
