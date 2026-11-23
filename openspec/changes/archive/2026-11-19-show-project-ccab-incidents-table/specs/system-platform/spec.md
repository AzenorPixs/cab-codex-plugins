## ADDED Requirements

### Requirement: Registre PostgreSQL des incidents CCAB
Les déclarations d’incident CCAB MUST être stockées dans la table PostgreSQL ccab avec identifiant, catégorie, résumé, preuves, état, claim, résolution, date et relations projet/RUN. La migration de la table existante MUST préserver toutes les données. Les commandes CCAB et leur contrat de consultation historique MUST rester compatibles.

#### Scenario: Conservation du registre
- **WHEN** la migration vers ccab est appliquée
- **THEN** les déclarations existantes conservent leurs identifiants, preuves, claims et résolutions

### Requirement: Tableau des incidents du projet
La page Incidents d’un projet MUST présenter un tableau paginé et responsive contenant les informations principales de ses déclarations. La consultation MUST être limitée aux projets autorisés et inclure tous les états d’incident.

#### Scenario: Consultation d’un projet
- **WHEN** un utilisateur ouvre la page Incidents d’un projet autorisé
- **THEN** il voit ses déclarations avec identifiant, catégorie, résumé, état, date, responsable et nombre de preuves

### Requirement: Détail d’une déclaration CCAB
L’identifiant d’une déclaration MUST ouvrir une fenêtre en lecture seule contenant son résumé, ses preuves, son claim et sa résolution. La déclaration complète MUST être consultable sans modifier son état.

#### Scenario: Ouverture du détail
- **WHEN** un utilisateur sélectionne une déclaration dans le tableau
- **THEN** CAB affiche son détail complet sans prendre ni résoudre l’incident
