## MODIFIED Requirements

### Requirement: Observation bornée sans effet métier
Le moniteur MUST collecter les vues admises des composants locaux et les documents OpenSpec de son workspace, avec requêtes et mémoire bornées et sans collecte concurrente. Il MUST NOT créer de décision, permission, effet ou session métier. SGS et CCAB MUST être lus par leur IPC local. Les seules mutations autorisées MUST être la gestion de briques/catalogue et la suppression explicite d’une archive CAB close par le développeur, avec gardes de chemins, origine et RUN actifs.

#### Scenario: Suppression d’une copie archivée
- **WHEN** le développeur supprime une archive close identifiée
- **THEN** le moniteur supprime cette copie CAB sans toucher au rapport source, aux statistiques SGS ou aux RUN pairs

#### Scenario: Plusieurs navigateurs
- **WHEN** plusieurs navigateurs consultent le tableau de bord
- **THEN** ils partagent la collecte sans multiplier les sondes vers CAB

#### Scenario: Rangement du moniteur
- **WHEN** une ligne admissible est archivée
- **THEN** seul le catalogue privé du moniteur change

#### Scenario: Purge confirmée
- **WHEN** une ancienne confirmation de purge statistique est envoyée au moniteur2.4
- **THEN** elle est refusée sans mutation ; la suppression développeur de copies CAB reste dans ARCHIVES

### Requirement: Fin du serveur OpenCode suivi
En mode piloté, le moniteur MUST appliquer cab-process-lifecycle à l’instance OpenCode identifiée, sans confondre panne du contrôleur/superviseur et fermeture native. En mode direct explicite, il MUST rester indépendant d’OpenCode et MUST NOT en créer ni le sonder pour décider de sa durée de vie.

#### Scenario: Moniteur direct sans OpenCode
- **WHEN** le projet utilise CAB direct et OpenCode est absent
- **THEN** le moniteur conserve ses vues SGS, CCAB et archives sans session native fictive

#### Scenario: Contrôleur seul arrêté
- **WHEN** le contrôleur tombe mais le serveur OpenCode identifié vit encore
- **THEN** le moniteur reste disponible et expose la panne

#### Scenario: Serveur OpenCode terminé
- **WHEN** la disparition de l’instance OpenCode suivie en mode piloté est prouvée localement
- **THEN** le moniteur piloté ferme ses flux et son serveur sans modifier les RUN

## ADDED Requirements

### Requirement: Vues fidèles des données conservées
Le WebMonitor SHALL afficher RUN directs/pilotés, Archives réelles consultables, Stats issues exclusivement de SGS et file CCAB. Les reliquats stockés SHALL être inventoriables. Le développeur MAY supprimer une archive CAB identifiée depuis l’interface sans approbation CAB supplémentaire ; les RUN en cours et chemins étrangers SHALL rester protégés.

#### Scenario: Suppression développeur
- **WHEN** le développeur supprime une archive CAB close explicitement identifiée
- **THEN** l’objet exact est supprimé et la vue reflète l’état réel sans toucher aux pairs
