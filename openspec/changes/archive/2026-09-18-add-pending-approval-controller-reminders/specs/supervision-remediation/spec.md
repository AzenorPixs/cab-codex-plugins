## ADDED Requirements

### Requirement: Supervision des relances de décision
CAB SHALL exposer l'état de la dernière relance corrélée et d'une éventuelle
notification locale persistante sans considérer une relance comme une
progression métier. Une relance ou son échec SHALL NOT déclencher de décision,
de permission OpenCode ou de remédiation automatique hors de son périmètre
technique.

#### Scenario: Relance en attente d'examen
- **WHEN** une relance corrélée est conservée pour l'orchestrateur
- **THEN** la supervision la rend observable sans déclarer le mandat décidé
