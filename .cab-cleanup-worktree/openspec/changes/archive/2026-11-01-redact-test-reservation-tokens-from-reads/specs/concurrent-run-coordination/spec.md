## ADDED Requirements

### Requirement: Jetons de réservation absents des projections GET
Les projections GET `/runs`, `/runs/<run_id>/status` et
`/runs/<run_id>/test-resources` MUST omettre le jeton bearer des réservations
de test dans tous leurs états. La projection MUST laisser intacts l'état
persistant et les gardes de mutation. Les réponses POST d'acquisition et de
réconciliation peuvent retourner le jeton au demandeur autorisé.

#### Scenario: Lecture d'une réservation détenue ou en attente
- **WHEN** un client lit le statut d'une réservation HELD, WAITING ou restaurée
- **THEN** aucune projection GET ne contient son champ `token`

#### Scenario: Acquisition conserve son retour unitaire
- **WHEN** le demandeur autorisé acquiert ou réconcilie une réservation
- **THEN** la réponse POST peut fournir le jeton nécessaire aux mutations ultérieures

#### Scenario: Projection après restitution
- **WHEN** une réservation est `RELEASED` et relue par l'un des GET protégés
- **THEN** le snapshot conserve les champs non secrets mais omet toujours `token`
