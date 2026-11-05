### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent OpenCode identifié comme auteur de ce change CAB | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex orchestrateur | N/A — télémétrie exacte non exposée | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

| Mesure | Valeur | Part / cause |
|---|---:|---|
| Durée calendaire complète | N/A | Heure de début de session SCM non collectée |
| Messages, appels d’outils et décisions | N/A | Aucun export exhaustif de télémétrie |
| Node.js | 698 réussis / 729 | 95,7 % réussis ; 31 ignorés (4,3 %) ; 0 échec |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| OpenSpec strict | 17 réussies / 17 | 100 % ; 0 échec |
| OpenSpec strict des archives | 117 réussies / 117 | 100 % ; 0 échec après clôture |
| Lecture native OpenCode | 2 opérations réussies | `list`: 25 entrées filtrées ; `read AGENTS.md`: 29 899 octets, SHA-256 consigné sans restituer le contenu |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

Les dénominateurs des suites sont indépendants et ne sont pas additionnés. La
lecture/listing natifs sont des preuves runtime distinctes des tests locaux.

## 2. Types de messages et d’outils

N/A — session SCM directe sans export complet des messages, rôles, parties,
terminaisons, refus et décisions. Aucun total n’est reconstruit à partir des
sorties de commande.

## 3. Fichiers modifiés

Cinq commits publiés couvrent les versions 2.1.46 à 2.1.50. Ils touchent 86 chemins versionnés distincts, hors `DEVOPS.md` généré. Les décomptes d’écritures
par chemin sont N/A, faute de journal exhaustif des opérations. Le tableau
recense les chemins du diff SCM, sans prétendre compter les appels d’édition.

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
| `openspec/changes/archive/2026-11-01-close-deterministic-pre-admission-refusals/.openspec.yaml` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-01-close-deterministic-pre-admission-refusals/README.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-01-close-deterministic-pre-admission-refusals/STATISTICS.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-01-close-deterministic-pre-admission-refusals/design.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-01-close-deterministic-pre-admission-refusals/proposal.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-01-close-deterministic-pre-admission-refusals/specs/approval-workflow/spec.md` | N/A | N/A | N/A |
| `openspec/changes/archive/2026-11-01-close-deterministic-pre-admission-refusals/tasks.md` | N/A | N/A | N/A |
| `openspec/changes/read-only-opencode-fs-fallback/.openspec.yaml` | N/A | N/A | N/A |
| `openspec/changes/read-only-opencode-fs-fallback/README.md` | N/A | N/A | N/A |
| `openspec/changes/read-only-opencode-fs-fallback/design.md` | N/A | N/A | N/A |
| `openspec/changes/read-only-opencode-fs-fallback/proposal.md` | N/A | N/A | N/A |
| `openspec/changes/read-only-opencode-fs-fallback/specs/opencode-v2-transport/spec.md` | N/A | N/A | N/A |
| `openspec/changes/read-only-opencode-fs-fallback/tasks.md` | N/A | N/A | N/A |
| `openspec/specs/approval-workflow/spec.md` | N/A | N/A | N/A |
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
| `tests/helpers/opencode-v2-test-server.mjs` | N/A | N/A | N/A |
| `tests/maintenance-bootstrap.test.mjs` | N/A | N/A | N/A |
| `tests/monitor-service-start.test.mjs` | N/A | N/A | N/A |
| `tests/native-opencode.test.mjs` | N/A | N/A | N/A |
| `tests/opencode-v2-client.test.mjs` | N/A | N/A | N/A |
| `tests/source-read.test.mjs` | N/A | N/A | N/A |
| `tests/test_crash_recovery.py` | N/A | N/A | N/A |
| `tests/test_session_reset.py` | N/A | N/A | N/A |
| `tests/web-monitor.test.mjs` | N/A | N/A | N/A |

## 4. Commandes

Décompte exhaustif des commandes et refus : N/A. Vérifications qualifiantes
observées :

- `node --test --test-concurrency=1 tests/*.test.mjs` — 698/729 réussis, 31 ignorés, aucun échec.
- `python3 -m unittest discover -s tests -v` — 87/87 réussis.
- `openspec validate --all --strict --no-interactive` — 17/17 réussis.
- `openspec validate --archived --strict --no-interactive` — 117/117 réussis.
- Syntaxe Node, compilation Python, concordance des modules broker et `git diff --check` — réussis.
- CABU 2.1.50 — `COMPLETED`, quatre composants actifs et broker connecté/READY.
- Routes natives OpenCode V2, sous le RUN existant — `list` et `read` réussis, aucun shell/execute/écriture.

## 5. Accès web

Six appels web (neuf recherches/ouvertures) ont consulté la documentation
OpenSpec CLI et les sources/documentation officielles OpenCode V2 filesystem.
Aucun contenu de projet piloté n’a été consulté par ces appels.

- [OpenSpec CLI](https://openspec.dev/docs/cli)
- [OpenCode V2 API](https://dev.opencode.ai/v2/docs/api)
- [Implémentation officielle des routes filesystem OpenCode](https://github.com/anomalyco/opencode/blob/dev/packages/server/src/handlers/fs.ts)

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Début de session | N/A — relevé initial absent |
| Fin de qualification runtime | CABU 2.1.50 terminé ; contrôleur, superviseur, monitor et broker vérifiés en 2.1.50 |
| Durée globale | N/A — début vérifiable absent |
| Quota Codex avant / après | N/A — relevés absents |
| Chemins SCM distincts | 86 |
| Versions publiées | 2.1.46 à 2.1.50 |
| Résultat native filesystem | Listing 25 entrées filtrées et lecture native `AGENTS.md` 29 899 octets ; contenu non restitué |
| RUN et permissions métier | Aucun changement ; aucune permission consommée ou rejouée |

Résultat : le fallback filesystem OpenCode V2 est actif en CAB 2.1.50. Les routes
sont liées au RUN, à sa session native et à sa location ; les chemins externes,
les sources exclues, les réponses MIME ou UTF-8 non admises et les réponses
excessives restent refusés. OpenCode est resté ouvert et son PID n’a pas changé.
