# CT11 — Prévenir les exécutions natives sans permission CAB

## Why

La réactivation OpenCode par `tools.bash=true` peut remplacer `ask` par
`allow`. Un prévol `/usr/bin/true` approuvé s'exécute alors sans permission
native `once` et bloque la récupération. Le périmètre SCM et la version
1.0.1 ont été explicitement validés par le développeur le 14 octobre 2026.

## What Changes

- Contrôler les règles natives des mandats exécutables des jobs armés avant
  admission, approbation et transmission de `once`.
- Exiger une règle finale applicable au type natif avec pattern `*` et action
  `ask`, ainsi qu'une session et un répertoire corrélés. Refuser les preuves
  absentes, invalides ou indisponibles.
- Contrôler la candidate avant le prévol de récupération.
- Documenter la réactivation `noReply`, le PATCH `ask` vérifié et la génération
  sans nouvelle modification de `tools`.
- Préserver les décisions historiques, la remédiation CISMP3 existante et les
  RUN isolés. Aligner les composants distribués sur 1.0.1.

## Capabilities

### Modified Capabilities

- `controller-transport`: garde natif des jobs armés et du prévol.
- `codex-integration-distribution`: réactivation sûre et distribution 1.0.1.

## Impact

Contrôleur, tests de permissions/récupération/concurrence, skill, commande
distribuée, versions source, documentation. Aucun déploiement ni changement
d'état des RUN actifs, aucune dépendance ou migration. Les validations sans
job armé conservent leur compatibilité. Les règles spécifiques sans règle
finale globale `ask` sont volontairement refusées pour les jobs armés.
