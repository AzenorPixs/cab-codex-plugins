## ADDED Requirements

### Requirement: Identité du RUN concurrent
En mode concurrent, chaque demande MUST inclure run_id, reservation_version et les ressources de commande. Le contrôleur MUST vérifier leur correspondance avec la réservation et la session native avant once. Les interfaces historiques MAY rester disponibles seulement dans un contexte unique.

#### Scenario: Isolation concurrente
- **WHEN** une demande porte une ancienne génération
- **THEN** la permission est refusée sans effet
