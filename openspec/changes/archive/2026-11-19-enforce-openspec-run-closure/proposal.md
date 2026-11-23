# Protéger la clôture des RUN de codage

## Why
Une livraison pouvait marquer CLOSED alors que le change OpenSpec restait actif. La clôture doit représenter l’état réel du change.

## What Changes
- Exiger l’archive et toutes les tâches résolues pour tout change OpenSpec d’un RUN réussi.
- Passer par un arrêt BLOCKED avec BLOCKERS.md pour les dépendances non satisfaites.
- Signaler les anciens RUN incohérents en conservant leurs reçus et leur historique.
