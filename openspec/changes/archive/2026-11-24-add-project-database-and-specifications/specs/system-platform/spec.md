## ADDED Requirements

### Requirement: Métadonnées de base de données et de spécification

CAB MUST écouter, valider et projeter PROJECT_DB et PROJECT_SPECIFICATIONS
via les métadonnées du projet existantes. Les révisions et la validation de
la source avant enregistrement MUST s’appliquer aux deux variables.

#### Scenario: Valeurs par défaut

- **WHEN** les clés sont absentes ou vides
- **THEN** PROJECT_DB est vide et PROJECT_SPECIFICATIONS vaut OpenSpec
- **AND** CAB affiche OpenSpec et projette la valeur sans écrire la clé à la lecture

#### Scenario: Déclaration d’une base et de ses composants

- **WHEN** PROJECT_DB contient une liste séparée par virgules et PROJECT_SPECIFICATIONS désigne un outil
- **THEN** CAB affiche les icônes pour les technologies reconnues, dans l’ordre de déclaration pour la base
- **AND** les noms des technologies inconnues restent lisibles en texte

## MODIFIED Requirements

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
- **THEN** CAB présente successivement PROJECT_ID et PROJECT_NAME, PROJECT_LANGUAGES et PROJECT_FRAMEWORKS, PROJECT_DB et PROJECT_SPECIFICATIONS, PROJECT_DOCKERED et PROJECT_DOCKER_RETENTION, PROJECT_DEBIAN_PACKAGE et PROJECT_DEBIAN_RETENTION, PROJECT_VERSION et PROJECT_VERSION_POLICY, puis PROJECT_PATH en pleine largeur

#### Scenario: Projection et validation avant écriture

- **WHEN** l’éditeur est ouvert ou reçoit une mise à jour Electric
- **THEN** CAB affiche les dernières valeurs éditables de PostgreSQL sans attendre le fichier et vérifie en arrière-plan leur état par rapport à project.env
- **AND** CAB n’autorise l’enregistrement qu’après vérification de cette source et protège la saisie si une mise à jour concurrente touche un champ modifié
