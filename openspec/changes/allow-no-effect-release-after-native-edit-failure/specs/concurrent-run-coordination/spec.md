## ADDED Requirements

### Requirement: Issue native distincte de la fin technique

Le ledger MUST conserver pour chaque opération terminale l'issue native `completed` ou `error`, corrélée à une preuve unique du transcript. Une issue absente, dupliquée, divergente ou non relue pour une opération historique MUST conserver l'accès HELD.

#### Scenario: Fin native en erreur

- **WHEN** le transcript natif prouve un outil terminé en erreur pour l'opération corrélée
- **THEN** le ledger garde l'état terminal technique et persiste séparément l'issue `error`

#### Scenario: Opération historique sans issue

- **WHEN** une opération terminale existante n'a pas d'issue native persistée
- **THEN** CAB relit une partie native unique correspondant à l'empreinte existante avant toute libération

#### Scenario: Transcript absent ou divergent

- **WHEN** la preuve native est absente, dupliquée ou différente du digest enregistré
- **THEN** CAB refuse la classification et conserve l'accès HELD

### Requirement: NO_EFFECT après erreur native sans mutation

`NO_EFFECT` MUST être admis uniquement lorsque les opérations d'écriture terminales sont prouvées en erreur, aucune écriture réussie ou effet incertain n'existe et toutes les révisions restent égales aux révisions attendues. Cette libération MUST NOT avancer une révision ni créer un `pendingWrite`.

#### Scenario: Édition native en erreur et révision inchangée

- **WHEN** un edit natif est terminé en erreur, sa preuve correspond à l'opération et la révision de la ressource n'a pas changé
- **THEN** Codex peut décider `NO_EFFECT`, CAB libère l'accès et la révision reste inchangée

#### Scenario: Écriture réussie présentée comme sans effet

- **WHEN** une écriture native est réussie ou sa preuve indique un effet
- **THEN** `NO_EFFECT` est refusé et les gardes de libération existantes restent appliquées

#### Scenario: Révision modifiée ou effet inconnu

- **WHEN** une révision diverge ou qu'une opération reste ISSUING, EXECUTING ou UNKNOWN
- **THEN** `NO_EFFECT` est refusé et l'accès demeure HELD

#### Scenario: Rejeu exact de la libération

- **WHEN** le même reçu `NO_EFFECT` est rejoué après libération
- **THEN** CAB rend le reçu idempotent sans nouvelle mutation ni jeton brut
