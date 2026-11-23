## MODIFIED Requirements

### Requirement: Catalogue et création de projets
Le catalogue MUST conserver les projets dans PostgreSQL et préserver leurs identités et relations. `/projects` MUST fournir une liste et un bouton d’ajout. L’administrateur MAY créer un projet ou ajouter un dossier existant, sans écrasement ni rejeu d’une création incertaine.

#### Scenario: Création d’un projet
- **WHEN** un administrateur valide le nom et le dossier d’un nouveau projet
- **THEN** le projet est conservé dans projects, son dossier utilise les UID/GID configurés et il apparaît sélectionné dans la liste de gauche. Avant de déclarer le projet prêt, CAB MUST créer `project.env` sous le compte propriétaire, avec le nom public, l’identifiant public lorsqu’il est disponible et la politique de version initiale. Le nom MUST respecter les règles du champ `PROJECT_NAME`. Aucun fichier existant ne peut être écrasé.

#### Scenario: Chemin choisi et projet existant
- **WHEN** un administrateur crée ou ajoute un projet et saisit ou sélectionne un chemin absolu
- **THEN** CAB conserve ce chemin dans PostgreSQL ; le chemin par défaut est la racine configurée suivie de l’identifiant si aucun chemin n’est fourni.

#### Scenario: Page individuelle
- **WHEN** un projet de la liste est sélectionné
- **THEN** /projects/<ID> affiche uniquement le projet demandé et son lien reste sélectionné après rechargement

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
- **THEN** le bloc « Configuration » de l’accueil affiche ID, nom, langages, publication et version depuis PostgreSQL, puis Electric.
- **AND** les langages reconnus sont représentés dans l’ordre de `PROJECT_TYPE` par des logos liés à leur site officiel ; les valeurs non reconnues restent lisibles.
- **AND** les logos Debian et Docker sont affichés lorsque leur variable vaut « Yes » et renvoient vers leurs sites officiels.

#### Scenario: Chemin d’un projet initialisé
- **WHEN** un administrateur modifie le chemin d’un projet initialisé
- **THEN** CAB le conserve uniquement dans PostgreSQL, sans écrire de variable de chemin dans `project.env`, après vérification que le nouveau dossier contient un `project.env` de contenu identique.
- **AND** la clé interne et les relations sont conservées ; le bloc est actualisé par Electric et le changement est refusé si une opération est active.

#### Scenario: Édition de la configuration du projet
- **WHEN** un administrateur ouvre le stylo du bloc « Configuration »
- **THEN** il peut modifier les six variables publiques du bloc dans `project.env` ; CAB vérifie la révision et l’unicité de l’identifiant avant d’enregistrer et synchronise PostgreSQL puis Electric.
- **AND** un changement d’identifiant actualise l’adresse canonique sans modifier la clé interne du projet.

#### Scenario: Premier enregistrement de la configuration
- **WHEN** un administrateur ouvre l’éditeur du bloc « Configuration » d’un projet dont le fichier `project.env` est absent
- **THEN** CAB MUST ouvrir l’éditeur sans créer le fichier et MUST créer le fichier lors de l’enregistrement explicite des valeurs validées, sous le compte propriétaire du projet.
- **AND** la révision MUST distinguer le fichier absent d’un fichier vide ou apparu depuis l’ouverture. CAB MUST refuser une création concurrente sans écraser son contenu et MUST synchroniser les métadonnées après un enregistrement réussi.

#### Scenario: Métadonnées et cartes
- **WHEN** le fichier contient une seule forge puis la retire
- **THEN** seule sa carte est affichée puis elle disparaît
