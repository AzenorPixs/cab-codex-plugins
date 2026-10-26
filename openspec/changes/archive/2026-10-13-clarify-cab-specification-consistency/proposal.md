## Why

L'ACSM du 2026-10-13 constate quinze avertissements OpenSpec pour des textes
d'exigences dépassant 500 caractères : treize dans six références et deux
dans le delta actif de statistiques. Le mode strict échoue pour sept des dix
éléments existants. Par ailleurs, l'inventaire de PROJECT.md omet la capacité
`persistent-job-supervision`, pourtant présente dans les références.

## What Changes

- Répartir les treize exigences longues entre obligations plus courtes et
  scénarios, en conservant chaque obligation, valeur, exception et acteur.
- Rapprocher les deltas actifs concernés après validation du rapprochement
  `reconcile-active-cab-spec-deltas`, sans restaurer un texte ancien.
- Compléter l'inventaire de PROJECT.md avec la supervision durable.
- Conserver les archives closes et les résultats historiques intacts.

## Capabilities

### New Capabilities

Aucune : les nouveaux titres d'exigences découpent des obligations existantes.

### Modified Capabilities

- `approval-persistence` : deux exigences d'indexation.
- `approval-workflow` : corrélation et décision explicite.
- `archive-session-statistics` : collecte et rapport obligatoire.
- `codex-integration-distribution` : commande de pilotage sûre.
- `controller-transport` : validation HTTP, commandes instrumentées, réveil
  corrélé et contrat de job.
- `persistent-job-supervision` : compactage, contrat durable et relance.

## Impact

Six références OpenSpec, les deltas actifs correspondants et l'inventaire
de PROJECT.md lors de l'application. Aucun changement de code, de runtime,
de permission, de délai, de version ou de comportement autorisé. La correction
de l'inventaire documentaire sera isolée des autres modifications dans sa revue.

## Validation et état du travail

Le développeur a validé cette proposition le 2026-10-13. Le travail est appliqué
aux sources et synchronisé avec les références ; les preuves sont consignées
dans tasks.md. Le change reste ouvert. Aucun archivage, incrément de version,
commit, push, déploiement ou installation de profil effectué.
