## Why

OpenCode peut enrichir une commande soumise à la permission native avec une
instrumentation de sortie sans modifier l'opération demandée. Le contrôleur
CAB compare actuellement la chaîne de commande à l'identique ; cette
instrumentation crée alors une permission non corrélée et empêche la
consommation de la décision `approved`.

## What Changes

- Définir une corrélation de commande qui accepte uniquement l'enveloppe
  d'instrumentation déterministe ajoutée par OpenCode, tout en préservant
  l'égalité stricte pour l'opération métier demandée.
- Conserver le refus de toute commande dont le préfixe métier diffère du
  mandat approuvé, ainsi que l'unicité de consommation de permission.
- Ajouter les scénarios de régression couvrant la commande exacte,
  l'instrumentation OpenCode admise et une transformation non admise.
- Aligner le broker, le contrôleur et le plugin sur la version corrective
  `0.72.1`, puis mettre à jour le CHANGELOG et les cadrages concernés.

## Capabilities

### Modified Capabilities

- `controller-transport` : corréler de façon sûre une permission Bash
  instrumentée par OpenCode à l'unique commande approuvée.

## Impact

- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `tests/controller-configuration.test.mjs`
- `src/cgpt_approval_bridge_server.py`
- `plugins/cab-approval-bridge/.codex-plugin/plugin.json`
- `.agents/plugins/marketplace.json`
- `CHANGELOG.md`, `TECHNICAL.md`, `BUILD.md` et `README.md`
