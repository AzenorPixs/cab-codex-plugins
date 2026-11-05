### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| N/A | N/A | N/A | N/A | N/A | N/A | N/A — télémétrie d’agent non disponible |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex orchestrateur | N/A — télémétrie exacte non exposée | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

| Mesure | Valeur | Part / cause |
|---|---:|---|
| Durée calendaire complète | N/A | Heure de début SCM non relevée |
| Messages, appels d’outils et décisions | N/A | Export exhaustif absent |
| Node.js — suite complète, concurrence limitée à 2 | 710 réussis / 741 | 95,8 % réussis ; 31 ignorés (4,2 %) ; 0 échec |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| OpenSpec strict avant archivage | 17 réussies / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussies / 16 | 100 % ; 0 échec |
| Archives OpenSpec strictes | 121 réussies / 121 | 100 % ; 0 échec |
| Tests natifs OpenCode isolés | 2 réussis / 2 | Prévol, édition partielle, recovery et multi-session |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

Deux exécutions complètes précédentes ont eu chacune un timeout de démarrage
sous charge ; les tests concernés ont passé isolément, puis la suite complète
avec concurrence limitée à deux a réussi.

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons et décisions.
Aucun volume n’est extrapolé à partir de sorties partielles.

## 3. Fichiers modifiés

74 chemins distincts apparaissent dans le diff SCM préparé. Les compteurs
par fichier sont N/A, faute de journal exhaustif des écritures. Les chemins
représentent des artefacts du projet, pas un décompte d’appels d’édition.

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
| `openspec/changes/archive/2026-11-02-align-native-codemode-recovery-fixture/.openspec.yaml` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-align-native-codemode-recovery-fixture/design.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-align-native-codemode-recovery-fixture/proposal.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-02-align-native-codemode-recovery-fixture/tasks.md` | N/A | N/A | N/A |
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
| `tests/native-opencode-codemode.test.mjs` | N/A | N/A | N/A |
| `tests/native-opencode.test.mjs` | N/A | N/A | N/A |
| `tests/test_crash_recovery.py` | N/A | N/A | N/A |
| `tests/test_session_reset.py` | N/A | N/A | N/A |
| `tests/web-monitor.test.mjs` | N/A | N/A | N/A |

## 4. Commandes

- `/home/devops/node/current/bin/node --test-concurrency=2 --test tests/*.test.mjs` — 710/741 réussis, 31 ignorés, 0 échec.
- `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` — 87/87 réussis.
- `/home/devops/.local/npm/bin/openspec validate --all --strict` — 16/16 réussies après archivage.
- `/home/devops/.local/npm/bin/openspec validate --archived --strict` — 121/121 réussies.
- `CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode node --test tests/native-opencode.test.mjs tests/native-opencode-codemode.test.mjs` — 2/2 réussis sur OpenCode 2.2 isolé.
- `node --check`, `py_compile` sur les fichiers Python modifiés et `git diff --check` — réussis.

Le fixture ne change aucune garde de production : la discovery en lecture seule
avant `prepare` respecte le contrôle natif déjà exigé.

## 5. Accès web

N/A — aucune consultation web utilisée pour la qualification. Les téléchargements
CABU relèvent de la procédure d’activation, pas de recherche documentaire.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Quota Codex avant / après | N/A — relevés absents |
| Chemins SCM distincts préparés | 74 |
| Version source préparée | 2.1.57 |
| Portée | Alignement du fixture de recovery sur la discovery native pré-`prepare` ; aucun comportement produit modifié |
| Résultat natif | OpenCode 2.2 isolé : deux tests d’intégration réussis |
| Activation runtime | Non revendiquée dans ce rapport source |
