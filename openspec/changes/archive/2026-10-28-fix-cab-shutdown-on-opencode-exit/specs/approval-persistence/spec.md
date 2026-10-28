## ADDED Requirements

### Requirement: Fermeture du transport MCP
Le broker MUST terminer et libérer son verrou sur fermeture de son entrée MCP, y compris avec une demande en attente. Il MUST conserver le magasin durable et MUST NOT inventer de décision ou purger les approbations pour terminer.

#### Scenario: EOF avec demande en attente
- **WHEN** le transport MCP ferme pendant une attente de validation
- **THEN** le processus termine, le verrou devient réacquérable et la demande reste récupérable sans approbation inventée
