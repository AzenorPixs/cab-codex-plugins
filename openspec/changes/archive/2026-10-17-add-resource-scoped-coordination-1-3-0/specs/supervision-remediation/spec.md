# Readiness et diagnostics ciblés — delta 1.3.0

## MODIFIED Requirements

### Requirement: Readiness commune et par RUN
Le broker MUST publier les compteurs par RUN et session ainsi que la santé commune et le protocole de coordination. Une attente métier ou de ressource MUST rester distincte d'une défaillance commune. Une remédiation de l'infrastructure partagée MUST suivre le gel exceptionnel et la réconciliation des RUN affectés.

#### Scenario: Isolation concurrente
- **WHEN** A attend une ressource et B est sain sur un périmètre indépendant
- **THEN** B conserve sa disponibilité propre sans masquer une défaillance commune

## ADDED Requirements

### Requirement: Cause actuelle de coordination observable
Les vues de statut MUST distinguer conflit de ressource, révisions affectées, promotion de périmètre, pause/arrêt ciblés, gel global exceptionnel et incertitude. Elles MUST exposer propriétaire bloquant, portée autorisée et date d'observation sans contenu sensible. Un statut périmé MUST NOT devenir une cause actuelle affirmée.

#### Scenario: Conflit résolu
- **WHEN** une protection est libérée mais un checkpoint conserve l'ancienne attente
- **THEN** la vue actuelle ne présente plus ce propriétaire comme obstacle sans preuve de conflit restant

### Requirement: Diagnostic sans remédiation implicite
Le healthcheck et les lectures de statut MUST rester sans permission, acquisition métier ni remédiation. Une longue attente de ressource MUST NOT déclencher reconnexion, purge, redémarrage, gel général ou libération. Une défaillance commune MUST rester visible sans décision implicite.

#### Scenario: Attente longue
- **WHEN** une demande reste bloquée par une opération longue connue
- **THEN** le diagnostic expose la cause sans libérer les ressources ni redémarrer les services

