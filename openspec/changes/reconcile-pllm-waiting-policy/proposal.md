## Why

Les références courantes prescrivent à la fois des réessais PLLM illimités
toutes les trente minutes et l'attente d'une instruction humaine sans réessai
automatique. Le checkpoint et le renvoi statistique conservent l'ancienne
boucle, tandis que le contrôle documentaire ne compare pas ces références.

## What Changes

- Réconcilier l'attente, le checkpoint et la reprise PLLM avec la politique
  distribuée : choix conservé pendant la session et absence de réessai
  automatique sans politique admissible.
- Conserver les preuves historiques et neutraliser les anciennes échéances
  comme déclencheurs automatiques, sans modifier de format persistant.
- Retirer le renvoi statistique aux tentatives illimitées et contrôler les
  trois spécifications courantes avec les supports CAB.
- Compléter le contrôle documentaire et le changelog, sans modifier le runtime.

## Capabilities

### Modified Capabilities

- `persistent-job-supervision` : attente humaine, checkpoint et reprise sûre.
- `archive-session-statistics` : séparation des sondes et de l'attente PLLM.
- `codex-integration-distribution` : contrôle documentaire croisé des règles PLLM.

## Impact

Spécifications courantes, test documentaire existant et changelog seulement.
Aucune dépendance, migration, modification de composant, activation ou action
Git. Les cadrages et supports décrivent déjà la politique retenue et restent
inchangés. Les archives historiques sont préservées.

## Autorisation et clôture

Le développeur a validé l'axe 1 de l'ACSM puis demandé SCM avec les validations
applicables, sans modification des archives ni activation de composant.
Cette restriction prévaut sur l'archivage de clôture habituel de SCM : ce
change reste actif après réconciliation et validation. Aucun rapport d'archive,
commit ou push conditionné à un archivage n'est déclenché.
