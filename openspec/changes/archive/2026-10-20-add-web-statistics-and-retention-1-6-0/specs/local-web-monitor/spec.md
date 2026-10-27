## MODIFIED Requirements

### Requirement: Observation bornée sans effet métier
Le moniteur MUST collecter seulement les vues GET admises des composants loopback et les documents OpenSpec de son workspace. Il MUST NOT créer de décision, permission, relance, session ou mutation métier. Requêtes et mémoire MUST être bornées ; les collectes MUST NOT se chevaucher. La seule maintenance admise MUST être le relais fixe de purge statistique défini par web-statistics-retention, distinct de l’observation.

#### Scenario: Plusieurs navigateurs
- **WHEN** plusieurs navigateurs consultent le tableau de bord
- **THEN** ils partagent la collecte sans multiplier les sondes vers CAB

#### Scenario: Purge confirmée
- **WHEN** une purge historique est confirmée depuis STATS
- **THEN** le moniteur relaie uniquement l'opération statistique prévue sans accès au runtime privé ni mutation métier
