# OBS01 — Ajouter le résumé des RUN à cab status

## Why
Le développeur demande le même rapport synthétique que le suivi CISMP : nom du change, actions réalisées, en cours et restantes, avec état actif ou attente explicite d'un autre RUN. La commande distribuée ne propose pas status. La référence source est maintenant 1.2.0 ; la cible explicitement validée est 1.2.1.

## What Changes
- Ajouter /cab status et /cab status --run <run_id> à la commande Codex, en lecture seule, avec tableau français horodaté.
- Recouper les sources actuelles CAB, Codex/OpenCode et checkpoints/tâches ciblés ; distinguer orchestration, génération native, attente de coordination, arrêt et information indéterminée.
- Conserver preuves, contradictions et indisponibilités explicites ; aucune réservation ou coche seule ne prouve la livraison.
- Aligner les versions des briques, attentes de tests et documents de référence sur 1.2.1.

## Capabilities
### Modified Capabilities
- codex-integration-distribution : sous-commande status, contrat de restitution et version 1.2.1.

## Impact
Implémentation dans .codex/commands/cab.md ; tests de distribution ; versions Python/Node, manifeste plugin et unités systemd ; PROJECT.md, TECHNICAL.md, BUILD.md, README.md et CHANGELOG.md. APIs et formats persistants inchangés. Aucun déploiement, Git, modification du projet piloté ou des prompts protégés. Autorisation : validation développeur du périmètre SCM, version 1.2.1 et déplacement du chat dans CAB.
