## ADDED Requirements

### Requirement: Accueil et navigation du projet
Le clic sur un projet MUST ouvrir /projects/<ID>. Cette route MUST afficher
l'accueil. La maison avant Sessions MUST ouvrir cet accueil et porter un nom
accessible. Sessions MUST ouvrir /projects/<ID>/sessions. Incidents, archives
et détails RUN MUST conserver leurs routes et protections.

#### Scenario: Sélection et navigation
- **WHEN** un utilisateur sélectionne un projet puis Sessions puis la maison
- **THEN** il voit successivement l'accueil, les sessions et le même accueil

### Requirement: Métadonnées publiques du fichier projet
project.env à la racine canonique MUST être la source de vérité des métadonnées
publiques. CAB MUST mémoriser leur instantané dans projects. L'accueil MUST
afficher PROJECT_NAME en grand et gras, PROJECT_VERSION puis PROJECT_TYPE
découpé par virgules en étiquettes à droite de la version.

#### Scenario: Présentation
- **WHEN** un projet contient un nom, une version et plusieurs types
- **THEN** ces valeurs sont affichées avec une étiquette par type

### Requirement: Cartes et suppression des métadonnées
Les cartes Forgejo, GitHub et GitLab MUST afficher les variables publiques
présentes de leur famille REMOTE respective. Un fichier absent, ambigu ou
inaccessible MUST être signalé sans contenu brut. Les variables retirées
MUST disparaître de l'instantané.

#### Scenario: Métadonnées et cartes
- **WHEN** le fichier contient une seule forge puis la retire
- **THEN** seule sa carte est affichée puis elle disparaît

### Requirement: Lecture littérale sans effet
CAB MUST NOT exécuter ou modifier project.env. Les clés dupliquées, expressions,
liens et fichiers non réguliers MUST être refusés.

#### Scenario: Syntaxe active
- **WHEN** le fichier contient une substitution shell
- **THEN** elle est refusée et aucun effet n'est exécuté

### Requirement: Liste publique fermée
Seules PROJECT_NAME, PROJECT_VERSION, PROJECT_TYPE et les variables
REMOTE_FORGEJO_, REMOTE_GITHUB_, REMOTE_GITLAB_ de suffixes BASE_URL, OWNER,
REPOSITORY, NAME, BRANCH, SSL_VERIFY MAY être retenues après validation.
Une URL avec identifiants, requête ou fragment et toute valeur incertaine MUST
être exclues avant persistance. Les jetons, mots de passe et clés MUST NOT
entrer dans projects, les réponses ni Electric.

#### Scenario: Secrets
- **WHEN** le fichier contient un jeton ou une URL authentifiée
- **THEN** ces données ne sont ni mémorisées ni projetées

### Requirement: Actualisation du projet sélectionné
La sélection MUST afficher immédiatement l'instantané de base puis provoquer
une relecture autorisée. Tant que l'accueil est affiché, une modification,
suppression ou substitution atomique externe du fichier MUST actualiser
l'instantané et l'affichage via Electric sans rechargement de page. Les
abonnements MUST être libérés à la sortie. Les shapes MUST être limitées
au projet autorisé et à ses colonnes publiques, sans configuration privée.

#### Scenario: Modification externe et reconnexion
- **WHEN** project.env change pendant l'affichage, puis Electric se reconnecte
- **THEN** les dernières valeurs autorisées sont visibles sans double effet

#### Scenario: Isolation
- **WHEN** un utilisateur demande la shape ou le rafraîchissement d'un projet étranger
- **THEN** l'accès est refusé sans aucune donnée du projet
