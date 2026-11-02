## ADDED Requirements

### Requirement: Prouver le rejet natif dont la notification a échoué

Le contrôleur MUST accepter cette preuve seulement pour la validation enregistrée exacte et son rejet terminal natif `CGPT`. Deux lectures du transcript complet MUST être identiques et contenir les mêmes identités RUN/job/session/change/operation/request/approval. La session MUST être inactive, sans permission, accès ni `once`.

#### Scenario: Notification échouée après rejet natif confirmé

- **GIVEN** une opération `PREPARED` exacte et un transcript stable contenant une demande, un rejet explicite `CGPT` puis une lecture terminale `REJECTED`
- **WHEN** le contrôleur restaure les opérations du RUN
- **THEN** il reconnaît le rejet terminal correspondant à l’opération déjà enregistrée

#### Scenario: Transcript divergent ou effet courant

- **GIVEN** un transcript instable, une identité divergente, une permission ou session active, un outil additionnel ou un effet possible
- **WHEN** le contrôleur tente la réconciliation
- **THEN** il conserve l’opération et la validation indécises sans modifier les accès ni créer de permission

### Requirement: Persister le rejet natif réconcilié

Après preuve native valide, le contrôleur MUST persister atomiquement le rejet et son empreinte, annuler l’opération `PREPARED` et retirer uniquement cette validation du compteur indécis. Le même reçu MUST être restaurable idempotemment après redémarrage. Aucun appel natif, accès, permission ou `once` ne peut en découler.

#### Scenario: Reprise idempotente après redémarrage

- **GIVEN** le rejet et son empreinte sont persistés avec le même transcript toujours stable
- **WHEN** le contrôleur restaure le RUN
- **THEN** il restaure la décision locale sans écriture divergente ni appel natif
