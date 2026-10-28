# CO01 — Prendre en charge les RUN CISMP concurrents

## Why

Le développeur valide le 2026-10-13 plusieurs cycles CISMP concurrents dans
un même OpenCode, avec réservation exclusive des changes et contrôle des
ressources. Le contrat unique, les compteurs globaux et les purges actuelles
empêchent cette isolation. La version cible des briques CAB est 1.0.0.

## What Changes

- Conserver un broker MCP stdio unique dans un contexte OpenCode commun.
- Ajouter un registre durable de réservations atomiques et des contextes de
  contrôleur et de superviseur isolés par RUN.
- Contrôler ressources, dépendances, génération et permissions avant effet.
- Cibler démarrage, récupération, clôture et nettoyage par RUN ; protéger
  l'infrastructure partagée contre les opérations globales concurrentes.
- Mettre à jour les prompts pilotés et protocoles des huit projets inventoriés
  sous /home/devops/datas, sans modifier CISM, CAISM ni les prompts directs.
- Synchroniser les briques, la distribution et les cadrages sur 1.0.0.

## Capabilities

### New Capabilities

- `concurrent-run-coordination` : réservation, compatibilité et isolation.

### Modified Capabilities

- `approval-workflow` : identité du RUN et génération de réservation.
- `approval-persistence` : état partagé conservé pendant les RUN concurrents.
- `controller-transport` : routage des jobs et décisions par RUN.
- `persistent-job-supervision` : supervision et gates individuels.
- `supervision-remediation` : santé commune et états individuels.
- `codex-integration-distribution` : commande, protocole et version 1.0.0.
- `archive-session-statistics` : mesures concurrentes correctement attribuées.

## Impact

Broker Python, scripts Node.js et purge, tests isolés, plugin et commande,
PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md et protocoles.
Les prompts protégés sont explicitement inclus par le développeur. Aucun
déploiement, service utilisateur, secret, historique Git ou change historique
n'est modifié. Les effets Git et l'isolation par worktree restent soumis à
une autorisation distincte et à qualification. Le mode historique à un job
reste compatible ; une cible ambiguë est refusée en mode concurrent.

## Validation et autorisation

La proposition d'architecture et son implémentation autonome SCM, incluant
spécification, tests, documentation et archivage de ce seul change, ont été
explicitement validées dans cette conversation. Les identités et interfaces
ci-dessous concrétisent ce périmètre sans nouvelle dépendance tierce.
