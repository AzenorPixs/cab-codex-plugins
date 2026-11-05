# SUP08 — Compléter le statut public du superviseur

## Why

L'ACSM du 2026-10-13 constate que le statut public du superviseur ne renseigne
ni le dernier jalon prouvé, ni le gate terminal, ni le nombre de tentatives de
reprise exigés par `persistent-job-supervision`, « Observabilité sans secret ».
Le résultat de la dernière tentative existe, mais ne permet pas de reconstituer
un compteur. L'écart est constaté dans le code et par extraction en mémoire
de la sélection d'un job, sans interrogation d'un service réel.

## What Changes

- Exposer le dernier jalon et le gate effectivement observés auprès du contrôleur.
- Ajouter un compteur explicite des tentatives de reprise du job, persistant
  et distinct du résultat de la dernière tentative.
- Définir les états indisponibles et la lecture des anciens états sans inventer
  de jalon, gate validé ou historique de tentatives.
- Préserver le gel de récupération, la corrélation SSE et les règles de relance.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `persistent-job-supervision` : statut complet et compatibilité de son compteur.

## Impact

Superviseur distribué, `tests/persistent-job-supervisor.test.mjs`, spécification
de supervision, `TECHNICAL.md`, `README.md` et `CHANGELOG.md` lors de
l'implémentation. Aucun nouveau paramètre de configuration ou dépendance.
Le compteur ajoute un champ à l'état persistant, avec lecture compatible
des anciens états et sans migration destructive.

## Validation et état du travail

Le développeur a validé cette proposition le 2026-10-13. Le travail est appliqué
aux sources et synchronisé avec les références ; les preuves sont consignées
dans tasks.md. Le change reste ouvert. Aucun archivage, incrément de version,
commit, push, déploiement ou installation de profil effectué.
