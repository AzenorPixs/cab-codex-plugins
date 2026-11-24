## ADDED Requirements

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
