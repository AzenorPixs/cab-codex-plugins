## ADDED Requirements

### Requirement: Reprise métier après remplacement exceptionnel du runtime

Après la nouvelle session autorisée pour prévol divergent, l'orchestrateur
MUST réconcilier le checkpoint métier externe, le change attendu, les fichiers
et les preuves natives conservées. Il MUST reprendre au premier jalon non
prouvé, sans rejouer les écritures validées ou autorisations consommées et sans
réadopter l'ancien job. Une preuve manquante MUST NOT devenir un succès ou
autoriser un rejeu aveugle.

#### Scenario: Écriture déjà validée avant l'incident
- **WHEN** le checkpoint et les fichiers prouvent cette écriture après le prévol neuf
- **THEN** le nouveau job poursuit le travail restant sans répéter l'écriture

#### Scenario: Effet non prouvé
- **WHEN** un effet antérieur reste inconnu ou les preuves du checkpoint sont insuffisantes
- **THEN** l'orchestrateur suspend les opérations concernées et demande l'autorité indispensable sans rejouer le travail
