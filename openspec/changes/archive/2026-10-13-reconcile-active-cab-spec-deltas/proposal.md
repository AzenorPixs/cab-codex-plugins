# SPE03 — Réconcilier les deltas OpenSpec CAB actifs

## Why

L'ACSM du 2026-10-13 relève deux changes actifs dont les exigences ADDED
existent déjà dans les références : `add-terminal-gate` et
`add-cab-archive-statistics`. Le validateur annonce un refus si leurs deltas
sont appliqués à l'archivage. Le delta statistiques exige encore 0.87.1,
alors que la référence et les composants annoncent 0.87.2. Le delta du gate
ne contient pas le renforcement contre les validations locales indécises.

## What Changes

- Prendre les références actuelles comme base de rapprochement des deltas actifs.
- Convertir seulement les blocs ADDED déjà intégrés en MODIFIED, avec le texte
  complet de la référence et tous ses scénarios ; ne pas restaurer un ancien
  texte de gate ou une ancienne version.
- Aligner la note d'état courant du change statistiques sur 0.87.2 sans
  réécrire ses preuves historiques 0.85.2 ou le constat CGP du 2026-10-10.
- Conserver ouverts les trois changes historiques jusqu'à une décision
  d'archivage propre à chacun.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `controller-transport` : rapprochement du delta actif avec le gate courant.
- `codex-integration-distribution` : version normative commune déjà en vigueur.
- `archive-session-statistics` : rapprochement des trois blocs déjà intégrés,
  sans modification du comportement de collecte ou de clôture.

## Impact

Les deltas actifs de `add-terminal-gate` et `add-cab-archive-statistics`, ainsi
que les seules notes d'état courant de ce dernier. Les deltas de cette nouvelle
proposition reprennent les références concernées sans nouveau comportement.
`add-opencode-model-preflight` est comparé mais ne nécessite pas de correction
sémantique. Aucun code, archive close, service, profil ou élément Git modifié.

## Validation et état du travail

Le développeur a validé cette proposition le 2026-10-13. Le travail est appliqué
aux sources et synchronisé avec les références ; les preuves sont consignées
dans tasks.md. Le change reste ouvert. Aucun archivage, incrément de version,
commit, push, déploiement ou installation de profil effectué.
