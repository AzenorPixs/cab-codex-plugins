## ADDED Requirements

### Requirement: Canal stdio MCP partagé par agent qualifié
Pour chaque client qualifié, CAB MUST utiliser un seul canal stdio par type d’agent, tous comptes confondus. Chaque appel MUST rester rattaché à sa session native et à son RUN sur preuve vérifiée. CAB MUST surveiller l’unicité, le moteur et le catalogue, tenter la reprise admissible et notifier l’écart puis son retour vérifié.

#### Scenario: Deux RUN distincts sur la même liaison
- **WHEN** deux sessions natives utilisent un canal stdio partagé
- **THEN** CAB sélectionne le RUN vérifié de chaque appel, refuse toute divergence et préserve les reçus et réservations des deux sessions

#### Scenario: Écart après qualification
- **WHEN** un agent ouvre une seconde liaison ou que la version du moteur ou du catalogue diverge
- **THEN** CAB notifie l’écart et maintient la remédiation sûre jusqu’à la preuve du retour à l’état attendu
