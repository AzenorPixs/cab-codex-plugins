## ADDED Requirements

### Requirement: Nouvelle réservation après clôture réconciliée

CAB MUST permettre au même propriétaire de réserver de nouveau son RUN après libération réconciliée. Une suspension historique d'une réservation DELIVERED ou ABANDONED MUST NOT bloquer cette nouvelle génération. CAB MUST conserver la réservation et sa suspension dans l'historique, attribuer une génération et un contexte neufs et MUST NOT transférer une permission ou décision consommée.

#### Scenario: Reprise après arrêt et abandon
- **WHEN** le même propriétaire réserve de nouveau un RUN dont la réservation a été arrêtée puis abandonnée après réconciliation, y compris après redémarrage du contrôleur
- **THEN** CAB crée une réservation sans suspension héritée avec génération et contexte neufs, conserve l'historique arrêté et n'émet aucune permission native par cette seule réservation

#### Scenario: Nouveau change après livraison arrêtée
- **WHEN** le même propriétaire réserve un autre change admissible après STOP et livraison réconciliée de sa réservation précédente
- **THEN** la suspension historique ne bloque pas la nouvelle réservation et le change déjà livré demeure protégé contre une nouvelle réservation

### Requirement: Contrôles préservés lors d'une nouvelle réservation

Les contrôles de propriétaire, de change déjà livré, de dépendances et de ressources MUST rester applicables lors d'une nouvelle réservation. Une suspension PAUSE ou STOP d'une réservation RESERVED ou un gel global actif MUST continuer à bloquer l'admission.

#### Scenario: Propriétaire divergent
- **WHEN** un autre propriétaire tente de réutiliser l'identifiant d'un RUN libéré et arrêté
- **THEN** CAB refuse la réservation sans modifier la génération ni l'historique

#### Scenario: Suspension encore active
- **WHEN** une nouvelle réservation vise un RUN dont la réservation RESERVED reste en PAUSE ou STOP
- **THEN** CAB refuse cette admission sans lever la suspension ni réutiliser une permission

#### Scenario: Gel global pendant la reprise
- **WHEN** un RUN libéré et arrêté tente une nouvelle réservation pendant un gel global actif
- **THEN** CAB refuse l'admission jusqu'à la levée autorisée du gel sans modifier la réservation historique
