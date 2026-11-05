## ADDED Requirements

### Requirement: Supervision de plusieurs RUN
Le superviseur MUST suivre chaque RUN séparément, avec son activité SSE, sa session, son gate, son compteur de reprise et sa récupération. Les relances MUST rester techniques et corrélées au RUN. L’arrêt d’un RUN MUST NOT interrompre la supervision des autres.

#### Scenario: Isolation concurrente
- **WHEN** un événement de A arrive
- **THEN** l’horloge de B reste inchangée
