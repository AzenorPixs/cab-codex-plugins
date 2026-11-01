## ADDED Requirements

### Requirement: Distribution du rétablissement CABU 2.1.15
La distribution MUST aligner ses composants et commandes sur2.1.15 et documenter le budget de démarrage et les phases non terminales de rollback. Les tests MUST couvrir échecs, reprise et invariants métier. L’activation MUST rester séparée de la qualification source et être annoncée seulement après versions actives et readiness vérifiées.

#### Scenario: Reprise après activation échouée
- **WHEN** les sources corrigées sont publiées et CABU est autorisé
- **THEN** la procédure conserve les journaux antérieurs et vérifie l’état effectif avant d’informer les sessions
