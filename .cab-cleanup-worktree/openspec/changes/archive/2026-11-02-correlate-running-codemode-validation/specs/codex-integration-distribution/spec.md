## MODIFIED Requirements

### Requirement: Distribution des diagnostics avant admission 2.1.12

Les composants versionnés CAB MUST partager la base 2.1.65 et documenter les diagnostics de notification, les décisions durables, la corrélation exacte d’un `request_validation` Code Mode en cours, la réconciliation du journal natif et les protections ciblées des opérations concurrentes. Sources, archivage, publication, activation et qualification opérationnelle MUST rester distincts. CABU MUST préserver OpenCode, les RUN et leurs preuves et rapporter les versions réellement chargées avant notification des sessions.

#### Scenario: Distribution et activation vérifiées

- **WHEN** le correctif est qualifié et publié puis sa maintenance coordonnée est exécutée
- **THEN** les quatre briques et commandes cibles sont vérifiées indépendamment des sources et le résultat réel est transmis aux sessions
