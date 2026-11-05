### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex direct | N/A — télémétrie de version absente | OpenAI | N/A | N/A | N/A | N/A — durées de génération non exportées |

### Agents orchestrateurs

Aucun agent orchestrateur distinct : Codex a réalisé directement l’analyse et les modifications SCM.

## 1. Statistiques générales et décisions

Les compteurs de messages, appels d’outils, approbations, refus, tokens, cache, coût et compactions ne sont pas disponibles dans un export exhaustif de cette session directe. Aucun chiffre n’est reconstruit à partir des sorties affichées.

| Qualification | Résultat | Part |
|---|---|---:|
| Test Node.js complet | 749 réussis, 31 ignorés, 0 échec sur 780 | 96,0 % réussis ; 4,0 % ignorés ; 0,0 % échec |
| Test Python | 87 réussis, 0 échec sur 87 | 100,0 % réussis |
| Tests ciblés de coordination | 3 réussis, 0 échec sur 3 | 100,0 % réussis |
| OpenSpec complet strict après archivage | 16 réussis, 0 échec sur 16 | 100,0 % |
| Changes archivés stricts | 135 réussis, 0 échec sur 135 | 100,0 % |
| Refus de permission de modification | N/A | Aucun export de permissions CAB pour cette session SCM directe |
| Coût, tokens et quotas | N/A | Télémétrie absente |

Les premières validations strictes ont détecté un scénario OpenSpec omis et un paragraphe trop long. Ces deux écarts ont été corrigés avant la validation finale. Une assertion de distribution restée sur 2.1.70 a été corrigée ; la suite Node complète finale ne comporte aucun échec.

## 2. Types de messages et d’outils

| Domaine | Effectif / résultat |
|---|---|
| Messages par rôle, parties et terminaisons | N/A — aucun export exhaustif |
| Appels d’outils, approbations et refus | N/A — aucune télémétrie de session |
| Réponses réussies des suites de tests | 749 Node.js + 87 Python + 3 tests ciblés ; ces catégories se recouvrent avec les suites complètes et ne sont pas additionnées |
| Décisions de production | 0 décision CAB émise pendant ce correctif |

Les appels synthétiques des tests ne sont pas attribués à une session de production.

## 3. Fichiers modifiés

Le diff local de la livraison contient 79 fichiers. L’état final de chaque chemin est listé ci-dessous. Le nombre exact de tentatives d’écriture, refus ou erreurs par fichier n’est pas mesuré par cette session SCM ; aucun n’est déduit du diff.

| Chemin absolu | Présence dans le diff | Tentatives approuvées / refusées / erreurs |
|---|---|---|
| `/home/devops/datas/cab/.codex/commands/CAB.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/.codex/commands/CABU.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/BUILD.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/CHANGELOG.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/PROJECT.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/README.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/TECHNICAL.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-allow-test-reservations-with-disjoint-active-accesses/design.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-allow-test-reservations-with-disjoint-active-accesses/proposal.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-allow-test-reservations-with-disjoint-active-accesses/specs/codex-integration-distribution/spec.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-allow-test-reservations-with-disjoint-active-accesses/specs/concurrent-run-coordination/spec.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-allow-test-reservations-with-disjoint-active-accesses/specs/opencode-v2-transport/spec.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-allow-test-reservations-with-disjoint-active-accesses/tasks.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/openspec/specs/concurrent-run-coordination/spec.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/openspec/specs/opencode-v2-transport/spec.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/native-coding-recovery.md` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/pyproject.toml` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_journal.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_router.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_server.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/active-component-update.test.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/concurrent-controller.test.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/controller-service-distribution.test.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/monitor-service-start.test.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/native-opencode.test.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/resource-coordination.test.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/test_crash_recovery.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/test_session_reset.py` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |
| `/home/devops/datas/cab/tests/web-monitor.test.mjs` | 1 fichier dans le diff final | N/A — aucune télémétrie des tentatives |

Synthèse : 79/79 chemins attendus présents dans le diff (100,0 %). Fichiers hors périmètre : 0 détecté. Le rapport d’archive est ajouté à ce répertoire après le diff source.

## 4. Commandes

| Famille / commande de validation | Résultat |
|---|---|
| `node --test --test-name-pattern=… tests/resource-coordination.test.mjs` | 3/3 réussis |
| `node --test --test-reporter=tap tests/*.test.mjs` | 749/780 réussis, 31 ignorés, 0 échec |
| `python3 -m unittest discover -s tests -p 'test_*.py'` | 87/87 réussis |
| `node --check` du registre de coordination | Réussie |
| `python3 -m py_compile` des six modules broker/source | Réussie |
| `/home/devops/.local/npm/bin/openspec validate <change> --strict --no-interactive` | Réussie avant archivage après corrections |
| `/home/devops/.local/npm/bin/openspec archive <change> --yes` | Archivage réussi le 2 novembre 2026 |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 16/16 réussis après archivage |
| `/home/devops/.local/npm/bin/openspec validate --archived --strict --no-interactive` | 135/135 réussis |
| `git diff --check` et contrôle UTF-8/LF | Réussis avant l’archivage |

Les effectifs par famille de commandes pour toute la conversation sont N/A, faute de télémétrie exhaustive. Les commandes ci-dessus sont les vérifications observées du change.

## 5. Accès web

Aucune recherche Web ni navigation de page Web n’a été effectuée. Le connecteur GitHub a été utilisé pour consulter `main` et commencer la publication ; 35 objets blob ont été créés avant la création du commit final, sans déplacement de la référence `main` à l’heure de ce rapport. Aucun URL Web approuvé ou refusé n’est donc comptabilisé comme visité.

| Résultat d’accès Web | Effectif | Part |
|---|---:|---:|
| URLs visitées | 0 | N/A |
| Refus d’accès Web | 0 observé | N/A |
| Erreurs d’accès Web | 0 observé | N/A |

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date du rapport | 2 novembre 2026, Europe/Paris |
| Début et durée calendaire de la session | N/A — horodatage de début non disponible |
| Change | `allow-test-reservations-with-disjoint-active-accesses` |
| Archive | `2026-11-02-allow-test-reservations-with-disjoint-active-accesses`, 8/8 tâches terminées |
| Résultat | Une réservation LXC/Docker n’est plus bloquée par des accès HELD, UNKNOWN ou WAITING disjoints du même RUN ; les accès recouvrants gardent leur garde et tous les accès existants restent intacts. |
| Tests | Node.js 749/780 (31 ignorés, 0 échec), Python 87/87, coordination ciblée 3/3 |
| OpenSpec | Strict après archive 16/16 ; validation des archives 135/135 |
| Git local | Sources 2.1.71 et archive validées localement ; publication GitHub et commit final en attente à l’heure de ce rapport |
| CABU | À exécuter après publication, conformément au protocole |
| Secrets | Aucun secret lu ou ajouté ; les tests utilisent des fixtures synthétiques |
| Quotas, tokens, coût et mesures de génération | N/A — télémétrie absente |

Les valeurs N/A indiquent une mesure indisponible ; aucune attribution de quota, coût ou activité à un RUN n’est inventée.
