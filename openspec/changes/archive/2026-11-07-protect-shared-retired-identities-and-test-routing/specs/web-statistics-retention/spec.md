## ADDED Requirements

### Requirement: Suppression explicite et non réimport d’une copie statistique
Sur demande du développeur, SGS SHALL supprimer la copie des rapports historiques désignés et empêcher leur réimport automatique par empreinte de chemin. Les fichiers métier SHALL rester inchangés. La compaction SHALL retirer les anciennes pages SQLite/WAL après suppression, sans toucher aux mesures des autres contextes.

#### Scenario: Effacement avant archivage d’un chat
- **WHEN** le développeur demande l’absence des données CAB d’un chat clôturé
- **THEN** copies statistiques et archives CAB concernées sont retirées et non réimportées ; les rapports source du projet sont conservés

### Requirement: Conflit natif partiel sans blocage des pairs
Un conflit entre dernières révisions natives de même séquence SHALL être signalé par une couverture partielle et des mesures incertaines N/A, sans supprimer les observations. Une révision native ultérieure SHALL lever ce diagnostic. La purge SHALL ne calculer que les liaisons ciblées ; un conflit d’un pair ne doit pas bloquer son entretien.

#### Scenario: Message natif mutable
- **WHEN** ses outils évoluent sans changement du premier horodatage
- **THEN** les temps natifs des parties servent à ordonner les observations et les contradictions restantes sont explicites, sans total fabriqué
