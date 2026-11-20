## ADDED Requirements

### Requirement: Convergence continue des connecteurs MCP
CAB MUST vérifier le nombre de connecteurs et la concordance du moteur et du catalogue avec sa version. Plusieurs relais MUST être justifiés par des canaux indépendants observés. CAB MUST conserver l’attente et retenter les remédiations admissibles avec un délai, sans rejouer un effet incertain.

#### Scenario: Détection et résolution d’un écart
- **WHEN** un agent présente une liaison sans version attestée ou plusieurs relais sans canaux indépendants prouvés
- **THEN** CAB notifie le début de la remédiation et surveille les preuves jusqu’au retour effectif à l’état attendu
- **AND THEN** CAB notifie le retour uniquement après preuve du moteur et du catalogue
