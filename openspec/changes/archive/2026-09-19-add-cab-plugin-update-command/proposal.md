## Why

La commande `/cab` ne permet pas de vérifier ni d'actualiser le plugin CAB
installé. Une installation peut donc conserver une copie de cache plus ancienne
que celle publiée par sa marketplace.

## What Changes

- Ajouter la sous-commande `/cab update`.
- Comparer la version SemVer de base du plugin installé à celle du manifeste
  résolu depuis la marketplace `cab_codex_plugins`.
- Déléguer une actualisation nécessaire à la commande native Codex
  `codex plugin marketplace upgrade cab_codex_plugins`.
- Aligner le broker, le contrôleur et le plugin sur la version `0.73.0`.

## Capabilities

### Modified Capabilities

- `codex-integration-distribution` : commande d'orchestration CAB et
  actualisation contrôlée du plugin.

## Impact

La commande `/cab`, le broker, le contrôleur, le manifeste du plugin, la
documentation de distribution et le changelog sont concernés. Aucune
configuration Codex, marketplace ou ressource CAB active n'est modifiée.
