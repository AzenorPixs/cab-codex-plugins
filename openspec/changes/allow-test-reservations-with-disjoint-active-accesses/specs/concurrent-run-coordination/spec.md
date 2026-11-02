## MODIFIED Requirements

### Requirement: Réservation durable des environnements de test

CAB MUST réserver atomiquement l'ensemble déclaré des environnements Docker/LXC avant leur préparation. Chaque réservation MUST appartenir à un seul RUN/change et à sa génération. Les identités non secrètes MUST être canoniques pour le même environnement. Les demandes incompatibles MUST attendre en ordre FIFO sans détention partielle ; les environnements indépendants MUST rester utilisables. Cette réservation MUST rester distincte des accès temporaires et des permissions unitaires. Un accès non résolu du même RUN MUST bloquer l'acquisition uniquement lorsqu'il recouvre l'environnement demandé. Les accès HELD, EXECUTING, UNKNOWN ou WAITING disjoints MUST rester inchangés et ne MUST NOT empêcher cette acquisition.

#### Scenario: Deux changes sur le même Docker

- **WHEN** A détient le moteur Docker déclaré et B le demande
- **THEN** B attend sans préparation ni permission sur ce moteur, tandis qu'un test LXC indépendant peut démarrer

#### Scenario: Ensemble Docker et LXC occupé

- **WHEN** A demande Docker et LXC dont un seul est détenu par B
- **THEN** A n'obtient aucun des deux environnements avant disponibilité de l'ensemble

#### Scenario: Accès actifs disjoints du même RUN

- **WHEN** le RUN possède un accès HELD, EXECUTING, UNKNOWN ou WAITING dont les ressources ne recouvrent pas l'environnement de test demandé
- **THEN** CAB peut réserver cet environnement indépendamment et conserve inchangés tous les accès existants

#### Scenario: Accès actif recouvrant l'environnement demandé

- **WHEN** le RUN possède un accès actif ou en attente dont les ressources recouvrent l'environnement de test demandé
- **THEN** CAB refuse ou diffère la réservation de test sans modifier l'accès existant
