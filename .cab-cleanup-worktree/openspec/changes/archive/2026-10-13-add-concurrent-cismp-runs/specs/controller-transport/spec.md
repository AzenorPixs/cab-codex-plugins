## ADDED Requirements

### Requirement: Contextes de contrôleur isolés par RUN
Le contrôleur MUST héberger plusieurs contextes de job isolés. Les routes /runs/<runId>/job/... et /runs/<runId>/decision/<requestId> MUST cibler un seul contexte. Une mutation sans cible ambiguë MUST être refusée. Une récupération MUST conserver le propriétaire du change et invalider les anciennes permissions.

#### Scenario: Isolation concurrente
- **WHEN** A possède une validation indécise et B termine
- **THEN** le gate de B ne dépend pas du compteur métier de A
