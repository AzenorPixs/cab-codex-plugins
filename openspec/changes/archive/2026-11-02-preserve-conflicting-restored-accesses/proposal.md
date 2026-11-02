# Préserver les accès restaurés qui se chevauchent

## Why

La restauration du contrôleur refuse actuellement tout registre contenant plusieurs accès actifs du même RUN ou des ressources recouvrantes. Ces accès sont déjà durables ; leur présence doit garder les ressources protégées sans faire échouer tout le service.

## What Changes

Accepter les accès actifs restaurés, les marquer comme non réutilisables pour `once`, maintenir les conflits en `WAITING` et laisser avancer les accès disjoints. Chaque accès restauré conserve sa frontière de réconciliation.

## Non-Goals

- Libérer, fusionner ou annuler un accès restauré.
- Rejouer une permission ou modifier les opérations du RUN.
- Relancer le contrôleur hors du cycle CABU autorisé.

## Verification

Tester la restauration d’accès conflictuels, l’interdiction de réutiliser `once`, l’attente des conflits et la progression des ressources disjointes.
