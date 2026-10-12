## Why

Un prévol de récupération refusé parce qu'un champ ou un délai prescrit est
omis conserve correctement le gel de `/job/recover`, mais le protocole limite
la nouvelle session technique au double écart `true` / `change_id`. Le RUN
persistant s'arrête alors malgré des preuves natives d'absence d'effet.

## What Changes

- Étendre la récupération automatique orchestrée aux prévols divergents ou
  incomplets prouvés et refusés avant exécution, dont les champs et délais omis.
- Garder le RUN parent non terminal et renouveler la procédure lorsque les
  mêmes préconditions de sûreté sont à nouveau établies.
- Préserver les refus stricts, les preuves, les gardes de purge et les décisions
  explicites de chaque nouveau prévol ; aucun nouveau pouvoir au broker.
- Aligner les briques versionnées sur 0.87.1, sans déploiement ni publication.

## Capabilities

### Modified Capabilities

- `codex-integration-distribution` : éligibilité, neutralisation et nouveau prévol.
- `persistent-job-supervision` : continuité du RUN et checkpoint de récupération.

## Impact

Protocole local et distribué, référence de purge, cadrages, README, CHANGELOG,
tests de distribution et de refus HTTP, métadonnées de version. Les API,
schémas, outil de purge et règles de permission restent inchangés.

Le développeur a validé ce périmètre, son archivage et son rapport, ainsi que
la coexistence avec les trois changes historiques actifs qui restent intacts.
