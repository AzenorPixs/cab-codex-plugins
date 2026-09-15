# controller-transport Specification

## Purpose
Cette capacité définit le contrôleur CGPT local qui relaie une demande du broker vers CGPT et restitue une décision corrélée.

## Requirements

### Requirement: Interface locale limitée
Le contrôleur SHALL écouter uniquement sur `127.0.0.1` ou `::1`, par défaut
`127.0.0.1`, et SHALL conserver MCP hors de son interface HTTP. Il SHALL
exiger une exécution explicitement déclarée hors sandbox et un workspace de
projet absolu fourni au démarrage. Il ne SHALL contenir aucune liste codée en
dur de projets pilotés.

#### Scenario: Démarrage sans autorisation hors sandbox
- **WHEN** le contrôleur démarre sans `OC_CGPT_OUTSIDE_SANDBOX=1`
- **THEN** il échoue avant d'ouvrir son interface locale

#### Scenario: Hôte non local refusé
- **WHEN** `OC_CGPT_STATUS_HOST` contient une adresse autre que `127.0.0.1` ou `::1`
- **THEN** le contrôleur échoue avant d'ouvrir son interface locale

#### Scenario: Workspace non autorisé refusé
- **WHEN** `OC_CGPT_WORKSPACE` est relatif ou absent
- **THEN** le contrôleur échoue avant de lancer Codex App Server

#### Scenario: Workspace absolu générique
- **WHEN** `OC_CGPT_WORKSPACE` désigne une racine de projet absolue
- **THEN** le contrôleur l'accepte sans comporter de référence à un projet piloté particulier

### Requirement: Contrat HTTP de validation
Le contrôleur SHALL accepter une demande sur `POST /validation/request`,
mémoriser une décision explicite et unique sous le `requestId` de la demande,
et la restituer par `GET /decision/<requestId>`. Toute décision restituée SHALL
inclure le même `requestId`, l'`approval_id` et le `change_id` de la demande
notifiée. Le contrôleur SHALL accepter les décisions `approved`, `rejected` et
`needs_clarification` et SHALL refuser une seconde décision pour le même
`requestId`.

#### Scenario: Décision manuelle valide
- **WHEN** une décision `needs_clarification` valide est envoyée sur `POST /decision/<requestId>` pour une demande notifiée
- **THEN** le contrôleur la mémorise une fois avec les identifiants de la demande et répond avec un statut HTTP de création

#### Scenario: Lecture corrélée d'une décision
- **WHEN** le broker appelle `GET /decision/<requestId>` après qu'une décision a été mémorisée
- **THEN** le contrôleur retourne cette décision et ses identifiants de corrélation sans la substituer par un `approval_id`

#### Scenario: Méthode non admise
- **WHEN** une méthode autre que GET ou POST cible `/decision/<requestId>`
- **THEN** le contrôleur répond HTTP 405

### Requirement: Statut de supervision
Le contrôleur SHALL exposer son état public sur `GET /status`, dont l'état du Codex App Server, du SSE OpenCode et la dernière readiness du broker.

#### Scenario: Lecture du statut
- **WHEN** un healthcheck appelle `GET /status`
- **THEN** il reçoit un objet JSON sans secret ni décision détaillée
