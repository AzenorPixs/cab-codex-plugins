## ADDED Requirements

### Requirement: Readiness de coordination temporairement indisponible
Un broker sans readiness de coordination disponible pendant une transition SHALL provoquer503 broker-coordination-not-ready et conserver la demande PENDING et ses identifiants pour la reprise de notification. Ce diagnostic SHALL être distingué de409 coordination-upgrade-required pour un contrat entrant réellement incompatible. L’indisponibilité SHALL NOT autoriser une décision, un accès ou une permission.

#### Scenario: Notification pendant la reconnexion du broker
- **GIVEN** une requête resource-scoped-v1 correcte et une readiness absente
- **WHEN** la notification arrive
- **THEN**503 est conservé comme transitoire sans NOT_ADMITTED ni nouveau requestId

#### Scenario: Requête legacy ou incomplète
- **GIVEN** une requête sans contrat de coordination valide
- **WHEN** elle est soumise
- **THEN** le refus permanent409 reste appliqué

#### Scenario: Broker explicitement incompatible
- **GIVEN** une readiness déclarant un protocole legacy
- **WHEN** une validation est soumise
- **THEN**409 reste appliqué sans permission ni gel ordinaire
