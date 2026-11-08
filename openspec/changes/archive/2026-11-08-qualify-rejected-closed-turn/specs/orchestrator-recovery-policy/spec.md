## ADDED Requirements

### Requirement: Rejet confirmé après un tour terminé sans effet

CAB MAY retirer une préparation rejetée dont le tour natif s’est terminé sans effet avant le rejet, si le rejet durable précède le tour utilisateur suivant et si une observation native ultérieure confirme la même identité. Les contrôles de propriétaire, session, permissions, double observation et absence d’émission MUST rester applicables. Les tours et opérations suivants MUST rester inchangés.

#### Scenario: Rejet enregistré entre deux tours
- **WHEN** le tour initial est terminé sans effet, le rejet durable précède le tour suivant et une lecture native ultérieure confirme ce rejet exact
- **THEN** le retrait ciblé peut être qualifié sans attribuer les appels du tour suivant à la préparation rejetée

#### Scenario: Rejet tardif ou effet initial
- **WHEN** le rejet est postérieur au début du tour suivant ou qu’un effet initial est inconnu
- **THEN** cette preuve alternative est refusée et les protections restent inchangées

#### Scenario: Confirmation étrangère ou instable
- **WHEN** l’identité du rejet diffère ou que les deux observations divergent
- **THEN** aucun retrait n’est appliqué
