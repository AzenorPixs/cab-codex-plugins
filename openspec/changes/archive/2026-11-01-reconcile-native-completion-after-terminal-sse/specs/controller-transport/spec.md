## MODIFIED Requirements

### Requirement: Fin native corrélée avant libération
Le contrôleur MUST corréler la fin native aux opérations protégées et conserver tout effet incertain. Un état idle ou une absence de permission seule MUST NOT prouver la fin des effets. Une absence ou divergence de preuve MUST conserver les protections. La libération MUST exiger les preuves techniques et l'examen de l'orchestrateur prévus pour cette frontière.

#### Scenario: Fin SSE perdue
- **WHEN** une session devient idle sans fin d'outil corrélée exploitable
- **THEN** ses protections restent détenues jusqu'à réconciliation native

## ADDED Requirements

### Requirement: Réconciliation du transcript après SSE terminal
Après un événement terminal SSE sans partie finale exploitable, le contrôleur MUST relire le transcript seulement s'il reste une opération non résolue pour cette session. Il MUST réutiliser les gardes de preuve native ; un exit non nul clôt la fin technique sans valider le prévol.

#### Scenario: Fin native absente de l'événement SSE
- **WHEN** une session contrôlée devient idle et son transcript contient la partie finale de l'opération corrélée
- **THEN** le contrôleur vérifie la preuve native et clôt l'opération sans émettre de permission

#### Scenario: Exit non nul
- **WHEN** le transcript prouve la commande corrélée terminée avec `exit=1`
- **THEN** l'opération est techniquement terminée, mais le prévol exigeant `exit=0` reste un échec

#### Scenario: Transcript sans preuve exploitable
- **WHEN** la relecture est indisponible ou ne contient pas de fin corrélée valide
- **THEN** le contrôleur conserve l'état et les protections non résolus
