## ADDED Requirements

### Requirement: Attente bornée de request_validation

`request_validation` MUST utiliser un timeout fini, 120 secondes par défaut, et
refuser un timeout nul. À expiration, le broker MUST retourner le même approval
ID comme non terminal et pollable ; il MUST NOT créer une nouvelle demande,
décision ou permission. Une notification livrée MUST NOT être présentée comme
une réponse terminale.

#### Scenario: Décision absente après notification

- **WHEN** la notification est livrée mais aucune décision terminale n’arrive dans le budget
- **THEN** le broker rend `validation_timeout` avec le même approval ID et l’appel se termine
