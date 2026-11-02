### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent OpenCode identifiable — intervention SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex — orchestration et modification SCM directe | N/A — version exacte non exposée par la télémétrie disponible | N/A | N/A | N/A | N/A | N/A |

Les sondes périodiques n’ont pas été activées pour cette intervention SCM directe. Les métriques d’agent, quota partagé et durée complète ne sont pas mesurables rétrospectivement.

## 1. Statistiques générales et décisions

| Mesure | Résultat |
|---|---:|
| Tests client OpenCode V2 | 61/61 réussis |
| Tests natifs d’annulation et de préservation | 15/15 réussis |
| Contrôles de distribution | 33/33 réussis |
| Total final des tests ciblés | 109/109 — 100 % |
| Validation stricte des changes actifs avant archivage | 2/2 valides |
| Validation stricte des specs principales | 16/16 valides |
| Compilation syntaxique Python | Réussie, 6 fichiers |
| Vérification syntaxique JavaScript | Réussie |
| `git diff --check` | Réussie |
| Appels natifs de décision, permission ou `once` | 0 |
| Tokens, cache, coût, TTMT et débit | N/A — télémétrie absente |

Les journaux du contrôleur ont révélé des échecs de lecture d’historique par pagination. La cause était l’omission de la location explicite de session dans les requêtes `messages()`. Le correctif ajoute cette location sur chaque page. Une première exécution du nouveau test avait une fixture assistant incomplète ; la fixture a été corrigée et la suite finale a réussi. Une première validation OpenSpec stricte signalait un scénario conservé manquant dans la delta modifiée ; le scénario a été réintégré avant la validation finale.

À la rédaction du rapport, CAB 2.1.73 reste la version active. L’opération contrôlée demeure `PREPARED`, sans décision, accès, permission ni `once`; aucun build n’a été lancé. La source 2.1.74, son archivage et ce rapport attendent la publication SCM puis CABU.

## 2. Types de messages et d’outils

Aucun journal de télémétrie de session n’est disponible pour compter les messages, rôles, outils ou résultats. Un transcript natif a été lu en lecture seule et filtré localement pour vérifier les identités, la requête et l’annulation ; son contenu n’est pas recopié ici. Le nombre de pages HTTP exactes n’est pas enregistré par un agrégateur de session. Aucun appel natif n’a été répondu ni rejoué.

## 3. Fichiers modifiés

La liste porte sur les fichiers modifiés ou archivés pour la location d’historique, la version commune 2.1.74, ses tests et son cadrage. Les nombres d’écritures approuvées, refusées ou en erreur sont `N/A` faute de journal de tentatives de fichiers dans une session SCM directe.

| Chemin complet | État | Écritures approuvées/refusées/en erreur |
|---|---|---|
| `/home/devops/datas/cab/.codex/commands/CAB.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/.codex/commands/CABU.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/BUILD.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/CHANGELOG.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/PROJECT.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/README.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/TECHNICAL.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-scope-session-history-reads-to-directory/STATISTICS.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-scope-session-history-reads-to-directory/design.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-scope-session-history-reads-to-directory/proposal.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-scope-session-history-reads-to-directory/specs/codex-integration-distribution/spec.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-scope-session-history-reads-to-directory/specs/opencode-v2-transport/spec.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-scope-session-history-reads-to-directory/tasks.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/openspec/specs/opencode-v2-transport/spec.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/native-coding-recovery.md` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/pyproject.toml` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_journal.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_router.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_server.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/active-component-update.test.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/concurrent-controller.test.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/controller-service-distribution.test.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/monitor-service-start.test.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/native-opencode.test.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/opencode-v2-client.test.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/test_crash_recovery.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/test_session_reset.py` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |
| `/home/devops/datas/cab/tests/web-monitor.test.mjs` | Modifiée/archivée | N/A — intervention SCM directe sans télémétrie de tentatives |

## 4. Commandes

Les taux d’approbation des commandes système sont `N/A` faute d’un journal d’exécution instrumenté. Résultats finaux des commandes de vérification :

| Famille | Résultat final |
|---|---|
| Tests client V2 — `node --test tests/opencode-v2-client.test.mjs` | 61/61 réussis |
| Tests d’annulation — `node --test --test-name-pattern='annulation native OC' tests/concurrent-controller.test.mjs` | 15/15 réussis |
| Distribution — `node --test tests/controller-service-distribution.test.mjs` | 33/33 réussis |
| OpenSpec — validation stricte des changes | 2/2 valides |
| OpenSpec — validation stricte des specs | 16/16 valides |
| OpenSpec — archives strictes | 139/139 valides avant l’archivage de ce change |
| Syntaxe JavaScript, compilation Python, contrôle du diff | Réussis |
| Commandes refusées | Aucune permission refusée ; les erreurs initiales de fixture/contrat sont décrites en section 1 |

Le total final des tests ciblés est 109/109 (100 %). Les premiers essais corrigés ne sont pas comptés comme refus d’autorisation.

## 5. Accès web

Aucune requête via l’outil Web n’a été ouverte pour ce change : 0 accès approuvé, 0 accès refusé et 0 erreur. Aucun URL refusé ni URL visité n’est à lister.

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

La variation de quota est partagée par le compte et n’est pas attribuable à cette intervention. Le total final des tests est 109/109 (100 %). Les taux globaux des écritures de fichiers et des appels d’outils sont `N/A`, leurs dénominateurs n’étant pas instrumentés.

L’archivage OpenSpec a réussi. La publication Git complète et CABU sont en attente au moment de la rédaction ; le rapport sera inclus dans la même publication SCM. Aucun accès externe ou secret n’a été lu. Les RUN, réservations de test, permissions et effets natifs n’ont pas été modifiés.
