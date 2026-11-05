# Prévol natif obligatoire avant récupération CAB adossée à un RUN

## Why

Le prévol RUN échouait lorsqu'une discovery Code Mode était reconnue comme
exécution non corrélée, que `edit:ask` manquait sur la candidate ou que
`request_validation` attendait sans délai fini. Une discovery ajoutée après
le gel faisait en outre diverger la séquence autorisée.

## What Changes

Empêcher le gel d’une candidate de récupération adossée à un RUN tant que la signature exacte
de `request_validation` et ses permissions natives ne sont pas vérifiées.
Empêcher une découverte tardive d’atteindre la validation ou une permission,
et borner l’attente quand une notification ne progresse pas.

## Périmètre

- reconnaitre et sceller une découverte Code Mode littérale de
  `request_validation` avant `phase=prepare` ;
- exiger `shell:ask` et `edit:ask` effectifs avant le gel ;
- refuser tôt toute découverte tardive ou enveloppe `execute` non corrélée ;
- imposer un timeout fini au `request_validation` de récupération ;
- distinguer préparation, notification, décision, once, exécution et readiness.

## Hors périmètre

- aucune modification d’un projet consommateur, de ses fichiers ou checkpoints ;
- le chemin historique des jobs non adossés à un RUN reste compatible ;
- aucun rejeu d’un prévol, d’une permission once ou d’une commande métier ;
- aucune modification du RUN, de son job ou de ses ressources ;
- aucun démarrage ou arrêt OpenCode hors CABU explicitement mandaté.

## Critères d’acceptation

1. Pour un RUN, `prepare` refuse avant le gel toute candidate sans
   `shell:ask`, `edit:ask` ou découverte vérifiée dans `preparationHistory`.
2. Une recherche postérieure au gel est refusée avant notification ou permission.
3. Un timeout termine l’appel avec le même approval ID, sans nouvelle demande.
4. Le chemin positif prouve la commande exacte `/usr/bin/true`, once unique,
   exit 0 et readiness finale avant `complete`. Les jobs historiques sans RUN
   conservent leur chemin existant.
