## MODIFIED Requirements

### Requirement: NO_EFFECT après erreur native sans mutation

`NO_EFFECT` MUST être admis uniquement lorsque les opérations d'écriture
terminales sont prouvées en erreur, aucune écriture réussie ou effet incertain
n'existe et toutes les révisions restent égales aux révisions attendues.
Cette libération MUST NOT avancer une révision ni créer un `pendingWrite`.
Le cas spécifique d’un tour assistant terminal sans appel natif d’effet est
régi par la preuve distincte `NO_EFFECT` d’approval-persistence ; il ne doit
jamais être déduit d’un simple timeout, d’une permission absente ou d’un
journal sans événement.

#### Scenario: Édition native en erreur et révision inchangée

- **WHEN** un edit natif est terminé en erreur, sa preuve correspond à l'opération et la révision de la ressource n'a pas changé
- **THEN** Codex peut décider `NO_EFFECT`, CAB libère l'accès et la révision reste inchangée

#### Scenario: Tour assistant terminal sans appel d’effet

- **WHEN** le contrat de preuve distinct `NO_EFFECT` d’approval-persistence est satisfait
- **THEN** CAB invalide l’accord local et libère l’accès sans avancer les révisions ni créer un `pendingWrite`

#### Scenario: Écriture réussie présentée comme sans effet

- **WHEN** une écriture native est réussie ou sa preuve indique un effet
- **THEN** `NO_EFFECT` est refusé et les gardes de libération existantes restent appliquées

#### Scenario: Révision modifiée ou effet inconnu

- **WHEN** une révision diverge ou qu'une opération reste ISSUING, EXECUTING ou UNKNOWN sans la preuve spécifique d’un tour terminal sans effet
- **THEN** `NO_EFFECT` est refusé et l'accès demeure HELD

#### Scenario: Rejeu exact de la libération

- **WHEN** le même reçu `NO_EFFECT` est rejoué après libération
- **THEN** CAB rend le reçu idempotent sans nouvelle mutation ni jeton brut

