## Why

Le protocole CAB ne fixe pas les cadences de contrôle du pilotage et ne décrit
pas la persistance des nouvelles tentatives après un échec du benchmark PLLM.
Les sondes statistiques ont déjà une cadence de trente minutes, mais le
protocole doit préciser que le travail se poursuit entre les échéances.

## What Changes

- Retenter un benchmark PLLM échoué toutes les trente minutes, sans limite de
  tentatives, jusqu'à reprise sûre du même RUN ou arrêt explicite du développeur.
- Maintenir les événements SSE en temps réel et contrôler demandes et rapports
  toutes les trois secondes dans la boucle de pilotage de l'orchestrateur.
- Espacer de sept secondes fixes les vérifications de l'analyse ou de la
  rédaction de l'agent de codage, indépendamment du contrôle CAB.
- Expliciter les sondes statistiques toutes les trente minutes sans attente
  bloquante ni suspension du travail pour attendre l'échéance.
- Porter les briques distribuées CAB de `0.86.7` à `0.86.8`.

## Capabilities

### Modified Capabilities

- `persistent-job-supervision` : cadences de pilotage et attente PLLM persistante.
- `archive-session-statistics` : collecte périodique sans arrêt du travail.
- `codex-integration-distribution` : version commune des artefacts distribués.

## Impact

Protocole AGENTS, commande `/cab`, skills distribués, cadrages et documentation,
spécifications et tests de distribution. Le code du broker, du contrôleur et du
superviseur change uniquement de version. Pas de nouvel automate PLLM, de
modification des temporisations techniques du superviseur, de dépendance,
migration, déploiement, activation de service ou opération Git. Le cycle ciblé
inclut synchronisation OpenSpec, archivage et rapport factuel SCM.

## Validation du développeur

Le développeur a répondu « Je valide » à la proposition de périmètre autonome
de cette session le 10 octobre 2026. Cette validation couvre les exigences,
fichiers, contrôles, synchronisation, archivage et rapport du seul change
`update-cab-orchestration-cadences`.
