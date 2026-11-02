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
| Node.js — suite complète | 714 réussis / 745 | 95,8 % réussis ; 31 ignorés (4,2 %) ; 0 échec. |
| Node.js — client OpenCode V2 ciblé après le dernier changement | 56 réussis / 56 | 100 % ; 0 échec |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| OpenSpec strict avant archivage | 17 réussis / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussis / 16 | 100 % ; 0 échec |
| Validation stricte des archives | 125 réussies / 125 | 100 % ; 0 échec |
| OpenCode 2.2 isolé | 1 réussi / 1 | Version API 2.2.5 ; workspace, configuration, credential et fournisseur synthétiques |
| Syntaxe JavaScript et compilation Python | Réussies | `node --check`, `py_compile`, manifeste JSON valide et trois copies broker identiques |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons ou décisions.
Aucun volume n’est extrapolé à partir des sorties partielles.

## 3. Fichiers modifiés

80 chemins SCM du change ; le journal exhaustif des écritures n’est pas disponible. Les compteurs par fichier restent N/A.

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
| `openspec/changes/archive/2026-11-02-fix-native-permission-reply-location-scope/.openspec.yaml` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-fix-native-permission-reply-location-scope/README.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-fix-native-permission-reply-location-scope/design.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-fix-native-permission-reply-location-scope/proposal.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-fix-native-permission-reply-location-scope/specs/codex-integration-distribution/spec.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-fix-native-permission-reply-location-scope/specs/opencode-v2-transport/spec.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-fix-native-permission-reply-location-scope/tasks.md` | N/A | N/A | N/A |
| `openspec/specs/codex-integration-distribution/spec.md` | N/A | N/A | N/A |
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
| `tests/maintenance-bootstrap.test.mjs` | N/A | N/A | N/A |
| `tests/monitor-service-start.test.mjs` | N/A | N/A | N/A |
| `tests/native-opencode.test.mjs` | N/A | N/A | N/A |
| `tests/opencode-v2-client.test.mjs` | N/A | N/A | N/A |
| `tests/test_crash_recovery.py` | N/A | N/A | N/A |
| `tests/test_session_reset.py` | N/A | N/A | N/A |
| `tests/web-monitor.test.mjs` | N/A | N/A | N/A |

`DEVOPS.md` était déjà modifié avant ce change et n’est pas compté dans ces chemins.

## 4. Commandes

- `/home/devops/node/current/bin/node --test tests/opencode-v2-client.test.mjs` — 56/56 réussis après ajout du test de refus HTTP non-204.
- `set -o pipefail; /home/devops/node/current/bin/node --test --test-reporter=tap tests/*.test.mjs | tail -n 16` — 714/745 réussis, 31 ignorés, 0 échec ; code final 0.
- `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` — 87/87 réussis.
- `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive --report findings` — 17/17 avant archive et 16/16 après archive.
- `/home/devops/.local/npm/bin/openspec validate --archived --strict --no-interactive --report findings` — 125/125 réussis.
- `CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode /home/devops/node/current/bin/node --test tests/native-opencode-codemode.test.mjs` — OpenCode 2.2 isolé, 1/1 réussi.
- `node --check`, `py_compile`, validation JSON des manifestes et comparaisons byte-à-byte des modules broker — réussis.

## 5. Accès web

Consultation de la [documentation officielle de l’API OpenCode V2](https://dev.opencode.ai/v2/docs/api) pour vérifier l’endpoint V2 de réponse de permission. Aucune donnée de session ou permission utilisateur transmise au web.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Quota Codex avant / après | N/A — relevés absents |
| Chemins SCM distincts du change | 80 |
| Version source | 2.1.61 |
| Résultat | Les réponses de permission natives portent le scope HTTP `x-opencode-directory` exact de la session, y compris lorsque la location diffère de la valeur par défaut du client. |
| Permissions/décisions/effets utilisateur | Inchangés par les tests et la qualification source ; aucune permission existante n’a été répondue ou rejouée. |
| Activation runtime | Non revendiquée dans ce rapport ; CABU distinct requis. |
