## MODIFIED Requirements

### Requirement: Observation bornée sans effet métier
Le moniteur MUST collecter seulement les vues GET admises des composants loopback et les documents OpenSpec de son workspace. Il MUST NOT créer de décision, permission, relance, session ou mutation métier de RUN. Requêtes et mémoire MUST être bornées ; les collectes MUST NOT se chevaucher. Les seules exceptions de gestion MUST être la purge statistique définie par web-statistics-retention et les commandes de briques et rangement privé définis par monitor-management.

#### Scenario: Plusieurs navigateurs
- **WHEN** plusieurs navigateurs consultent le tableau de bord
- **THEN** ils partagent la collecte sans multiplier les sondes vers CAB

#### Scenario: Rangement du moniteur
- **WHEN** une ligne admissible est archivée
- **THEN** seul le catalogue privé du moniteur change

#### Scenario: Purge confirmée
- **WHEN** une purge historique est confirmée depuis STATS
- **THEN** le moniteur relaie uniquement l'opération statistique prévue sans accès au runtime privé ni mutation métier

## ADDED Requirements

### Requirement: En-tête et navigation de gestion
MONITOR MUST afficher CENTRE D’OBSERVATION comme titre plus grand et gras, sans Tout le travail., Une vue commune. ni leur paragraphe descriptif. ARCHIVES MUST apparaître après MONITOR et STATS. Les trois pages MUST être accessibles au clavier et responsive sans interrompre le flux SSE ni la navigation statistique.

#### Scenario: Consultation des archives
- **WHEN** ARCHIVES est sélectionné puis MONITOR
- **THEN** la page active et son libellé changent et les observations restent actualisées
