## ADDED Requirements

### Requirement: Prévol des règles MCP de session
Avant l'armement ou le transfert vers une session pilotée, CAB SHALL détecter une règle de session universelle qui soumet `cgpt-validation_broker_readiness` ou `cgpt-validation_request_validation` à ASK ou DENY. CAB SHALL exposer un diagnostic permettant à l'orchestrateur de choisir une politique compatible dans son mandat. Une politique héritée ou partielle SHALL NOT être présentée comme vérifiée sans observation native. Les protections shell, edit et web SHALL rester applicables.

#### Scenario: Règle de session masque une autorisation globale
- **WHEN** une règle de session universelle bloque une méthode MCP nécessaire
- **THEN** le prévol signale la méthode et refuse l'armement avant tout effet métier

#### Scenario: Pas de règle de session concluante
- **WHEN** aucune règle explicite universelle ne détermine l'accès à la méthode
- **THEN** CAB ne déduit pas une autorisation et le prévol natif reste requis

#### Scenario: Candidate de transfert incompatible
- **WHEN** une session candidate soumet une méthode MCP nécessaire à ASK ou DENY
- **THEN** le transfert est refusé avant toute modification du SID courant
