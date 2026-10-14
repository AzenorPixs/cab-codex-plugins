## MODIFIED Requirements

### Requirement: Contrat HTTP de validation

Le contrôleur SHALL accepter une demande sur `POST /validation/request`, mémoriser une
décision explicite et unique sous le `requestId` de la demande, et la restituer par `GET
/decision/<requestId>`. Toute décision restituée SHALL inclure le même `requestId`,
l'`approval_id` et le `change_id` de la demande notifiée. Le contrôleur SHALL accepter
les décisions `approved`, `rejected` et `needs_clarification` et SHALL refuser une
seconde décision pour le même `requestId`.

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

### Requirement: Corrélation sûre des commandes Bash instrumentées

Le contrôleur SHALL corréler une permission Bash à la commande approuvée lorsque
OpenCode y ajoute exclusivement une instrumentation de sortie déterministe connue. Le
contrôleur SHALL vérifier que la commande métier approuvée reste inchangée et SHALL
refuser toute transformation qui ajoute, retire ou modifie une opération métier. Une
permission corrélée SHALL rester consommable une seule fois.

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

#### Scenario: Suffixe refusé pour un job strict
- **WHEN** un job déclare `strictCommands: true` et OpenCode ajoute un suffixe,
  y compris l'instrumentation de sortie reconnue, à une commande approuvée de
  la même session et du même répertoire
- **THEN** le contrôleur ne corrèle pas cette permission et ne transmet aucune
  réponse `once`

#### Scenario: Commande exacte consommée une fois pour un job strict
- **WHEN** un job déclare `strictCommands: true` et OpenCode demande une
  permission dont la commande est strictement identique au mandat approuvé
- **THEN** le contrôleur peut transmettre une seule réponse `once` à cette
  permission et ne réutilise pas la décision pour une seconde permission

### Requirement: Réveil corrélé de l'orchestrateur

Le contrôleur SHALL accepter une relance corrélée sur une interface HTTP locale et
vérifier son `requestId`, son `approval_id` et son `change_id` avant toute action. Pour
une relance valide sans décision terminale en mode manuel, le contrôleur SHALL signaler
le rappel corrélé dans son statut sans créer de thread ni de tour Codex App Server.
Cette protection SHALL s'appliquer également aux heartbeats de relance.

#### Scenario: Rappels manuels répétés
- **WHEN** le contrôleur reçoit plusieurs relances corrélées d'une demande
  sans décision avec `OC_Codex_DECISION_MODE=manual`
- **THEN** il retourne une réponse non décisionnelle, rend le rappel observable
  et ne lance aucun `thread/start` ni `turn/start`
- **AND** `GET /decision/<requestId>` reste indisponible

#### Scenario: Décision explicite après un rappel manuel
- **WHEN** l'orchestrateur principal publie une décision valide sur
  `POST /decision/<requestId>` après un rappel manuel
- **THEN** le contrôleur mémorise cette décision une seule fois avec les
  identifiants de la demande
- **AND** une seconde décision ou une relance terminale est refusée

#### Scenario: Événement structuré transmis
- **WHEN** le contrôleur reçoit une relance corrélée en mode automatique et
  sa tâche orchestratrice persistante est disponible
- **THEN** il transmet `requestId`, `change_id`, session OpenCode, âge,
  opération et dernier état connu sans créer de décision

#### Scenario: Réveil indisponible
- **WHEN** le contrôleur en mode automatique ne peut pas transmettre
  l'événement ni planifier son heartbeat
- **THEN** il conserve une notification locale persistante pour
  l'orchestrateur et retourne un état de relance non décisionnel

### Requirement: Contrat de supervision de job local

Le contrôleur SHALL accepter et exposer exclusivement sur son interface locale un
contrat de supervision de job non secret, corrélé à une session OpenCode et à son gate
terminal. Le contrôleur SHALL refuser un contrat incomplet, une substitution implicite
de session sur /job/arm, ou une désactivation sans gate terminal validé. Seule la
récupération explicite /job/recover définie ci-dessous MAY remplacer la session.

#### Scenario: Tentative de désarmement prématuré

- **WHEN** un client demande le désarmement d'un job dont le gate terminal est
  ouvert
- **THEN** le contrôleur refuse la demande et conserve le contrat observable

#### Scenario: Type invalide pour la corrélation stricte
- **WHEN** un client arme un job avec une valeur non booléenne de
  `strictCommands`
- **THEN** le contrôleur refuse le contrat et ne l'arme pas

### Requirement: Mode manuel et décision HTTP explicite

Le mode de décision SHALL être `manual` par défaut. Lorsque
`OC_Codex_DECISION_MODE=manual`, le contrôleur SHALL conserver la demande en attente et
SHALL attendre une décision valide envoyée sur `POST /decision/<requestId>` sans lancer
de décision automatique.

#### Scenario: Mode manuel et décision HTTP explicite
- **WHEN** une demande est notifiée en mode manuel sans décision
- **THEN** le contrôleur attend POST /decision/<requestId> sans lancer de décision automatique

### Requirement: Commandes strictes dans le contexte du job

Pour un job déclarant `strictCommands: true`, le contrôleur SHALL exiger une commande de
permission strictement identique à celle du mandat et SHALL refuser également
l'instrumentation de sortie reconnue. Cette restriction SHALL s'appliquer à la session
et au répertoire du contrat de job ; son absence SHALL préserver la corrélation
instrumentée existante.

#### Scenario: Commandes strictes dans le contexte du job
- **WHEN** un job strict demande une permission avec le suffixe de sortie reconnu
- **THEN** le contrôleur refuse la corrélation dans la session et le répertoire de ce job

### Requirement: Neutralité et réveil automatique corrélé

La demande SHALL rester indécise jusqu'à une décision HTTP explicite et corrélée de
l'orchestrateur principal. En mode automatique, le contrôleur SHALL conserver son chemin
existant de transmission structurée à la tâche orchestratrice persistante, de heartbeat
lié à cette tâche et de notification locale persistante lorsque le réveil est
indisponible. Une relance SHALL NOT créer, modifier ou consommer une décision ou une
permission.

#### Scenario: Neutralité et réveil automatique corrélé
- **WHEN** un rappel automatique ne peut être transmis à la tâche persistante ni à son heartbeat
- **THEN** le contrôleur conserve une notification locale sans créer ou consommer de décision ni de permission

### Requirement: Statut du job et option de commandes strictes

Le statut public du contrôleur SHALL résumer le job armé et son gate sans exposer le
contenu du projet ni une décision CAB. Le champ facultatif `strictCommands` SHALL être
booléen, valoir `false` par défaut et être conservé dans le contrat persistant et son
état public. Le contrôleur SHALL refuser toute autre valeur avant d'armer le job.

#### Scenario: Statut du job et option de commandes strictes
- **WHEN** un client arme un job avec strictCommands non booléen
- **THEN** le contrôleur refuse le contrat avant armement ; un contrat valide conserve son option et expose son gate sans contenu du projet
