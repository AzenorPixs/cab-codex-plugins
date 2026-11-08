## ADDED Requirements

### Requirement: Clôture directe ciblée

La clôture directe MUST identifier exactement projet, change, RUN et session et sélectionner seulement la liaison SGS directe correspondante. Elle MUST préserver les autres liaisons, checkpoints et incidents. La cible MUST être fermée, sans outbox en attente, et couverte par un rapport durable à jour. Le reçu MUST être idempotent.

#### Scenario: Liaisons de plusieurs RUN
- **WHEN** une session directe clôturée partage un change avec des sessions d'autres RUN
- **THEN** seule sa liaison est purgée après preuve durable et les liaisons et checkpoints pairs restent inchangés

#### Scenario: Pair actif sur le même RUN
- **WHEN** une autre liaison du même RUN est encore active
- **THEN** la clôture refuse sans purger ni nettoyer l'atelier partagé

#### Scenario: Historique piloté du même RUN
- **WHEN** une ancienne liaison pilotée du même RUN existe
- **THEN** la clôture refuse tant que l'autorité sur l'atelier partagé n'est pas qualifiée, même si la fenêtre statistique est fermée

#### Scenario: Outbox non drainée
- **WHEN** des éléments de la liaison cible restent en outbox
- **THEN** la purge refuse sans supprimer ces éléments ni modifier les pairs
