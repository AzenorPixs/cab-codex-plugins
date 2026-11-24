# project-openspec-changes Specification

## Purpose

Permettre aux utilisateurs de consulter les changes ouverts et archivés d’un
projet dans CAB. Le catalogue PostgreSQL reflète les déclarations locales
OpenSpec et alimente les mises à jour de l’interface via Electric.

## Requirements

### Requirement: Catalogue des changes par projet
CAB MUST présenter la page Changes avec Ouverts par défaut puis Archivés. Chaque
ligne MUST afficher l’identifiant, le titre disponible, les tâches, la dernière
modification et l’action Actualiser. Une archive MUST afficher sa date
d’archivage. Le tri MUST placer les modifications récentes en premier.

#### Scenario: Affichage du projet sélectionné
- **WHEN** un utilisateur autorisé visite Changes
- **THEN** la vue charge les données du projet depuis la table changes
- **AND** seules les lignes de l’onglet sélectionné sont affichées, de la modification la plus récente à la plus ancienne

### Requirement: Projection OpenSpec en direct
CAB MUST réconcilier les déclarations OpenSpec à l’ajout du projet, lors des
modifications et des archivages, ainsi qu’à un créneau aléatoire quotidien.
La source OpenSpec MUST prévaloir et Electric MUST diffuser les mutations
des seules données publiques du projet autorisé.

#### Scenario: Archivage pendant la consultation
- **WHEN** un change est archivé par une session de codage
- **THEN** la ligne quitte Ouverts et apparaît dans Archivés sans rechargement

#### Scenario: Données indisponibles
- **WHEN** la lecture des sources est incomplète
- **THEN** CAB conserve la dernière projection complète et signale l’échec

### Requirement: Empreintes des fichiers et actualisation ciblée
CAB MUST comparer les hashes par fichier pour proposal.md, design.md,
tasks.md, .openspec.yaml, les spécifications du change et STATISTICS.md
lorsqu’ils existent. Une actualisation manuelle MUST relire le seul
identifiant OpenSpec visé et réconcilier les données affichées.

#### Scenario: Nouveau contenu et réconciliation
- **WHEN** le contenu d’un fichier surveillé change ou qu’un fichier est ajouté ou retiré
- **THEN** CAB met à jour la projection et la date de modification

#### Scenario: Horodatage seul
- **WHEN** le contenu surveillé reste identique et que le change ne passe pas en archive
- **THEN** CAB conserve la date de modification et la place relative de la ligne

### Requirement: Actualisation par icône dans les listes de changes
Les onglets Ouverts et Archivés MUST afficher une icône accessible pour
l’action Actualiser. Pendant la demande l’icône MUST indiquer l’état occupé,
tourner si les préférences de mouvement le permettent et bloquer un nouvel appel.

#### Scenario: Demande en cours
- **WHEN** l’utilisateur active l’icône d’une ligne
- **THEN** CAB lance l’actualisation et indique l’état occupé jusqu’au retour

### Requirement: Fiche d’un change OpenSpec
L’identifiant de chaque ligne MUST ouvrir une fiche pleine largeur sous
/projects/{projectId}/changes/{changeId}. La fiche MUST afficher les données
disponibles du change et de la source sélectionnée dans PostgreSQL. Les sessions
associées MUST être accessibles par leurs propres liens.

#### Scenario: Archives homonymes
- **WHEN** deux archives partagent un identifiant et l’utilisateur ouvre une de leurs lignes
- **THEN** la fiche affiche les données et empreintes de cette source précise

#### Scenario: Périmètre du projet
- **WHEN** un utilisateur demande le change d’un projet auquel il ne peut pas accéder
- **THEN** CAB refuse la demande de données
