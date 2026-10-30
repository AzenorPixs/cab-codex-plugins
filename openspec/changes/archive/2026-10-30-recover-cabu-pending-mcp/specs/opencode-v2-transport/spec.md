## ADDED Requirements

### Requirement: Observation filtrée de la frontière de rechargement
Le client CAB MUST fournir une observation V2 de récupération contenant PID/version/location partagée, empreinte des IDs globaux des sessions et compteurs d’activité/permissions partagées, sans corps ou secret. Les lectures MUST rester bornées et ne pas initialiser de location étrangère. Cette observation MUST NOT valoir autorisation ou preuve d’absence d’effet métier.

#### Scenario: Préservation du processus et des sessions
- **WHEN** une récupération globale est explicitement autorisée
- **THEN** les observations avant/après permettent de refuser un changement de PID, location ou sessions sans restaurer artificiellement l’historique
