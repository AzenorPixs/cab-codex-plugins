## ADDED Requirements

### Requirement: Reprise avec rapport durable complété

Après une tentative de clôture, CAB MUST pouvoir conserver une version complétée d'un rapport comme copie distincte liée au même RUN après validation du périmètre et de l'intégrité des copies antérieures. Les copies précédentes MUST rester consultables et identifiées comme antérieures. Une reprise inchangée MUST rester idempotente. Une suppression explicite MUST rester prioritaire.

#### Scenario: Rapport complété
- **WHEN** le rapport durable a été complété pour la même archive
- **THEN** CAB conserve les copies précédentes et ajoute la nouvelle version avant la reprise

#### Scenario: Copie antérieure altérée
- **WHEN** une copie antérieure ne correspond plus à son empreinte
- **THEN** CAB refuse la modification de l'archive
