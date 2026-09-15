## Why

Le contrôleur CAB ne doit pas connaître les projets qu'il pilote. Une liste de
workspaces intégrée au code rendrait CAB spécifique à certains projets et
empêcherait son emploi universel.

## What Changes

- Accepter toute racine de projet absolue fournie par `OC_Codex_WORKSPACE`.
- Préserver le refus des valeurs absentes ou relatives, l'exécution hors
  sandbox déclarée et l'interface HTTP loopback.
- Aligner le broker, le contrôleur et le plugin CAB sur la version `0.69.1`.
- Mettre à jour les spécifications, cadrages et tests directement concernés.

## Capabilities

### Modified Capabilities

- `controller-transport` : rendre le workspace de projet générique sans liste
  de projets codée en dur.

## Impact

- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `src/cgpt_approval_bridge_server.py`
- `plugins/cab-approval-bridge/.codex-plugin/plugin.json`
- `tests/controller-configuration.test.mjs`
- `openspec/specs/controller-transport/spec.md`
- `TECHNICAL.md`, `BUILD.md`, `README.md` et `CHANGELOG.md`
