## ADDED Requirements

### Requirement: Readiness commune et par RUN
Le broker MUST publier les compteurs par RUN et par session en plus de la santé commune. Un appel readiness ciblé MUST distinguer les attentes métier d’un autre RUN des défaillances communes. Une reconnexion, purge ou remédiation affectant l’infrastructure partagée MUST attendre la réconciliation des RUN affectés.

#### Scenario: Isolation concurrente
- **WHEN** A attend une décision et B est sain
- **THEN** B conserve sa disponibilité propre sans masquer une défaillance commune
