### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent de codage OpenCode identifiable pour ce change SCM | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex orchestrateur | N/A — télémétrie exacte non exposée | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

| Mesure | Valeur | Part / cause |
|---|---:|---|
| Durée calendaire complète | N/A | Début de la session SCM non horodaté par une collecte dédiée |
| Messages, appels d’outils et décisions | N/A | Pas d’export complet de télémétrie de session |
| Node.js | 690 réussis / 721 | 95,7 % réussis ; 31 ignorés (4,3 %) ; 0 échec après relance ciblée de la suite complète |
| Python | 87 réussis / 87 | 100,0 % ; 0 échec |
| OpenSpec strict | 17 réussies / 17 | 100,0 % ; 0 échec |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente ; aucun OpenCode codeur identifiable |

Les dénominateurs des suites sont indépendants et ne sont pas additionnés. Un
appel technique réussi n’est pas présenté comme une approbation humaine.

## 2. Types de messages et d’outils

N/A — session SCM directe sans export complet des messages, rôles, parties,
terminaisons ni décisions. Aucun total n’est reconstruit depuis des sorties
partielles.

## 3. Fichiers modifiés

Le commit SCM `690efe5aac1a86b588191750272a6fa422a45a0d` contient 83 chemins
modifiés après détection des renommages. Les nombres d’écritures approuvées,
refusées et en erreur par chemin sont N/A faute de journal d’opérations de
codage. Les chemins du tableau sont ceux du diff SCM, pas un comptage d’appels
d’édition.

| Chemin absolu | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| `/home/devops/datas/cab//home/devops/datas/cab/.codex/commands/CAB.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/.codex/commands/CABU.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/BUILD.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/CHANGELOG.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/DEVELOPMENT_MAP.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/PROJECT.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/README.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/TECHNICAL.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/archive/2026-11-01-recover-authorized-failed-mcp-receipt/.openspec.yaml` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/archive/2026-11-01-recover-authorized-failed-mcp-receipt/README.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/archive/2026-11-01-recover-authorized-failed-mcp-receipt/STATISTICS.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/archive/2026-11-01-recover-authorized-failed-mcp-receipt/design.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/archive/2026-11-01-recover-authorized-failed-mcp-receipt/proposal.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/archive/2026-11-01-recover-authorized-failed-mcp-receipt/specs/active-component-update/spec.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/archive/2026-11-01-recover-authorized-failed-mcp-receipt/tasks.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/close-deterministic-pre-admission-refusals/.openspec.yaml` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/close-deterministic-pre-admission-refusals/README.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/close-deterministic-pre-admission-refusals/design.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/close-deterministic-pre-admission-refusals/proposal.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/close-deterministic-pre-admission-refusals/specs/approval-workflow/spec.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/changes/close-deterministic-pre-admission-refusals/tasks.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/openspec/specs/active-component-update/spec.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/native-coding-recovery.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/pyproject.toml` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/src/cgpt_approval_bridge_journal.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/src/cgpt_approval_bridge_router.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/src/cgpt_approval_bridge_server.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/active-component-update.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/concurrent-controller.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/controller-service-distribution.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/monitor-service-start.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/native-opencode.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/test_concurrent_broker.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/test_crash_recovery.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/test_session_reset.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab//home/devops/datas/cab/tests/web-monitor.test.mjs` | N/A | N/A | N/A |

Le change OpenSpec est archivé sous
`openspec/changes/archive/2026-11-01-close-deterministic-pre-admission-refusals/`.

## 4. Commandes

N/A — décompte exhaustif des commandes et de leurs résultats absent pour la
session SCM directe. Vérifications qualifiantes observées :
`node --test tests/*.test.mjs`, `python3 -m unittest discover -s tests`,
`openspec validate --all --strict` et `python3 -m py_compile` sur les modules
modifiés.

## 5. Accès web

N/A — aucun accès web attribué au périmètre de qualification de ce change.
Une consultation de documentation technique ultérieure concerne un incident
distinct et n’est pas incluse dans cette archive.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Début de session | N/A — relevé initial absent |
| Fin après archivage et CABU | 2026-11-01 20:22:06 UTC (readiness active observée) |
| Durée globale | N/A — début vérifiable absent |
| Quota Codex avant / après | N/A — relevés absents pour la session SCM directe |
| Différence de quota | N/A — relevés absents |
| Chemins du commit | 83 (100 % du périmètre SCM recensé) |
| Commandes, refus et accès web | N/A — compteurs exhaustifs non disponibles |

Résultat : le même approval auparavant `PENDING` avec diagnostic HTTP 409
`resource-revision-stale` est devenu `NOT_ADMITTED`, sans décision humaine,
permission ou once. CAB/CABU 2.1.45 est activé ; les quatre composants servent
2.1.45, le broker est connecté et READY avec `pending_count=0`, SSE connecté,
et OpenCode conserve son PID et sa version. Le RUN propriétaire a préparé une
nouvelle demande avec des révisions fraîches. Le statut `NOT_ADMITTED` n’est ni
`REJECTED` ni une autorisation de rejouer l’ancienne demande. Aucun secret n’est
inclus dans ce rapport.
