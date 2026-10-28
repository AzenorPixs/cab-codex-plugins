# OBS03 — Gestion locale du moniteur CAB 1.7.0

## Why

Je souhaite commander les briques depuis le tableau de bord et ranger les RUN et changes terminés sans modifier les sources du projet observé.

## What Changes

- Simplifier l'en-tête et mettre CENTRE D’OBSERVATION en évidence.
- Ajouter démarrage/arrêt et redémarrage du contrôleur, superviseur et broker ; ajouter la carte Web et son redémarrage.
- Ajouter les archives et suppressions logiques persistantes du moniteur, avec restauration des RUN sans reprise métier.
- Protéger les actions côté serveur, conserver les preuves et aligner les artefacts distribués sur 1.7.0.

## Capabilities

### New Capabilities

- `monitor-management` : commandes locales fermées et rangement privé du tableau de bord.

### Modified Capabilities

- `local-web-monitor` : présentation, navigation et exceptions explicites de gestion.
- `codex-integration-distribution` : distribution complète et version 1.7.0.

## Impact

Interface web, serveur du moniteur, garde temporaire du contrôleur, modules et tests locaux, supports et versions. Aucun changement des sources OpenSpec observées par les actions de l'interface. Aucun déploiement réel, migration, commit ou publication. Périmètre autonome validé le 20 octobre 2026 ; préparation SCM directe.
