## Why

Le changement archivé `establish-project-consistency` affirme un déplacement
du plugin sous `codex/plugin/`, alors que l'arborescence retenue et réellement
utilisée est `cab-codex-plugins/`. Le README présente encore le plugin sous
`.codex/`, ce qui mélange la commande Codex avec l'artefact distribuable.

## What Changes

- Conserver le plugin et sa marketplace sous `cab-codex-plugins/`.
- Déclarer explicitement cette arborescence dans la spécification de
  distribution.
- Corriger l'arborescence du README pour distinguer `.codex/commands/cab.md`
  de `cab-codex-plugins/`.
- Conserver l'archive existante inchangée et la superséder par cette trace
  corrective.

## Impact

`README.md` et la capacité OpenSpec `codex-integration-distribution` sont
mis à jour. Aucun plugin, script, manifeste ou chemin distribué n'est déplacé.
