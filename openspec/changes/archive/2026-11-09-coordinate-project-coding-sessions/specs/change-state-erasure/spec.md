## ADDED Requirements

### Requirement: Effacement ciblé de la coordination des dépendances
Après preuve de clôture applicable, la coordination MUST retirer les données propres à la session ciblée et conserver les avis encore nécessaires aux pairs. Une référence de pair non libérée ou un effet natif non réconcilié MUST empêcher d'annoncer l'effacement complet. La reprise MUST utiliser le même reçu sans rejouer l'effet.

#### Scenario: Preuve nécessaire à un pair
- **WHEN** une session close a émis un avis encore conservé par un pair
- **THEN** l'avis et les seules références nécessaires sont préservés et le nettoyage reste incomplet
- **AND** le pair seul peut libérer sa copie après vérification de ses critères

#### Scenario: Répétition après libération
- **WHEN** tous les pairs ont libéré leurs copies et le même reçu est repris
- **THEN** les données propres à la cible sont retirées sans modifier les autres sessions
- **AND** un reçu non identifiant permet une répétition idempotente

### Requirement: Vérification du journal de coordination
Après projection ciblée, CAB MUST vérifier que les anciennes données ne subsistent pas dans le journal SQLite avant de déclarer l'effacement complet. Un lecteur ou une indisponibilité empêchant cette vérification MUST laisser le nettoyage reprenable et signalé comme incomplet, sans bloquer ou purger les autres RUN.

#### Scenario: Lecteur concurrent
- **WHEN** un lecteur empêche la troncature sûre du journal
- **THEN** la cible reste en nettoyage incomplet et le même reçu peut être réessayé
