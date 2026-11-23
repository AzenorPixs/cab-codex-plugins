## ADDED Requirements

### Requirement: Reprise d’une instance dont l’exécutable a été remplacé
CABU MUST conserver l’identité noyau de l’instance ciblée et vérifier le chemin de son binaire installé avant relance. Il MUST préserver les effets incertains et les anciens reçus.

#### Scenario: Ancien exécutable marqué supprimé par Linux
- **WHEN** le processus graphique conserve l’ancien inode et que le binaire de remplacement est installé à un chemin système protégé
- **THEN** CAB conserve l’identité du processus à arrêter et utilise le binaire de remplacement pour sa relance

#### Scenario: Nouveau paquet après une reprise non commencée
- **WHEN** le même demandeur demande la reprise d’une version plus récente déjà installée et vérifiée
- **THEN** CAB peut libérer le créneau du reçu antérieur bloqué si aucun redémarrage n’a été engagé, et conserve le reçu initial
