## Why

L'actualisation de CAB ne couvre actuellement que le plugin marketplace. La
commande `/cab` installée dans le profil Codex peut donc rester plus ancienne
que sa référence distribuée par GitHub.

## What Changes

- Versionner explicitement la commande `/cab` dans son frontmatter.
- Comparer la copie de profil à `.codex/commands/cab.md` de
  `AzenorPixs/cab-codex-plugins`, branche `main`.
- Remplacer atomiquement cette copie seulement lorsqu'une version GitHub SemVer
  strictement plus récente est disponible.
- Aligner CAB sur la version `0.84.0`.

## Capabilities

### Modified Capabilities

- `codex-integration-distribution` : actualisation contrôlée de la commande
  CAB du profil Codex.

## Impact

La commande source, sa copie de profil, les versions, la documentation et la
spécification d'intégration sont concernés. Le dépôt GitHub est seulement lu ;
aucun push, aucune modification de configuration et aucune ressource CAB en
cours ne sont affectés.
