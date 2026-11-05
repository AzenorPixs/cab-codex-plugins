## MODIFIED Requirements

### Requirement: Comparaison de concurrence étayée
Un bilan 1.7.0 MUST distinguer réservations, accès compatibles et exécutions natives réellement observées. Il MUST exposer bornes et couverture avant toute comparaison avec une période antérieure. Les fenêtres et imports statistiques effectivement livrés MUST être conservés sans addition des sources recouvrantes.

#### Scenario: Benchmark synthétique
- **WHEN** un test démontre des accès indépendants concurrents
- **THEN** le bilan décrit cette preuve technique sans annoncer un gain causal de productivité en production
