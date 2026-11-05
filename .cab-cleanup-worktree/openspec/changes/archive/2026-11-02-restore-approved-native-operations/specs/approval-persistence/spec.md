## ADDED Requirements

### Requirement: Décision d’opération durable et restauration exacte

Une décision terminale d’une opération concurrente MUST être persistée avec
son identité exacte avant toute réponse de permission native. Après
redémarrage, CAB MUST restaurer la validation seulement à partir d’une demande
native terminée et d’un résultat natif terminal qui correspondent au même
requestId, approvalId, operationId, operationDigest, RUN, session, génération
et révisions. Le texte libre, une sortie incomplète ou une identité ambiguë
MUST NOT restaurer une décision.

#### Scenario: Décision approuvée avant réponse native

- **WHEN** CAB redémarre après l’enregistrement durable d’une approbation,
  mais avant l’envoi de la réponse native
- **THEN** il restaure uniquement la décision et l’opération exactement
  corrélées
- **AND** il ne crée aucune nouvelle demande ni permission

#### Scenario: Réponse d’approbation divergente

- **WHEN** l’historique est incomplet, dupliqué, libre ou diverge sur une
  identité ou empreinte
- **THEN** CAB ne restaure pas la décision, ne répond pas à la permission et
  conserve l’opération protégée

#### Scenario: Rejet après redémarrage

- **WHEN** le rejet exact est durable et confirmé par son historique natif
- **THEN** CAB restaure le rejet sans acquérir d’accès ni répondre `once`

### Requirement: Continuation native après preuve de permission pendante

Après une interruption, CAB MUST reprendre une réponse `once` uniquement si
OpenCode prouve que la permission exacte est toujours pendante, son callID
correspond à l’opération persistée, l’historique natif ne contient aucune
réponse ni démarrage, et les gardes d’identité, accès et révisions sont
toujours satisfaites. Un accusé durable, une permission absente, un outil
démarré ou une preuve incomplète MUST NOT entraîner un nouvel envoi.

#### Scenario: Réponse perdue et permission toujours pendante

- **WHEN** le processus redémarre et la permissionId/callID exacte reste
  pendante sans événement de réponse ou de démarrage
- **THEN** CAB peut continuer une seule fois la réponse déjà décidée, après
  revalidation de l’accès et des révisions

#### Scenario: Réponse déjà acquittée ou effet inconnu

- **WHEN** onceAcknowledged est vrai, l’outil est en cours ou l’historique ne
  prouve pas l’état encore pendant
- **THEN** CAB ne renvoie pas `once`

### Requirement: Frontière native inconnue protégée

Une opération dont la frontière native reste inconnue MUST conserver son
accès et MUST NOT être libérée sans une preuve terminale corrélée.

#### Scenario: Effet potentiellement lancé

- **WHEN** OpenCode ne prouve ni permission encore pendante ni fin native
- **THEN** CAB conserve l’opération dans un état protégé jusqu’à une preuve
  native terminale

#### Scenario: Résultat natif terminal

- **WHEN** l’historique natif prouve le résultat terminal de la permission et
  de l’outil corrélés
- **THEN** CAB persiste ce résultat et clôt uniquement l’opération concernée
