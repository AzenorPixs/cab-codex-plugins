## Purpose

Cette capacité définit le contrôleur CGPT local qui relaie une demande du broker vers CGPT et restitue une décision corrélée.

## ADDED Requirements

### Requirement: Interface locale limitée
Le contrôleur SHALL écouter uniquement sur une adresse locale configurable, par défaut `127.0.0.1`, et SHALL conserver MCP hors de son interface HTTP. Il SHALL exiger une exécution explicitement déclarée hors sandbox.

#### Scenario: Démarrage sans autorisation hors sandbox
- **WHEN** le contrôleur démarre sans `OC_CGPT_OUTSIDE_SANDBOX=1`
- **THEN** il échoue avant d'ouvrir son interface locale

### Requirement: Contrat HTTP de validation
Le contrôleur SHALL accepter une demande sur `POST /validation/request`, mémoriser une décision explicite et unique, et la restituer par `GET /decision/<requestId>`. Il SHALL accepter les décisions `approved`, `rejected` et `needs_clarification`.

#### Scenario: Décision manuelle valide
- **WHEN** une décision `needs_clarification` valide est envoyée sur `POST /decision/<requestId>`
- **THEN** le contrôleur la mémorise une fois et répond avec un statut HTTP de création

#### Scenario: Méthode non admise
- **WHEN** une méthode autre que GET ou POST cible `/decision/<requestId>`
- **THEN** le contrôleur répond HTTP 405

### Requirement: Statut de supervision
Le contrôleur SHALL exposer son état public sur `GET /status`, dont l'état du Codex App Server, du SSE OpenCode et la dernière readiness du broker.

#### Scenario: Lecture du statut
- **WHEN** un healthcheck appelle `GET /status`
- **THEN** il reçoit un objet JSON sans secret ni décision détaillée
