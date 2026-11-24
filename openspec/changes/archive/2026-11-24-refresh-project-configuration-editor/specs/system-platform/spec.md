## ADDED Requirements

### Requirement: Renommage automatique de PROJECT_TYPE

CAB MUST remplacer la clé littérale PROJECT_TYPE par PROJECT_LANGUAGES lors de
la consultation des métadonnées d’un fichier project.env. Il MUST protéger
les fichiers ambigus et les modifications concurrentes.

#### Scenario: Ancienne clé valide

- **WHEN** CAB consulte un project.env contenant seulement PROJECT_TYPE
- **THEN** CAB renomme la clé par une écriture atomique vérifiée, conserve sa valeur et projette PROJECT_LANGUAGES
- **AND** CAB conserve le reste du fichier

#### Scenario: Les deux clés existent

- **WHEN** une valeur valide identique est déclarée sous les deux noms
- **THEN** CAB conserve le nom canonique et retire la déclaration redondante
- **WHEN** leurs valeurs diffèrent ou que les déclarations sont ambiguës
- **THEN** CAB conserve le fichier et refuse la validation de son état pour l’édition

## MODIFIED Requirements

### Requirement: Métadonnées publiques du fichier projet
project.env à la racine canonique MUST être la source de vérité des métadonnées
publiques. CAB MUST mémoriser leur instantané dans projects. L’accueil MUST
afficher PROJECT_NAME en grand et gras et PROJECT_VERSION ; PROJECT_LANGUAGES et PROJECT_FRAMEWORKS sont présentés dans le bloc Configuration dans l’ordre de déclaration.

#### Scenario: Présentation
- **WHEN** un projet contient un nom, une version et plusieurs langages et frameworks
- **THEN** le nom et la version sont affichés en titre et les langages et frameworks dans Configuration

### Requirement: Cartes et suppression des métadonnées
Les cartes Forgejo, GitHub et GitLab MUST afficher les variables publiques
présentes de leur famille REMOTE respective. Un fichier absent, ambigu ou
inaccessible MUST être signalé sans contenu brut. Les variables retirées
MUST disparaître de l'instantané.

#### Scenario: Accès au dépôt distant
- **WHEN** l’URL, l’utilisateur et le dépôt d’une forge sont configurés
- **THEN** le nom de la forge ouvre le dépôt à l’adresse construite à partir de ces trois valeurs.

#### Scenario: Token dans la configuration de forge
- **WHEN** une carte Forgejo, GitHub ou GitLab est affichée
- **THEN** aucune ligne Token n’est affichée dans la carte et le token reste disponible dans la configuration de la forge.

#### Scenario: Bloc de configuration du projet
- **WHEN** la fiche d’un projet est affichée
- **THEN** le bloc « Configuration » de l’accueil affiche ID, nom, langages, frameworks, publication et version depuis PostgreSQL, puis Electric.
- **AND** les langages reconnus sont représentés dans l’ordre de `PROJECT_LANGUAGES` par des logos liés à leur site officiel ; les valeurs non reconnues restent lisibles.
- **AND** les logos Debian et Docker sont affichés lorsque leur variable vaut « Yes » et renvoient vers leurs sites officiels.

#### Scenario: Chemin d’un projet initialisé
- **WHEN** un administrateur modifie le chemin d’un projet initialisé
- **THEN** CAB le conserve uniquement dans PostgreSQL, sans écrire de variable de chemin dans `project.env`, après vérification que le nouveau dossier contient un `project.env` de contenu identique.
- **AND** la clé interne et les relations sont conservées ; le bloc est actualisé par Electric et le changement est refusé si une opération est active.

#### Scenario: Édition de la configuration du projet
- **WHEN** un administrateur ouvre le stylo du bloc « Configuration »
- **THEN** il peut modifier les variables publiques du bloc dans `project.env` après une vérification réussie de la source ; CAB vérifie la révision et l’unicité de l’identifiant avant d’enregistrer et synchronise PostgreSQL puis Electric.
- **AND** un changement d’identifiant actualise l’adresse canonique sans modifier la clé interne du projet.

#### Scenario: Premier enregistrement de la configuration
- **WHEN** un administrateur ouvre l’éditeur du bloc « Configuration » d’un projet dont le fichier `project.env` est absent
- **THEN** CAB MUST ouvrir l’éditeur sans créer le fichier et MUST créer le fichier lors de l’enregistrement explicite des valeurs validées, sous le compte propriétaire du projet.
- **AND** la révision MUST distinguer le fichier absent d’un fichier vide ou apparu depuis l’ouverture. CAB MUST refuser une création concurrente sans écraser son contenu et MUST synchroniser les métadonnées après un enregistrement réussi.

#### Scenario: Métadonnées et cartes
- **WHEN** le fichier contient une seule forge puis la retire
- **THEN** seule sa carte est affichée puis elle disparaît

### Requirement: Lecture littérale sans effet
CAB MUST NOT exécuter project.env. Seule une édition administrateur explicite des variables du projet ou de la forge sélectionnée MAY modifier ce fichier ; les autres lignes MUST être conservées. La migration automatique de PROJECT_TYPE lors d’une lecture de métadonnées fait exception pour cette seule clé. Les clés dupliquées, expressions, liens et fichiers non réguliers MUST être refusés.

#### Scenario: Syntaxe active
- **WHEN** le fichier contient une substitution shell
- **THEN** elle est refusée et aucun effet n'est exécuté

### Requirement: Liste publique fermée
CAB MUST limiter la projection aux variables publiques validées de l’éditeur
de projet, aux réglages Git publics, à REMOTE_GITLAB_REGISTRY et aux
REMOTE_(FORGEJO|GITHUB|GITLAB) de suffixes BASE_URL, OWNER, REPOSITORY, NAME,
BRANCH. Les URL avec identifiants, requête ou fragment et les valeurs
incertaines MUST être exclues, ainsi que les secrets en clair. Seul un
administrateur MAY consulter les tokens sans cache.

#### Scenario: Secrets
- **WHEN** le fichier contient un jeton ou une URL authentifiée
- **THEN** ces données ne sont ni mémorisées ni projetées

### Requirement: Présentation des réglages dans l’éditeur de projet

L’éditeur de projet MUST afficher les réglages dans une grille compacte à deux
colonnes de même largeur sur écran large, et une seule colonne sur écran étroit.
Chaque champ MUST être placé sous son nom cliquable. L’aide MUST s’ouvrir dans un dialogue dédié à la variable.

#### Scenario: Édition des politiques de rétention

- **WHEN** un administrateur ouvre l’éditeur d’un projet
- **THEN** les deux champs de rétention sont disponibles avec un défaut de `0`
- **AND** une politique invalide est refusée à l’enregistrement

#### Scenario: Ordre des variables

- **WHEN** un administrateur ouvre l’éditeur
- **THEN** CAB présente successivement PROJECT_ID et PROJECT_NAME, PROJECT_LANGUAGES et PROJECT_FRAMEWORKS, PROJECT_DOCKERED et PROJECT_DOCKER_RETENTION, PROJECT_DEBIAN_PACKAGE et PROJECT_DEBIAN_RETENTION, PROJECT_VERSION et PROJECT_VERSION_POLICY, puis PROJECT_PATH en pleine largeur

#### Scenario: Projection et validation avant écriture

- **WHEN** l’éditeur est ouvert ou reçoit une mise à jour Electric
- **THEN** CAB affiche les dernières valeurs éditables de PostgreSQL sans attendre le fichier et vérifie en arrière-plan leur état par rapport à project.env
- **AND** CAB n’autorise l’enregistrement qu’après vérification de cette source et protège la saisie si une mise à jour concurrente touche un champ modifié

