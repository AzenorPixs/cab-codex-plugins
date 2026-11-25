## MODIFIED Requirements

### Requirement: Archivage des sessions validées
CAB MUST proposer un bouton d'archivage pour
les seules sessions CLOSED dont la clôture est prouvée. Une table dédiée MUST
conserver reçu et identité sans supprimer RUN, SID ni relations. Les sessions
archivées MUST quitter la liste courante et rester consultables dans l’onglet
Archivées de la page Sessions de leur projet.

#### Scenario: Session CLOSED validée archivée
- **WHEN** un utilisateur autorisé confirme l'archivage d'une session admissible
- **THEN** CAB conserve un reçu unique, préserve les liens et affiche la session dans l’onglet Archivées

#### Scenario: Session protégée non prouvée ou accès croisé
- **WHEN** une clôture n'est pas prouvée ou le projet n'est pas autorisé
- **THEN** CAB refuse l'archivage sans altérer les protections

### Requirement: Accueil et navigation du projet
Le clic sur un projet MUST ouvrir /projects/<ID>. Cette route MUST afficher
l'accueil. La maison avant Sessions MUST ouvrir cet accueil et porter un nom
accessible. Sessions MUST ouvrir /projects/<ID>/sessions. Incidents et
détails RUN MUST conserver leurs routes et protections.

#### Scenario: Sélection et navigation
- **WHEN** un utilisateur sélectionne un projet puis Sessions puis la maison
- **THEN** il voit successivement l'accueil, les sessions et le même accueil

### Requirement: Tableau global des sessions de projets
CAB MUST proposer Sessions dans le menu de /projects et exposer la page
/projects/sessions. Cette page MUST proposer les onglets Ouvertes puis Archivées
avec la présentation des onglets de la page Binaires. Ouvertes MUST être
l’onglet par défaut et reprendre le tableau des sessions par projet avec une
colonne Projets contenant son identifiant cliquable vers son accueil. Archivées
MUST afficher les archives des projets accessibles avec cette même colonne.

#### Scenario: Sessions de plusieurs projets
- **WHEN** le développeur ouvre /projects/sessions
- **THEN** les sessions non archivées des projets accessibles apparaissent dans le tableau
- **AND** la colonne Projets mène à l'accueil de chaque projet
- **AND** les liens RUN et actions restent rattachés au bon projet

#### Scenario: Affichage des sessions archivées
- **WHEN** le développeur sélectionne Archivées sur la page Sessions
- **THEN** les archives des projets accessibles apparaissent dans le tableau de la page Sessions
- **AND** le développeur peut revenir au tableau des sessions ouvertes en sélectionnant Ouvertes

### Requirement: Onglets des sessions d’un projet
La page /projects/{projectId}/sessions MUST proposer les onglets Ouvertes puis
Archivées avec la même présentation que la page globale des sessions. Les deux
onglets MUST réutiliser les tableaux du projet sélectionné.

#### Scenario: Sessions d’un projet sélectionné
- **WHEN** le développeur ouvre la page Sessions d’un projet
- **THEN** Ouvertes est sélectionné et affiche les sessions ouvertes du projet
- **AND** Archivées affiche les sessions archivées de ce même projet

#### Scenario: Retour depuis un RUN remplacé
- **WHEN** le développeur clique sur le lien de retour aux archives dans le détail d’un RUN remplacé
- **THEN** CAB ouvre l’onglet Archivées de la page Sessions du projet correspondant

### Requirement: Archives globales des projets
CAB MUST retirer les entrées Archives des menus Projets et Projet. Les URL
/projects/archives et /projects/{projectId}/archives MUST cesser d’afficher une
page Archives dédiée.

#### Scenario: Archives de plusieurs projets
- **WHEN** le développeur sélectionne Archivées dans les Sessions globales
- **THEN** les archives de ses projets accessibles sont affichées
- **AND** la colonne Projets mène à l’accueil correspondant
- **AND** les liens RUN et les actions restent rattachés au bon projet

#### Scenario: Adresses et menus des anciennes pages
- **WHEN** le développeur consulte les menus Projets et Projet ou ouvre l’une des anciennes adresses
- **THEN** aucun menu ne mène à une page Archives dédiée
- **AND** aucune ancienne adresse ne présente de page Archives dédiée
