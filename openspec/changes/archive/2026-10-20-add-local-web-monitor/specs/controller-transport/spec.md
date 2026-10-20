## ADDED Requirements

### Requirement: Configuration publique effective
GET /status MUST exposer configuration.maxCommandLength et configuration.commandLengthUnit avec la limite résolue au démarrage et UTF-16. Les vues historiques, globales et par RUN MUST porter la même valeur sans exposer d'autres variables d'environnement.

#### Scenario: Configuration commune aux RUN
- **WHEN** le contrôleur est configuré avec une limite de 4096
- **THEN** ses statuts historiques, globaux et par RUN annoncent 4096 unités UTF-16

### Requirement: Journal public d'observation
GET /monitor/events MUST exposer un journal borné en mémoire, son identité de démarrage, son compteur et sa couverture. Les événements MUST se limiter aux types, dates, séquences, identifiants corrélés et enums fermés de décision ou d'état natif. Cette lecture MUST rester sans effet sur décisions, permissions, réservations ou relances.

#### Scenario: Demande puis décision
- **WHEN** un mandat reçoit une décision explicite
- **THEN** le journal expose les transitions corrélées sans commande, corps de message ou raison libre et sa lecture ne retransmet aucune permission
