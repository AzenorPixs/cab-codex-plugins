## Why

Après une actualisation, le développeur ne dispose pas d'une vue unique des
versions réellement publiées et installées pour les composants CAB.

## What Changes

- Ajouter un résumé systématique des versions en fin de `/cab update`.
- Distinguer les versions GitHub et locales du plugin, du contrôleur, du broker
  actif et de la commande CAB.
- Aligner CAB sur la version `0.84.2`.

## Capabilities

### Modified Capabilities

- `codex-integration-distribution` : restitution des versions lors de
  l'actualisation CAB.

## Impact

La commande `/cab`, le profil Codex, les versions et la documentation sont
concernés. Le résumé est en lecture seule et n'ajoute aucune configuration.
