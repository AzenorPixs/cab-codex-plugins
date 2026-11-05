## ADDED Requirements

### Requirement: Attribution des mesures concurrentes
Le rapport de chaque change MUST identifier RUN et sessions. Les mesures partagées, notamment le quota de compte, MUST être marquées partagées et MUST NOT être attribuées exclusivement au change sans preuve. La publication du rapport MUST précéder la libération normale de la réservation.

#### Scenario: Isolation concurrente
- **WHEN** deux RUN utilisent le même quota
- **THEN** chaque rapport distingue sa télémétrie et la variation globale du compte
