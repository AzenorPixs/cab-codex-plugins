## ADDED Requirements

### Requirement: Maintenance statistique explicite
Le contrôleur MUST exposer une projection filtrée pour STATS et une maintenance propriétaire conforme à web-statistics-retention. La maintenance MUST préserver les interfaces JSON/Markdown existantes, la séparation native/importée et les contrats de permission. Les données purgées MUST devenir absentes ou inconnues, jamais une activité nulle inventée.

#### Scenario: Fenêtre après purge
- **WHEN** une fenêtre recouvre des segments supprimés
- **THEN** la couverture diminue et les périodes sans preuve restent INCONNU

## MODIFIED Requirements

### Requirement: Comparaison de concurrence étayée
Un bilan 1.6.0 MUST distinguer réservations, accès compatibles et exécutions natives réellement observées. Il MUST exposer bornes et couverture avant toute comparaison avec une période antérieure. Les fenêtres et imports statistiques effectivement livrés MUST être conservés sans addition des sources recouvrantes.

#### Scenario: Benchmark synthétique
- **WHEN** un test démontre des accès indépendants concurrents
- **THEN** le bilan décrit cette preuve technique sans annoncer un gain causal de productivité en production
