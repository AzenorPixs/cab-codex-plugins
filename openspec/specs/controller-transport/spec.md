# controller-transport Specification

## Purpose
Cette capacité définit le contrôleur CGPT local qui relaie une demande du broker vers CGPT et restitue une décision corrélée.

## Requirements

### Requirement: Interface locale limitée
Le contrôleur SHALL écouter uniquement sur `127.0.0.1` ou `::1`, par défaut
`127.0.0.1`, et SHALL conserver MCP hors de son interface HTTP. Il SHALL
exiger une exécution explicitement déclarée hors sandbox et un workspace de
projet absolu fourni au démarrage. Il SHALL NOT contenir de liste codée en dur
de projets pilotés.

#### Scenario: Démarrage sans autorisation hors sandbox
- **WHEN** le contrôleur démarre sans `OC_Codex_OUTSIDE_SANDBOX=1`
- **THEN** il échoue avant d'ouvrir son interface locale

#### Scenario: Hôte non local refusé
- **WHEN** `OC_Codex_STATUS_HOST` contient une adresse autre que `127.0.0.1` ou `::1`
- **THEN** le contrôleur échoue avant d'ouvrir son interface locale

#### Scenario: Workspace non autorisé refusé
- **WHEN** `OC_Codex_WORKSPACE` est absent ou relatif
- **THEN** le contrôleur échoue avant de lancer Codex App Server

#### Scenario: Workspace absolu générique
- **WHEN** `OC_Codex_WORKSPACE` désigne une racine de projet absolue
- **THEN** le contrôleur l'accepte sans comporter de référence à un projet
  piloté particulier

### Requirement: Contrat HTTP de validation
Le contrôleur SHALL accepter une demande sur `POST /validation/request`,
mémoriser une décision explicite et unique sous le `requestId` de la demande,
et la restituer par `GET /decision/<requestId>`. Toute décision restituée SHALL
inclure le même `requestId`, l'`approval_id` et le `change_id` de la demande
notifiée. Le contrôleur SHALL accepter les décisions `approved`, `rejected` et
`needs_clarification` et SHALL refuser une seconde décision pour le même
`requestId`. Le mode de décision SHALL être `manual` par défaut. Lorsque
`OC_Codex_DECISION_MODE=manual`, le contrôleur SHALL conserver la demande en
attente et SHALL attendre une décision valide envoyée sur
`POST /decision/<requestId>` sans lancer de décision automatique.

#### Scenario: Décision manuelle valide
- **WHEN** une décision `needs_clarification` valide est envoyée sur `POST /decision/<requestId>` pour une demande notifiée en mode manuel
- **THEN** le contrôleur la mémorise une fois avec les identifiants de la demande et répond avec un statut HTTP de création

#### Scenario: Demande manuelle en attente
- **WHEN** une demande valide est envoyée sur `POST /validation/request` avec `OC_Codex_DECISION_MODE=manual`
- **THEN** le contrôleur répond PENDING sans démarrer de tour de décision Codex et `GET /decision/<requestId>` reste indisponible jusqu'à une décision corrélée

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

### Requirement: Corrélation sûre des commandes Bash instrumentées
Le contrôleur SHALL corréler une permission Bash à la commande approuvée
lorsque OpenCode y ajoute exclusivement une instrumentation de sortie
déterministe connue. Il SHALL vérifier que la commande métier approuvée reste
inchangée et SHALL refuser toute transformation qui ajoute, retire ou modifie
une opération métier. Une permission corrélée SHALL rester consommable une
seule fois.

#### Scenario: Commande exacte
- **WHEN** OpenCode demande une permission Bash dont la commande est identique
  à celle du mandat approuvé
- **THEN** le contrôleur la corrèle à ce mandat et peut transmettre une unique
  réponse `once` après une décision `approved`

#### Scenario: Instrumentation de sortie admise
- **WHEN** OpenCode ajoute uniquement l'instrumentation de sortie déterministe
  reconnue à la fin de la commande approuvée
- **THEN** le contrôleur corrèle la permission à la commande métier approuvée
  sans élargir la portée du mandat

#### Scenario: Transformation métier refusée
- **WHEN** la commande de permission diffère de la commande approuvée autrement
  que par l'instrumentation de sortie reconnue
- **THEN** le contrôleur ne la corrèle pas et ne transmet aucune réponse de
  permission

### Requirement: Réveil corrélé de l'orchestrateur
Le contrôleur SHALL accepter une relance corrélée sur une interface HTTP locale
et vérifier son `requestId`, son `approval_id` et son `change_id` avant toute
action. Pour une relance valide sans décision terminale, il SHALL tenter, dans
l'ordre, de transmettre l'événement structuré à la tâche orchestratrice
persistante, de planifier un heartbeat lié à cette tâche avec la consigne
d'examiner le mandat sans l'approuver implicitement, puis de conserver une
notification locale persistante si le réveil est indisponible. Aucune de ces
actions ne SHALL créer, modifier ou consommer une décision.

#### Scenario: Événement structuré transmis
- **WHEN** le contrôleur reçoit une relance corrélée et sa tâche orchestratrice persistante est disponible
- **THEN** il transmet `requestId`, `change_id`, session OpenCode, âge, opération et dernier état connu sans créer de décision

#### Scenario: Réveil indisponible
- **WHEN** le contrôleur ne peut pas transmettre l'événement ni planifier son heartbeat
- **THEN** il conserve une notification locale persistante pour l'orchestrateur et retourne un état de relance non décisionnel
