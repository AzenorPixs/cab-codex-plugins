# OBS02 — Supervision web locale CAB

## Why

CAB expose ses états par HTTP mais ne fournit pas de vue web commune. Je veux
suivre les briques, les RUN et leurs changes sans solliciter un LLM, y compris
lorsqu'un composant devient indisponible.

## What Changes

- Ajouter CAB Monitor, processus local indépendant et interface moderne,
  responsive et actualisée par SSE, port configurable 8790 par défaut.
- Afficher santé, fraîcheur, RUN, changes, tâches cochées, phase observée,
  mandats, attentes, gates et chronologie filtrée.
- Exposer la limite effective du contrôleur, 16 384 unités UTF-16 par défaut,
  ainsi que des événements d'observation filtrés sans effet métier.
- Distribuer les sources et un modèle de service indépendant, sans installation.
- Aligner les briques courantes sur 1.5.0, sans migration de runtime.

## Capabilities

### New Capabilities
- `local-web-monitor`: collecte indépendante, interface et flux temps réel.

### Modified Capabilities
- `controller-transport`: configuration effective et événements publics filtrés.
- `codex-integration-distribution`: moniteur indépendant et version 1.5.0.
- `concurrent-run-coordination`: référence de version courante.
- `native-session-statistics`: référence de version courante.

## Impact

Modules distribués, interface web, modèle systemd, tests, cadrages et documentation.
Les contrats MCP, permissions once, décisions, verrous, schémas et services
actifs restent préservés. Aucun ajout de dépendance, publication ou Git.
