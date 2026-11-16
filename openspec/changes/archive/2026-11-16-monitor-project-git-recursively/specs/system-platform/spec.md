## ADDED Requirements

### Requirement: Surveillance récursive et limitation des analyses Git
CAB MUST surveiller récursivement les dossiers des projets enregistrés, adapter la surveillance aux ajouts, suppressions, renommages et déplacements de projet et regrouper les événements dans une file en mémoire par projet. Il MUST limiter à une analyse Git simultanée pour CAB et respecter les délais configurés entre les analyses automatiques et explicites. Une perte d’événements MUST déclencher une reconstruction de la surveillance et une réconciliation.

#### Scenario: Activité continue
- **WHEN** des fichiers changent sans interruption
- **THEN** CAB regroupe les événements et lance une analyse au plus tard après le délai maximal, sous réserve de l’intervalle minimal et de la disponibilité du worker

### Requirement: Réglages Git en base
Administration / Git MUST permettre de modifier les délais en secondes conservés dans PostgreSQL : calme, intervalle minimal et attente maximale. Les valeurs initiales MUST être 7, 30 et 70 et s’appliquer sans redémarrage.

#### Scenario: Modification des délais
- **WHEN** un administrateur enregistre des délais valides
- **THEN** CAB les conserve en base et les applique aux prochaines analyses
