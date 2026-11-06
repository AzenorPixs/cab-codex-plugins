## ADDED Requirements

### Requirement: Jetons des accès de travail absents des consultations publiques
Les GET `/runs`, `/runs/<run_id>/status`, `/runs/<run_id>/locks` et `/coordination/global`, ainsi que les autres projections publiques de la même liste d’accès, SHALL omettre `token` quel que soit l’état de l’accès. Cette projection SHALL préserver le registre persistant et les gardes. Les POST d’acquisition et de réconciliation autorisés SHALL conserver le retour unitaire du jeton au propriétaire. Le diagnostic SHALL ne pas utiliser une lecture GET comme récupération de capacité.

#### Scenario: Accès actif ou restauré consulté
- **WHEN** un accès HELD, EXECUTING ou restauré est consulté par GET
- **THEN** identités, ressources et fencing restent visibles mais le jeton est absent et inchangé dans le registre

#### Scenario: Mutation propriétaire après diagnostic
- **WHEN** le propriétaire conserve le jeton reçu par POST et les preuves requises
- **THEN** la libération normale reste possible sous les gardes existantes, sans nouvelle once ni décision
