## MODIFIED Requirements

### Requirement: Distribution des diagnostics avant admission 2.1.12

Les composants CAB MUST partager la base 2.1.76 et documenter la corrélation de
`request_validation`, les décisions durables, la reprise native et l’isolation
des opérations. Source, archivage, publication et activation MUST rester
distincts. CABU MUST préserver OpenCode, les RUN et leurs preuves, puis vérifier
les versions actives.

#### Scenario: Distribution et activation vérifiées

- **WHEN** le correctif est qualifié et publié puis sa maintenance coordonnée est exécutée
- **THEN** les quatre briques et commandes cibles sont vérifiées indépendamment des sources et le résultat réel est transmis aux sessions

