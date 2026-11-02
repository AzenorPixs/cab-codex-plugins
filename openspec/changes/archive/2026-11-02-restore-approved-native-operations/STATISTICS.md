### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| N/A | N/A | N/A | N/A | N/A | N/A | N/A — SCM direct, aucune télémétrie d’agent de codage |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex direct | N/A — version exacte non relevée | N/A | N/A | N/A | N/A | N/A — télémétrie non collectée pour SCM |

## 1. Statistiques générales et décisions

| Mesure | Valeur | Part / cause |
|---|---:|---|
| Durée calendaire complète | N/A | Heure de début SCM non relevée |
| Messages, appels d’outils et décisions | N/A | Export exhaustif absent |
| Node.js — suite complète, concurrence 1 | 754 total : 723 réussis, 31 ignorés, 0 échec | 95,9 % réussis ; 4,1 % ignorés |
| Node.js — restauration/absence/callID/réponse perdue | 4 réussis / 4 | 100 % ; même permission exacte, absence, effet inconnu et callID divergent |
| Node.js — registre et isolation des ressources | 4 réussis / 4 | 100 % ; décision durable, once, attente recouvrante et RUN indépendant |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| OpenSpec strict avant archivage | 17 réussis / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussis / 16 | 100 % ; 0 échec |
| Validation stricte des archives | 127 réussies / 127 | 100 % ; 0 échec |
| Syntaxe JavaScript et compilation Python | Réussies | `node --check`, `py_compile` et exécution complète des suites |
| Versions CAB/CABU/plugins/commandes | 2.1.63 communes | Les deux plugins partagent le cachebuster `codex.20261102010903` |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons ou décisions.
Aucun volume n’est extrapolé à partir de sorties partielles.

## 3. Fichiers modifiés

89 chemins SCM distincts ; les compteurs par fichier de décisions, refus et erreurs ne sont pas disponibles.

| Chemin relatif | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| `.codex/commands/CAB.md` | N/A | N/A | N/A |
| `.codex/commands/CABU.md` | N/A | N/A | N/A |
| `BUILD.md` | N/A | N/A | N/A |
| `CHANGELOG.md` | N/A | N/A | N/A |
| `DEVELOPMENT_MAP.md` | N/A | N/A | N/A |
| `PROJECT.md` | N/A | N/A | N/A |
| `README.md` | N/A | N/A | N/A |
| `TECHNICAL.md` | N/A | N/A | N/A |
| `openspec/BATCH_CODES.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/.openspec.yaml` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/README.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/STATISTICS.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/design.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/proposal.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/specs/approval-persistence/spec.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/specs/codex-integration-distribution/spec.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/specs/concurrent-run-coordination/spec.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/specs/controller-transport/spec.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/specs/opencode-v2-transport/spec.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-restore-approved-native-operations/tasks.md` | N/A | N/A | N/A |
| `openspec/specs/approval-persistence/spec.md` | N/A | N/A | N/A |
| `openspec/specs/codex-integration-distribution/spec.md` | N/A | N/A | N/A |
| `openspec/specs/concurrent-run-coordination/spec.md` | N/A | N/A | N/A |
| `openspec/specs/controller-transport/spec.md` | N/A | N/A | N/A |
| `openspec/specs/opencode-v2-transport/spec.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/.codex-plugin/plugin.json` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/references/native-coding-recovery.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | N/A | N/A | N/A |
| `plugins/cabu/.codex-plugin/plugin.json` | N/A | N/A | N/A |
| `pyproject.toml` | N/A | N/A | N/A |
| `src/cgpt_approval_bridge_journal.py` | N/A | N/A | N/A |
| `src/cgpt_approval_bridge_router.py` | N/A | N/A | N/A |
| `src/cgpt_approval_bridge_server.py` | N/A | N/A | N/A |
| `tests/active-component-update.test.mjs` | N/A | N/A | N/A |
| `tests/concurrent-controller.test.mjs` | N/A | N/A | N/A |
| `tests/controller-service-distribution.test.mjs` | N/A | N/A | N/A |
| `tests/helpers/opencode-v2-test-server.mjs` | N/A | N/A | N/A |
| `tests/maintenance-bootstrap.test.mjs` | N/A | N/A | N/A |
| `tests/monitor-service-start.test.mjs` | N/A | N/A | N/A |
| `tests/native-opencode.test.mjs` | N/A | N/A | N/A |
| `tests/resource-coordination.test.mjs` | N/A | N/A | N/A |
| `tests/test_crash_recovery.py` | N/A | N/A | N/A |
| `tests/test_session_reset.py` | N/A | N/A | N/A |
| `tests/web-monitor.test.mjs` | N/A | N/A | N/A |

## 4. Commandes

- `node --test --test-concurrency=1 --test-reporter=dot tests/*.test.mjs` — 754 tests, 723 réussis, 31 ignorés, 0 échec.
- `/home/devops/python/current/bin/python3 -m unittest discover -s tests` — 87/87 réussis.
- `/home/devops/python/current/bin/python3 -m py_compile` — modules Python CAB, broker et tests concernés compilés.
- `/home/devops/.local/npm/bin/openspec validate --all --strict --report findings` — 17/17 avant archive ; 16/16 après archive.
- `/home/devops/.local/npm/bin/openspec validate --archived --strict --report findings` — 127/127 réussis.
- `/home/devops/.local/npm/bin/openspec archive restore-approved-native-operations --yes --json` — archive réalisée et cinq spécifications mises à jour.

## 5. Accès web

[API OpenCode V2](https://dev.opencode.ai/v2/docs/api) — consultation des contrats V2 de permissions et d’événements natifs. Aucun credential n’a été lu par le modèle.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Quota Codex avant / après | N/A — relevés absents |
| Change | `restore-approved-native-operations`, code de lot non attribué par ACL |
| État | Archivé, 7/7 tâches validées ; attribution du code de lot renvoyée à ACL |
| Version source | 2.1.63 |
| Résultat | Les décisions terminales sont durables avant réponse native. La reprise restaure seulement une approbation native exacte et continue le même `once` si la permissionId/callID restent pendants et l’outil demeure running non exécuté. Les effets inconnus restent protégés ; les RUN indépendants sans recouvrement continuent. |
| Activation runtime | Non revendiquée dans ce rapport ; CABU 2.1.63 est une étape distincte. |
