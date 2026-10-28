# Compatibilité PLLM 2/6 et 3/7 — CAB 2.1.4

## Why
Le contrôleur 2.1.3 refuse le catalogue actif schéma 3 contenant sept politiques avec pllm-catalog-invalid. La préparation du CAB test est bloquée avant création de session et de RUN.

## What Changes
- Accepter uniquement les couples schéma 2 / six politiques et schéma 3 / sept politiques, sans relâcher les contrôles actuels.
- Tester la préparation, la sélection de mode7 et les refus de structures incohérentes.
- Distribuer 2.1.4 et documenter la compatibilité ; publication et activation explicitement autorisées.

## Capabilities
### Modified Capabilities
- coding-model-policy: compatibilité stricte des deux formats publics.
- codex-integration-distribution: version commune 2.1.4.

## Impact
Lecteur model-policy, tests, métadonnées de version et documentation. Aucun benchmark ou catalogue réécrit, aucun RUN existant modifié. Après la qualification et l’archive, activation conservant OpenCode puis CAB test dans une nouvelle session et un RUN dédiés.
