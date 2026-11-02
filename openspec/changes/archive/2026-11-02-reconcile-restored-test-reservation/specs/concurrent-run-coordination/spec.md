## ADDED Requirements

### Requirement: Réconcilier un bail de test restauré sans l’ancien token

Après redémarrage, CAB MAY renouveler le token et le fencing d’un bail de test
`HELD` restauré sans recevoir son ancien token, uniquement depuis un prévol
scellé et une frontière native stable. Le bail et ses ressources MUST rester
`HELD` ; aucune commande ni permission `once` MUST être émise.

#### Scenario: Propriétaire réconcilie le même bail utilisé

- **WHEN** le RUN propriétaire présente le digest du prévol exact, le transactionId, la version, le fencing et un reconciliationId neuf ; toutes les opérations liées sont terminales et prouvées, la session est idle et aucune permission n’est pendante
- **THEN** CAB renouvelle token/fencing, conserve la même réservation `HELD`, inscrit un reçu idempotent et ne divulgue pas de token dans le prévol, les logs ou le checkpoint

#### Scenario: Réservation inutilisée mais restauration non prouvée

- **WHEN** le bail reste restauré mais son token initial est absent
- **THEN** CAB ne le libère pas comme inutilisé et exige les gardes de réconciliation du bail utilisé

#### Scenario: Effet, permission ou activité incertaine

- **WHEN** une opération liée reste `ISSUING`, `EXECUTING` ou `UNKNOWN`, la session est active, une permission existe, ou le digest/version/fencing divergent
- **THEN** CAB refuse la mutation, conserve le bail `HELD` et ne renvoie aucun token

#### Scenario: Rejeu du même reçu

- **WHEN** le même reconciliationId et le même digest sont rejoués pour le même RUN et le même bail
- **THEN** CAB rend le même reçu sans nouveau fencing ni nouvelle mutation

#### Scenario: Réconciliation d’un bail différent

- **WHEN** un autre RUN, contexte, transaction ou ensemble de ressources est présenté
- **THEN** CAB refuse le reçu et conserve le bail d’origine

### Requirement: Réacquérir le token d’un bail restauré utilisé

Le propriétaire MAY renouveler un token de test `HELD` restauré sans fournir
son ancien token si un prévol non secret exact et une preuve native stable
confirment le même RUN, session et lease. Le bail MUST rester `HELD`.

#### Scenario: Réconciliation owner-scoped du bail utilisé

- **WHEN** un `boundaryDigest` read-only correspond au bail `HELD` restauré, le `transactionId`, version, fencing et `reconciliationId` sont exacts, toutes les opérations liées sont terminales, la session est idle et aucune permission n’est pendante
- **THEN** CAB renouvelle le token/fencing du même bail, retourne le bail uniquement au propriétaire et retire `reconciliationRequired` sans lancer ni libérer de ressource

#### Scenario: Effet natif ou frontière instable

- **WHEN** une opération liée est `ISSUING`, `EXECUTING` ou `UNKNOWN`, une permission ou activité apparaît, ou le boundaryDigest change
- **THEN** CAB ne renouvelle pas le token et garde le bail `HELD` avec `reconciliationRequired=true`

#### Scenario: Token absent du prévol

- **WHEN** un prévol est demandé ou relu en GET
- **THEN** CAB retourne les identités, ressources, états et boundaryDigest sans token, contenu de commande ou sortie native

#### Scenario: Rejeu du reçu exact

- **WHEN** le même reconciliationId et le même payload de propriétaire sont rejoués après succès
- **THEN** CAB retourne le bail renouvelé au même RUN sans incrémenter une seconde fois le fencing

#### Scenario: Événement d’un tour ultérieur read-only

- **WHEN** une lecture read-only possède son propre message après le tour assistant terminal prouvé
- **THEN** CAB garde la preuve `NO_EFFECT` limitée au tour d’origine et n’assimile pas l’événement ultérieur à un effet dans ce tour

### Requirement: Recovery locale terminale indépendante de l’admission métier

La revalidation d’un candidat `NO_EFFECT` déjà approuvé MAY poursuivre
l’admission uniquement pour relire l’identité existante. Elle MUST NOT créer
une opération ni un accès et reste soumise au contrat de preuve terminale.

#### Scenario: Bail de test disjoint encore restauré

- **WHEN** une opération `UNKNOWN` existante est approuvée, son accès unique concerne un fichier, la preuve terminale `NO_EFFECT` est complète et un bail de test disjoint attend sa réconciliation
- **THEN** CAB peut clôturer uniquement l’accès fichier sans permission, sans `once` et sans modifier le bail de test

#### Scenario: Candidate différent ou effet natif présent

- **WHEN** la récupération ne vise pas l’opération UNKNOWN approuvée exacte, ou que permission, callID, résultat natif, once ou ressource non fichier est présent
- **THEN** CAB conserve les gardes d’admission et refuse la voie locale
