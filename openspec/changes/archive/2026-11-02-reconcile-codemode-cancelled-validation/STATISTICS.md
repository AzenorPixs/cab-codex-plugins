### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent OpenCode identifiable — intervention SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex — orchestration et modification SCM directes | N/A — version exacte non exposée par la télémétrie disponible | N/A | N/A | N/A | N/A | N/A |

Les sondes périodiques n’ont pas été activées pour cette intervention SCM directe. Les métriques d’agent, quota partagé et durée complète ne sont pas mesurables rétrospectivement.

## 1. Statistiques générales et décisions

| Mesure | Résultat |
|---|---:|
| Tests ciblés finaux réussis | 48/48 — 100 % |
| Validation stricte OpenSpec des changes actifs | 2/2 — 100 % |
| Validation stricte des specs principales | 16/16 — 100 % |
| Vérification syntaxique JavaScript | Réussie |
| Compilation syntaxique Python | Réussie, 6 fichiers |
| `git diff --check` | Réussie |
| Appels natifs OpenCode / permissions / décisions | 0 dans cette intervention SCM |
| Tokens, cache, coût, TTMT et débit du modèle | N/A — télémétrie absente |

Les premiers essais de qualification ont révélé un mélange temporaire de versions source et des attentes de test restées en 2.1.72. Les composants ont ensuite été alignés en 2.1.73, les assertions corrigées et toutes les suites finales ci-dessus ont passé. Une première assertion négative a été ajustée pour mesurer l’état durable `PREPARED`, plutôt que le compteur de validations indécises qui n’est pas une preuve de protection.

## 2. Types de messages et d’outils

Aucun journal persistant de conversation ou de session native n’a été utilisé pour mesurer les messages et outils. Les comptes par rôle, type de partie et résultat d’outil sont `N/A`. Aucun refus de permission n’a été observé ; les échecs initiaux mentionnés en section 1 étaient des erreurs de qualification corrigées, pas des refus.

## 3. Fichiers modifiés

Le rapport couvre le change Code Mode et la cohorte de versions communes préparée pour sa livraison. Les nombres d’écritures approuvées, refusées ou en erreur sont `N/A` : cette intervention directe n’a pas de journal d’approbations/fichiers natifs. La liste inclut les documents, composants, tests et artefacts OpenSpec effectivement modifiés ou archivés.

| Chemin complet | État | Écritures approuvées/refusées/en erreur |
|---|---|---|
| `/home/devops/datas/cab/.codex/commands/CAB.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/.codex/commands/CABU.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/BUILD.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/CHANGELOG.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/PROJECT.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/README.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/TECHNICAL.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-codemode-cancelled-validation/STATISTICS.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-codemode-cancelled-validation/design.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-codemode-cancelled-validation/proposal.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-codemode-cancelled-validation/specs/opencode-v2-transport/spec.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-codemode-cancelled-validation/tasks.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/specs/opencode-v2-transport/spec.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/native-coding-recovery.md` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/pyproject.toml` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_journal.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_router.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_server.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/active-component-update.test.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/concurrent-controller.test.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/controller-service-distribution.test.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/monitor-service-start.test.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/native-opencode.test.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/test_crash_recovery.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/test_session_reset.py` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/web-monitor.test.mjs` | Modifiée/archivée | N/A — session SCM directe sans télémétrie de tentatives |

## 4. Commandes

Les taux d’approbation des commandes système sont `N/A` faute d’un journal d’exécution instrumenté. Les commandes de vérification pertinentes et leur résultat final :

| Famille | Résultat final |
|---|---|
| Tests natifs d’annulation — `node --test --test-name-pattern='annulation native OC' tests/concurrent-controller.test.mjs` | 15/15 réussis |
| Distribution — `node --test tests/controller-service-distribution.test.mjs` | 33/33 réussis |
| OpenSpec — validation stricte des changes | 2/2 valides |
| OpenSpec — validation stricte des specs | 16/16 valides |
| Syntaxe JavaScript, compilation Python, contrôle du diff | Réussis |
| Commandes refusées | Aucune permission refusée ; les essais de diagnostic invalides n’ont produit aucune mutation runtime |

Le total final des tests exécutés est 48, dont 48 réussis (100 %). Les essais initiaux échoués et leur cause sont décrits en section 1, sans les présenter comme des refus d’autorisation.

## 5. Accès web

Aucune requête web ou URL n’a été ouverte pendant le change : 0 accès approuvé, 0 accès refusé et 0 erreur d’accès web. Il n’existe donc aucune URL effectivement visitée ni refusée à lister.

## 6. Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — début de l’intervention non instrumenté |
| Fin — après archivage | N/A — horodatage final de l’agent non capturé |
| Durée globale (pauses et attentes incluses) | N/A — une borne manque |

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — relevé initial absent | N/A | N/A |
| Après — après archivage de la spécification | N/A — non mesuré pour cette session SCM directe | N/A | N/A |
| Différence après − avant | — | N/A — relevés absents | — |

La variation de quota est partagée par le compte et n’est pas attribuable à cette intervention. Le total de tests finaux est 48/48 (100 %). Les taux globaux des écritures de fichiers et des appels d’outils sont N/A, leurs dénominateurs n’étant pas instrumentés.

L’archivage OpenSpec a réussi. La publication Git complète et CABU sont encore en attente au moment de la rédaction de ce rapport ; ce fichier sera inclus dans la publication SCM autorisée. Aucun accès externe ni secret n’a été lu ou utilisé.
