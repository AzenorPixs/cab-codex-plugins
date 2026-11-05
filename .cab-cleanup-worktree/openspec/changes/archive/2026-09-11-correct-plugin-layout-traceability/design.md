## Context

CAB contient deux artefacts Codex distincts : la commande d'orchestration
`.codex/commands/cab.md` et le plugin distribuable
`cab-codex-plugins/plugins/cab-approval-bridge/`. La marketplace locale est
`cab-codex-plugins/.agents/plugins/marketplace.json`.

## Decision

Conserver cette séparation. `.codex/` contient la commande Codex versionnée ;
`cab-codex-plugins/` contient la marketplace et le plugin. Aucun déplacement
du plugin n'est nécessaire.

## Traceability

Le changement archivé reste une trace de son exécution passée. Ce changement
correctif établit explicitement l'arborescence faisant autorité, sans réécrire
l'historique archivé.
