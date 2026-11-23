## ADDED Requirements

### Requirement: Catalogue confirmé avant la projection active
La projection MCP MUST publier Actif avec un heartbeat frais, un moteur vivant et un catalogue correspondant à ce moteur. Une attente de lecture de catalogue sur un moteur vivant MUST NOT déclencher une deuxième relance.

#### Scenario: Moteur relancé et catalogue manquant

- **WHEN** le moteur répond mais que le client n’a pas encore lu le catalogue
- **THEN** la projection conserve le connecteur inactif jusqu’à une preuve concordante
