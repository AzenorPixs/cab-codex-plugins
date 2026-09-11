# controller-transport Specification

## Purpose
Cette capacité définit le contrôleur CGPT local qui relaie une demande du broker vers CGPT et restitue une décision corrélée.

## Requirements

### Requirement: Interface locale limitée
Le contrôleur SHALL écouter uniquement sur `127.0.0.1` ou `::1`, par défaut
`127.0.0.1`, et SHALL conserver MCP hors de son interface HTTP. Il SHALL
exiger une exécution explicitement déclarée hors sandbox et un workspace CAB
absolu autorisé : `/workspace` ou `/home/devops/datas/cab`.

#### Scenario: Démarrage sans autorisation hors sandbox
- **WHEN** le contrôleur démarre sans `OC_CGPT_OUTSIDE_SANDBOX=1`
- **THEN** il échoue avant d'ouvrir son interface locale

#### Scenario: Hôte non local refusé
- **WHEN** `OC_CGPT_STATUS_HOST` contient une adresse autre que `127.0.0.1` ou `::1`
- **THEN** le contrôleur échoue avant d'ouvrir son interface locale

#### Scenario: Workspace non autorisé refusé
- **WHEN** `OC_CGPT_WORKSPACE` est relatif ou ne correspond pas à une racine CAB autorisée
- **THEN** le contrôleur échoue avant de lancer Codex App Server

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
