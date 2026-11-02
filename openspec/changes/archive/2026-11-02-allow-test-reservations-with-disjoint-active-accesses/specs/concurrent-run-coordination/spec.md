## ADDED Requirements

### Requirement: Acquisition de test et accès du même RUN

CAB MUST bloquer l'acquisition d'un environnement de test sur un accès normal du même RUN uniquement si ses ressources recouvrent l'environnement demandé. Les accès disjoints HELD, EXECUTING, UNKNOWN ou WAITING MUST rester inchangés et ne MUST NOT bloquer l'acquisition. Un accès recouvrant MUST continuer à bloquer. Cette règle n'accorde aucune permission et ne remplace ni le bail de test ni l'accès requis par une commande.

#### Scenario: Accès actifs disjoints du même RUN

- **WHEN** le RUN possède un accès HELD, EXECUTING, UNKNOWN ou WAITING dont les ressources ne recouvrent pas l'environnement de test demandé
- **THEN** CAB peut réserver cet environnement indépendamment et conserve inchangés tous les accès existants

#### Scenario: Accès actif recouvrant l'environnement demandé

- **WHEN** le RUN possède un accès actif ou en attente dont les ressources recouvrent l'environnement de test demandé
- **THEN** CAB refuse ou diffère la réservation de test sans modifier l'accès existant
