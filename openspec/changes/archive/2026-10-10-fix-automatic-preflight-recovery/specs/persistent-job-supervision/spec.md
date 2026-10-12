## MODIFIED Requirements

### Requirement: Reprise métier après remplacement exceptionnel du runtime

Après le prévol neuf, l'orchestrateur MUST réconcilier checkpoint métier,
change, fichiers et preuves natives, puis reprendre au premier jalon non
prouvé. Il MUST NOT rejouer écritures validées ou autorisations consommées,
réadopter l'ancien job, déduire un succès d'une preuve absente ni rejouer
aveuglément. Le RUN parent MUST rester non terminal pendant les récupérations
admissibles.

#### Scenario: Écriture déjà validée avant l'incident
- **WHEN** le checkpoint et les fichiers prouvent cette écriture après le prévol neuf
- **THEN** le nouveau job MUST poursuivre le travail restant sans répéter l'écriture

#### Scenario: Effet non prouvé
- **WHEN** un effet antérieur reste inconnu ou les preuves du checkpoint sont insuffisantes
- **THEN** l'orchestrateur MUST suspendre les opérations concernées et demander l'autorité indispensable sans rejouer le travail

#### Scenario: Récupérations sûres répétées
- **WHEN** plusieurs prévols successifs divergent sans effet et chaque frontière est réconciliée
- **THEN** l'orchestrateur MUST renouveler les tentatives sans limite tant que les préconditions restent prouvées, sans concurrence ni doublon d'une tentative non réconciliée, avec suivi à la cadence existante sans boucle serrée
- **AND** le checkpoint non secret MUST tracer numéro, identifiants, horodatages, cause, arguments attendus et observés et références des preuves natives de chaque tentative

#### Scenario: Interruption ou arrêt explicite
- **WHEN** une interruption laisse une tentative non réconciliée ou le développeur demande l'arrêt
- **THEN** l'orchestrateur MUST interrompre la reprise automatique sans lancer de tentative supplémentaire avant réconciliation ou nouvelle autorisation appropriée

#### Scenario: Purge incomplète
- **WHEN** l'outil de purge échoue ou un état est recréé pendant la procédure
- **THEN** l'orchestrateur MUST NOT démarrer de nouvelle session sur cet état et MUST demander l'autorité indispensable
