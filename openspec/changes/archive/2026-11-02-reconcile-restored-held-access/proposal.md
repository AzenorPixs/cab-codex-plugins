# Réconcilier un accès HELD restauré après redémarrage

## Why

Après redémarrage, CAB restaure un accès `HELD` et son opération terminée, mais
le contexte local peut ne plus contenir la décision approuvée. Le rejeu exact
de `/locks/acquire` est alors refusé, même si le ledger durable, l’historique
natif, les révisions et la session confirment le même accès.

## What Changes

- Ajouter un prévol non secret et une réconciliation owner/RUN-scoped d’un
  accès `HELD` restauré dont toutes les opérations sont terminales et prouvées.
- Renouveler token/fencing sur le même accès, sans libérer ou étendre les
  ressources, émettre une permission ni rejouer `once`.
- Refuser tout accès `UNKNOWN`/`EXECUTING`, permission active, preuve divergente,
  révision modifiée, accès recouvrant ou contexte non quiescent.

## Out of Scope

- L’opération shell `-03` avec effet possible ou callID/once consommé.
- Libérer un accès, lancer une commande métier ou autoriser une nouvelle
  opération.
- Réinitialiser OpenCode, le broker ou les RUN.
