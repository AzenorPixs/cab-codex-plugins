# Retirer les jetons de réservation des lectures CAB

## Why

Les projections GET de réservations de tests incluent actuellement le jeton
bearer détenu dans l'état interne. Un lecteur qui n'a besoin que du statut et
du fencing peut ainsi récupérer une capacité de restitution.

## What Changes

- Retirer les jetons des projections GET `/runs`, `/runs/<id>/status` et
  `/runs/<id>/test-resources` sans modifier l'état interne.
- Garder le jeton dans la réponse de création/réconciliation destinée au
  demandeur autorisé et dans les gardes des mutations POST.
- Vérifier qu'aucune lecture publique ne réexpose le jeton d'une réservation
  active, en attente ou restaurée.

## Out of Scope

- Aucune rotation, annulation, restitution ou migration des réservations actives.
- Aucun changement aux jetons d'accès aux ressources fichier, sauf si les tests
  révèlent un même problème dans le périmètre ciblé.

## Acceptance Criteria

1. Les projections GET de réservation et de snapshot omettent le champ `token`.
2. `POST acquire` et la réconciliation continuent de remettre le jeton au
   demandeur autorisé, avec fencing et gardes inchangés.
3. Les réservations restent utilisables et les réponses ne divulguent aucune
   ancienne valeur de jeton dans les tests.
