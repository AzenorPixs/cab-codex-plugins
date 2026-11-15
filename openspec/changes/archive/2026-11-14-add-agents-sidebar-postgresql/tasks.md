# Tâches

Code non attribué ; repère provisoire : `add-agents-sidebar-postgresql`.

- [x] 1. Ajouter la migration PostgreSQL et alimenter l'inventaire depuis le catalogue.
- [x] 2. Ajouter la navigation latérale et conserver les informations existantes.
- [x] 3. Vérifier le comportement, la migration et activer sur l'hôte sans versionnement ni CI/CD.

## Sous-lot provisoire — catalogue et navigation des agents

Tâches 1 à 3 ; dépendances : PostgreSQL et service CAB disponibles. Critères : trois entrées persistées, sélection fonctionnelle, observations préservées et activation vérifiée. État : réalisé le 14 novembre 2026 : migration PostgreSQL temporaire puis migration 0018 appliquée ; service READY ; API avec trois identités ; menu et sélection Codex CLI constatés dans le navigateur. Construction frontend et validation OpenSpec réussies. Aucun commit, changement de version ou CI/CD.
