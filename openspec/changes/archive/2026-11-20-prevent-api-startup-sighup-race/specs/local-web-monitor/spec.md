## ADDED Requirements

### Requirement: Disponibilité de l’API avant rechargement de sa journalisation
Le démon CAB MUST attendre une réponse de son processus API avant de lui transmettre un signal de rechargement. L’API MUST charger sa configuration de journalisation pendant son démarrage.

#### Scenario: Démarrage avec processus API encore en initialisation
- **WHEN** le démon démarre et que l’API n’a pas encore répondu
- **THEN** le démon laisse l’API finir son initialisation sans lui transmettre de signal de rechargement

#### Scenario: Demande explicite après disponibilité
- **WHEN** le démon reçoit une demande de rechargement et que son processus API a confirmé sa disponibilité
- **THEN** le démon recharge sa propre journalisation et transmet la demande à l’API
