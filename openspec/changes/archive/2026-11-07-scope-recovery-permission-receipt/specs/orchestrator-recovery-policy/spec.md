## ADDED Requirements

### Requirement: Preuve ciblée de rejet natif
Pour un retrait qualifié, CAB MAY lire le reçu de rejet identifié explicitement par workspace, session et permission. La même identité SHALL être liée à la frontière observée et aux deux lectures de l'action. Le reçu ciblé SHALL être intègre et satisfaire tous les contrôles natifs existants. Les autres reçus inconnus SHALL rester conservés ; aucune décision ni permission SHALL être rejouée.

#### Scenario: Reçu exact valide et enveloppe étrangère invalide
- **WHEN** le propriétaire fournit l'identité exacte d'un reçu valide et qu'une autre enveloppe est illisible
- **THEN** le reçu exact peut être vérifié pour la seule action ciblée sans modifier l'enveloppe étrangère

#### Scenario: Reçu exact absent ou divergent
- **WHEN** le reçu exact est absent, invalide ou ne correspond pas aux preuves natives de l'opération
- **THEN** le retrait est refusé et les protections restent en place
