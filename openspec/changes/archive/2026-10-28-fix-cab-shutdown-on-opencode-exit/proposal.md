# SUP10 — Fermeture propre de CAB avec OpenCode — 2.1.6

## Why
Le broker stdio appartient à OpenCode, mais les trois services CAB persistent après sa fermeture. Le helper registry-lock appartient au contrôleur et reste donc visible. Une coupure HTTP/SSE ne prouve cependant pas la disparition du serveur.

## What Changes
- Suivre le PID serveur authentifié par /api/info et son identité locale de démarrage ; attendre la première connexion si OpenCode est absent.
- Après disparition prouvée de cette instance, arrêter les trois services, leurs communications et le helper de verrou, sans relance systemd.
- Qualifier la fermeture MCP du broker, y compris avec demandes en attente.
- Conserver RUN, jobs, réservations, décisions, gels et protections sans purge, clôture métier ni rejeu.
- Aligner la distribution source en 2.1.6, sans installation ni activation.

## Capabilities
### Added Capabilities
- cab-process-lifecycle: détection locale et arrêt technique borné.
### Modified Capabilities
- active-component-update: alignement de la cible courante 2.1.6, qualification des fixtures héritées sans modifier les preuves 2.1.5.
- codex-integration-distribution: release source commune 2.1.6.
- local-web-monitor: arrêt lié au serveur OpenCode, indépendance conservée face aux pannes CAB.
- concurrent-run-coordination: arrêt technique sans clôture métier ni perte de protection.
- persistent-job-supervision: interruption technique sans relance après disparition du serveur.
- approval-persistence: fermeture MCP sans disparition de l’état durable.

## Impact
Module commun, controller/supervisor/monitor, canal de verrou, client SSE, distribution updater, tests et documentation. Aucun nouveau paquet, aucune lecture de secret par le modèle. Le serveur suivi est opencode serve ; fermer un simple client ne ferme pas CAB. Les travaux concurrents 2.1.5 restent préservés. Le cycle SCM autorisé inclut validation, archive et statistiques ; aucune activation ni installation.

## Extension ciblée validée
Le développeur autorise le correctif de deux appels Date.now() révélé par le passage global : une seule capture d’instant pour le sceau de maintenance, son delta et sa régression déterministe. Le refus de sécurité à 60001 ms était correct ; aucune garde n’est affaiblie. Ce défaut préexistant est documenté séparément du cycle de vie. Aucun autre correctif de maintenance n’est engagé.
