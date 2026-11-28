## ADDED Requirements

### Requirement: Nettoyage vérifié avant Publication

CAB MUST déclencher le nettoyage à l’entrée de l’étape 10 du nouveau profil et consigner la restitution des ressources du RUN. CAB MUST empêcher la validation du passage et la progression vers Publication tant que la restitution reste en attente ou indéterminée. CAB MUST mettre à disposition du codeur un inventaire Git filtré en lecture seule pour la revue des fichiers étrangers au projet.

#### Scenario: Fichier suspect dans le projet
- **WHEN** le codeur identifie un candidat à la suppression dans l’inventaire
- **THEN** il soumet au développeur le chemin et le motif et attend une validation explicite avant toute suppression.
- **AND** la collecte CAB ne supprime aucun fichier du projet et exclut les chemins protégés.

#### Scenario: Ancienne étape Vacante
- **WHEN** un RUN conserve le profil avec une étape 10 Vacante
- **THEN** ce passage conserve son libellé et sa validation vide.

## MODIFIED Requirements

### Requirement: Cycle Publication versionné à12 étapes
CAB MUST créer les nouveaux cycles avec Initialisation/Prévol fusionnés, Analyse, Cadrage, Spécification, Versionning, Implémentation, Vérifications, Revue, Archivage, Nettoyage, Publication puis Clôture. CAB MUST conserver le profil et les numéros des anciens RUN.

#### Scenario: Nouvelle session et session historique
- **WHEN** un nouveau RUN est créé après activation
- **THEN** son étape 10 est Nettoyage, sa Publication est à l’étape 11 et sa Clôture à l’étape 12. Les passages historiques gardent leurs numéros et libellés du profil enregistré.

### Requirement: Statistiques en dernières actions de Clôture
CAB MUST conserver la Publication à l’étape 11 et la Clôture à l’étape 12, ainsi que le profil des RUN existants.

#### Scenario: Passage vacant
- **WHEN** un RUN historique ouvre et valide le passage Vacante de son profil enregistré
- **THEN** CAB conserve ses deux bornes sans exécuter de tâche à ce passage.

#### Scenario: Dernier tour de codage
- **WHEN** les preuves de publication et la validation finale applicable sont acquises
- **THEN** CAB attend la fin native attestée du travail de chaque rôle applicable, collecte les durées et les tokens disponibles à cette borne, puis écrit le rapport du change et le rapport global, dans cet ordre.
- **AND** le reçu de fermeture du RUN intervient après ces dernières actions, sans commit, tag ni envoi distant de clôture.

#### Scenario: Télémétrie tardive
- **WHEN** le dernier tour est encore actif ou sa borne manque
- **THEN** CAB attend la preuve de fin et conserve le RUN ouvert.

#### Scenario: Tour de clôture suivi d’un nouveau tour
- **WHEN** le journal natif vérifié atteste la fin du tour portant la validation finale d’un RUN direct
- **THEN** CAB collecte la télémétrie jusqu’à cette fin, même si un tour ultérieur est ouvert
- **AND** les entrées de compaction sans télémétrie ne bloquent pas la lecture des bornes et des compteurs.
