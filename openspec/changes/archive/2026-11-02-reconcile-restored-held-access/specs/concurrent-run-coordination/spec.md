## ADDED Requirements

### Requirement: Réconcilier un accès HELD restauré sans replay d’acquisition

Après redémarrage, le propriétaire MAY rebind un accès `HELD` uniquement par
une frontière scellée, les décisions durables exactes, des fins natives
terminales et une session quiescente. CAB MUST garder le même accès et les
mêmes ressources HELD, sans nouvel accès, effet, permission ou `once`.

#### Scenario: Accès terminal restauré avec décision persistée

- **WHEN** le prévol owner/RUN-scoped correspond au digest actuel, toutes les opérations liées sont terminales, les décisions approved sont dans le ledger, les révisions sont inchangées, la session est idle et aucune permission n’existe
- **THEN** CAB renouvelle token/fencing du même accès HELD et enregistre un reçu idempotent

#### Scenario: Contexte de décision local absent après redémarrage

- **WHEN** la décision locale n’est plus en mémoire mais le même requestId/opération portent la décision approved durable exacte
- **THEN** CAB peut réconcilier cet accès existant sans créer une décision, une permission ou un nouvel accès

#### Scenario: Opération incertaine, permission ou frontière divergente

- **WHEN** une opération est `ISSUING`, `EXECUTING` ou `UNKNOWN`, une permission existe, les révisions changent ou le digest d’accès diverge
- **THEN** CAB conserve l’accès HELD/UNKNOWN et refuse la réconciliation

#### Scenario: Accès recouvrant ou effet C12 `-03`

- **WHEN** une ressource recouvre un autre accès actif ou un shell reste `EXECUTING` avec une fin native absente
- **THEN** CAB garde toutes les protections et n’attribue aucune fin ni nouveau `once`

#### Scenario: Rejeu exact du reçu

- **WHEN** le même reconciliationId et le même digest sont rejoués pour le même owner, RUN et accès
- **THEN** CAB rend le reçu sans changement supplémentaire de fencing
