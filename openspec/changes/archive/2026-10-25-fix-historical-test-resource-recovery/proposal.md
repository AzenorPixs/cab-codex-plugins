# MAI03 — Compatibilité historique et récupération en avant 1.10.1

## Why
Le contrôleur cible refuse des identifiants logiques de navigateur conservés dans des révisions, opérations terminées et accès libérés avant l'introduction des réservations de test. La maintenance réelle est READONLY_RECOVERY_REQUIRED sous HELD, broker déconnecté ; les données ne doivent pas être réécrites pour contourner ce refus.

## What Changes
- Revenir au contrat générique de lecture des ressources logiques ; conserver la validation canonique stricte dans testResources et l'exigence de réservation avant toute nouvelle permission.
- Qualifier la conservation intégrale des anciennes clés, des opérations et des accès historiques, et le refus des nouvelles réservations non canoniques.
- Fournir une récupération en avant limitée à cette correction du lecteur, sous le même HELD et le même journal : conserver le reçu et les stages initiaux, préparer une nouvelle release immuable et laisser l'updater ordinaire vérifier puis libérer la maintenance.

## Capabilities
### Modified Capabilities
- concurrent-run-coordination : compatibilité des identités historiques sans relâchement des réservations de test.
- active-component-update : révision explicite et vérifiable du code candidat après échec de restauration du contrôleur.

## Impact
runs.mjs, tests de registre, outil ciblé de récupération, tests de récupération, documentation. Base 1.10.1 conservée et cachebuster renouvelé après qualification. Aucun état métier ou ancienne release n'est réécrit. Aucun changement de modèle, migration de données, commit ou push. Le développeur a explicitement validé correction historique et récupération en avant sous le même gel, puis reprise CISMP après vérification.
