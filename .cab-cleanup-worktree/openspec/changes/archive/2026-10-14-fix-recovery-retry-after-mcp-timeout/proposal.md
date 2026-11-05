# SUP09 — Autoriser le retry réconcilié après timeout MCP

## Why

Le contrôleur refuse retry lorsque request_validation expire puis poll_approval ou get_approval fournit le refus natif REJECTED corrélé. Cette asymétrie avec complete bloque une récupération sans effet pourtant réconciliée.

## What Changes

- Accepter le refus terminal obtenu par polling après timeout, avec décision locale rejected non consommée et identités/opération intégralement corrélées.
- Conserver candidate, job, RUN, historique, frontières natives, gel et tous les contrôles de contexte et d'absence d'effet.
- Synchroniser les huit ORCHESTRATED_CODING.md, le skill distribué et la commande CAB ; clarifier le timeout seul et l'arrêt explicite du développeur.
- Aligner les briques sources sur 1.0.2 avec cachebuster neuf, sans changer de schéma ni de protocole MCP.

## Impact

Code ciblé : checkRecoveryRetry, tests HTTP et distribution. Documentation : cadrages CAB concernés, README, CHANGELOG et protocoles des huit projets. Aucun déploiement, service actif, cache installé, état de RUN, Git ou source fonctionnelle Pixs n'est modifié.

## Autorisation

Le développeur a validé explicitement le périmètre SCM proposé le 2026-10-14 : spécification, implémentation, tests, huit protocoles, version 1.0.2, archivage et STATISTIQUES.md. Aucune validation intermédiaire n'est requise dans ce périmètre.
