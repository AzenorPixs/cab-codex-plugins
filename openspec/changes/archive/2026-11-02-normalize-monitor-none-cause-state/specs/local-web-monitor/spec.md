## ADDED Requirements

### Requirement: Sentinelle de cause sans blocage

Le moniteur MUST interpréter la sentinelle `NONE` comme l'absence de cause et MUST NOT la convertir en `BLOCKED`. Les causes réelles, états de readiness, pending et gates MUST garder leur effet courant.

#### Scenario: RUN sain avec cause NONE

- **WHEN** un RUN est `RESERVED`, readiness `READY`, cause `NONE`, pending nul et sans blocker
- **THEN** sa cause projetée est absente et son état opérationnel n'est pas `BLOCKED`

#### Scenario: Cause réelle conservée

- **WHEN** un RUN possède la cause réelle `resource-effects-unknown`
- **THEN** le moniteur le maintient `BLOCKED`
