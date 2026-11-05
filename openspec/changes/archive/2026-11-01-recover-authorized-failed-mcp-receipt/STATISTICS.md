### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent de codage OpenCode identifiable pour ce change | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex orchestrateur | N/A — télémétrie de modèle non exposée | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

| Mesure | Valeur | Part / cause |
|---|---:|---|
| Durée calendaire complète | N/A | Bornes de début de ce change non enregistrées dans un relevé de session dédié |
| Messages, appels d’outils et décisions | N/A | Pas d’export de télémétrie RUN/agent pour cette session SCM directe |
| Tests Node.js | 690 réussis / 721 | 95,7 % réussis ; 31 ignorés (4,3 %) ; 0 échec |
| Tests Python | 83 réussis / 83 | 100,0 % ; 0 échec |
| Validations OpenSpec strictes | 17 réussies / 17 | 100,0 % ; 0 échec |
| Tokens, cache et coût | N/A | Mesures non fournies pour l’agent orchestrateur |
| TTMT et débit du codeur | N/A | Aucun agent de codage OpenCode et aucune sonde dédiée |

Les dénominateurs des suites sont distincts et ne sont pas additionnés. Les
appels d’outils techniques ne sont pas assimilés à des approbations humaines.

## 2. Types de messages et d’outils

N/A — l’archive provient d’une session SCM directe ; aucune télémétrie complète
par rôle, partie, résultat d’appel ou décision n’a été exportée. Les agrégats
ne sont pas reconstruits à partir des sorties de commande partielles.

## 3. Fichiers modifiés

Le commit SCM `c6aac35427dc2e586293473e3ca20172e1225326` contient 72 fichiers.
Les nombres d’écritures approuvées, refusées et en erreur par fichier sont
N/A, faute de journal d’opérations de codage. Voici les chemins absolus du
commit ; le total décrit le diff SCM, pas le nombre d’appels d’édition.

| Chemin absolu | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| `/home/devops/datas/cab/.codex/commands/CAB.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/.codex/commands/CABU.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/BUILD.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/CHANGELOG.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/DEVELOPMENT_MAP.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/PROJECT.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/README.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/TECHNICAL.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/openspec/changes/recover-authorized-failed-mcp-receipt/design.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/openspec/changes/recover-authorized-failed-mcp-receipt/specs/active-component-update/spec.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/openspec/changes/recover-authorized-failed-mcp-receipt/tasks.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/mcp-pending-recovery.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/native-coding-recovery.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json` | N/A | N/A | N/A |
| `/home/devops/datas/cab/pyproject.toml` | N/A | N/A | N/A |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_journal.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_router.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_server.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/active-component-update.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/concurrent-controller.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/controller-service-distribution.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/monitor-service-start.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/native-opencode.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/test_crash_recovery.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/test_session_reset.py` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/web-monitor.test.mjs` | N/A | N/A | N/A |

Le change OpenSpec a été archivé sous
`openspec/changes/archive/2026-11-01-recover-authorized-failed-mcp-receipt/`.

## 4. Commandes

N/A — les décomptes exhaustifs d’exécutions, refus et erreurs ne sont pas
capturés pour cette session SCM directe. Vérifications qualifiantes observées :
`node --test --test-reporter=tap tests/*.test.mjs`,
`python3 -m unittest discover -s tests` et
`openspec validate --all --strict`.

## 5. Accès web

N/A — aucun relevé d’accès web attribuable à la fenêtre du change archivé.
Les URL approuvées, refusées ou réellement visitées ne sont pas reconstruites
à partir d’activités ultérieures.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Début de session | N/A — relevé initial absent |
| Fin après archivage et CABU | 2026-11-01 19:54 UTC (horodatage de readiness active observé) |
| Durée globale | N/A — début vérifiable absent |
| Quota Codex avant / après | N/A — relevés absents |
| Variation du quota | N/A — relevés absents |
| Fichiers du commit | 72 (100 % du périmètre SCM recensé) |
| Commandes, approvals et accès web | N/A — détails non télémétrés dans ce cycle direct |

Résultat livré : l’ancien reçu MCP autorisé a été clos `SUPERSEDED` après
vérification, sans rejouer son reload ; la transaction CABU suivante est
`COMPLETED` en 2.1.44. Les quatre briques et services actifs ont été observés
à 2.1.44, le broker connecté et OpenCode conservé au même PID/version. Tests :
Node.js 690/721 (31 ignorés), Python 83/83, OpenSpec strict 17/17. Commit
publié sur `main`. Aucun secret n’est inclus dans ce rapport. Les permissions
natives, les RUN et les effets métier ne sont pas déduits de ces résultats.
