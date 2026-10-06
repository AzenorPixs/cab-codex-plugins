## Why

Un nouveau démarrage CAB réutilise actuellement les approbations et le journal
de sessions antérieures. Des conflits Syncthing peuvent rendre ces deux états
incohérents et bloquer le prévol avant tout travail. Le développeur demande
une purge complète à chaque nouvelle session et une version commune 0.86.5.

## What Changes

- Purger les seuls répertoires d'état technique CAB avant une nouvelle session,
  sans lire ni restaurer leur ancien contenu, y compris les conflits Syncthing.
- Vérifier l'inactivité OpenCode, arrêter la supervision CAB, déconnecter le
  broker par son API native et vérifier son verrou avant toute suppression.
- Conserver la persistance pendant un RUN et sa reprise ; refaire la readiness
  réelle et le test CAB après une purge réussie.
- Distribuer un outil de purge avec le plugin et aligner AGENTS, la skill,
  `/cab start`, les cadrages et la documentation.
- Porter broker, contrôleur, superviseur, plugin, commande et métadonnées du
  projet de 0.86.4 à 0.86.5, sans publication.

## Capabilities

### Modified Capabilities

- `approval-persistence` : durée de vie de la persistance limitée au RUN.
- `codex-integration-distribution` : purge obligatoire d'une nouvelle session.

## Impact

Les traces techniques des sessions CAB précédentes sont supprimées sans
sauvegarde, conformément à la décision du développeur. Les sources, secrets,
configurations, rapports et historiques natifs OpenCode restent hors purge.
Les trois autres changes actifs restent inchangés. La création de ce change
supplémentaire et son archivage ont été explicitement validés dans la session.
