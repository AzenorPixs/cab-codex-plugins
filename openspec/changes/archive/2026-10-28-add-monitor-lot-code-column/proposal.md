# Colonne codes de lot du moniteur — CAB 2.1.2

## Why
Les tableaux RUN et CHANGE ne permettent pas de repérer directement les codes courts des lots OpenSpec, tels que PA01, PA02, C08, O26 ou B02.

## What Changes
- Ajouter la colonne « codes de lot » en deuxième position dans les tableaux RUN et CHANGE.
- Extraire uniquement le code explicite en tête du premier titre de niveau 1 de proposal.md ; laisser vide sans code identifiable, sans inférence depuis le nom du dossier.
- Corréler le RUN à son change, actif ou archivé référencé, sans modifier les comportements métier, tris, filtres ou actions.
- Incrémenter la base commune CAB de 2.1.1 à 2.1.2, avec cachebuster neuf des plugins.
- Qualifier, synchroniser et archiver ce seul change avec son rapport SCM.

## Capabilities
### Modified Capabilities
- `local-web-monitor` : code de lot explicite dans les deux tableaux.
- `codex-integration-distribution` : base commune 2.1.2.

## Impact
Collecteur monitor-data, interface app.mjs, tests unitaires et navigateur, supports de version courants, README, TECHNICAL, PROJECT, BUILD et CHANGELOG. Aucune dépendance, migration, installation active ou modification de service. Les documents absents, dangereux, sans titre ou sans code donnent une cellule vide. Les documents sont rendus comme texte.

## Autorisation
Périmètre SCM validé pour spécification, implémentation, tests, documentation, archivage, statistiques et clôture Git conditionnelle. Aucun pilotage ni délégation.
