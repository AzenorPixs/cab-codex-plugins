# Proposal

## Why
Le contrôleur interdit tout remplacement de session, y compris après une récupération sûre d'un écart sans effet. Le RUN CISMP Pixs a atteint ce refus malgré un nouveau prévol réussi. La corrélation stricte peut aussi perdre son verrou quand la session diverge.

## What Changes
- Ajouter une récupération locale explicite en deux phases, sans désarmement ni purge du RUN.
- Conserver le job, le périmètre, les critères, le dernier jalon et strictCommands ; invalider les anciennes autorisations exécutables.
- Vérifier par OpenCode le contexte, l'inactivité, les permissions et les preuves natives du prévol.
- Refuser les validations hors session et geler les relances du superviseur pendant la récupération.
- Désactiver les outils natifs et d'écriture pendant les mandats lecture seule dans le protocole distribué.

## Capabilities
### New Capabilities
Aucune.
### Modified Capabilities
- `controller-transport`: transition contrôlée de session et corrélation stricte.
- `persistent-job-supervision`: suspension pendant une récupération.
- `codex-integration-distribution`: prévention des outils natifs en lecture seule.

## Impact
Contrôleur, superviseur, tests HTTP isolés, commande et skill CAB distribuées, PROJECT, TECHNICAL, BUILD, README et CHANGELOG. Aucun broker, protocole MCP, dépendance, installation, publication, Git ou RUN Pixs modifié. Exception autorisée par le développeur pour ce seul change malgré trois anciens changes ouverts.
