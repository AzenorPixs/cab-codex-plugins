## REMOVED Requirements
### Requirement: Reprise métier après remplacement exceptionnel du runtime
**Reason**: Aucun remplacement de runtime après prévol divergent.
**Migration**: Conserver le même job, ses preuves et la candidate.

## ADDED Requirements
### Requirement: Reprise métier après prévol corrigé dans la même session
L'orchestrateur MUST conserver le RUN, le job, les jalons, critères et preuves pendant les retries du prévol dans la candidate conservée. Il MUST reprendre seulement après complete au premier jalon non prouvé sans rejouer écriture validée ou autorisation consommée. Le superviseur MUST rester gelé pendant retry.

#### Scenario: Tentatives successives
- **WHEN** les prévols divergent sans effet et chaque frontière est réconciliée
- **THEN** les nouvelles tentatives explicites conservent la candidate et le job, sans concurrence ni doublon, avec suivi à la cadence existante
- **AND** le checkpoint conserve numéro, identifiants, horodatages, causes et références des preuves natives

#### Scenario: Reprise sûre
- **WHEN** le prévol corrigé est prouvé et complete réussit
- **THEN** le superviseur suit la candidate devenue session du job sans rejeu du travail prouvé

#### Scenario: Interruption ou arrêt explicite
- **WHEN** une tentative reste non réconciliée ou le développeur demande l'arrêt
- **THEN** aucune tentative supplémentaire ne part avant réconciliation ou autorisation appropriée
