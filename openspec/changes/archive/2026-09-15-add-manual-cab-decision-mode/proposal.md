## Why

Le contrôleur décide actuellement automatiquement chaque mandat en lançant un
second tour Codex. Cette décision n'a pas le contexte de délégation de la
session orchestrée et peut donc refuser un mandat pourtant validé explicitement
par l'orchestrateur.

## What Changes

- Faire du mode de décision manuelle le comportement par défaut du contrôleur,
  tout en conservant le mode automatique explicite.
- Dans ce mode, conserver une demande corrélée en attente jusqu'à la décision
  explicite envoyée sur l'interface HTTP locale existante.
- Préserver le mode automatique explicite et les protections de corrélation et
  de décision unique.
- Passer le broker, le contrôleur et le plugin CAB à la version `0.69.0`.

## Capabilities

### New Capabilities

- Aucun.

### Modified Capabilities

- `controller-transport`: ajouter la sélection explicite d'un mode manuel et
  son comportement HTTP corrélé.
- `approval-workflow`: garantir qu'une demande manuelle reste PENDING jusqu'à
  une décision corrélée, sans décision implicite.

## Impact

- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `tests/controller-configuration.test.mjs`
- `TECHNICAL.md`
- `README.md` et `CHANGELOG.md`
