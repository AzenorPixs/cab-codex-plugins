# Statistiques — correctif de nouvelle réservation CAB 1.6.4

## 1. Statistiques générales et décisions

Session directe SCM du 20 octobre 2026, projet Codex Approval Bridge (`cab`). Je corrige la nouvelle réservation d'un RUN après STOP et libération réconciliée, puis j'aligne les briques distribuées sur 1.6.4. Le cycle OpenSpec est validé, y compris l'archivage de `fix-stopped-run-rereservation` et ce rapport. Les travaux de monitoring 1.6.3 sont conservés.

| Mesure | Valeur et preuve |
| --- | --- |
| Change archivé | `2026-10-20-fix-stopped-run-rereservation` ; reçu natif OpenSpec, `specsUpdated: true` |
| Identité du chat | `01a15923-c085-7cc3-81d7-bbea37d1cf8a` |
| RUN CAB / session OpenCode pour SCM | N/A : SCM est exécuté directement par Codex, sans pilotage CAB |
| RUN Pixs en attente, distinct de SCM | `cismp1-pixs-d4031c8c16a3409d` ; son adoption Auth reste à reprendre après disponibilité du correctif runtime |
| Durée totale, tokens, coût et quotas | N/A : aucune collecte de pilotage déclenchée pour SCM ; pas de reconstruction rétrospective |
| Décisions de périmètre | Correctif et version 1.6.4 validés, puis cycle OpenSpec explicitement inclus |
| Décisions ou permissions CAB produites par SCM | 0 ; aucune approbation métier ni permission native héritée |
| Delta synchronisé | 2 exigences ajoutées, 0 modifiée, 0 supprimée ; 5 scénarios |

Les suspensions actives, le gel global, le propriétaire, les générations, les dépendances et les ressources restent contrôlés. La génération close conserve son STOP dans l'historique ; la nouvelle génération ne l'hérite pas. Aucun changement de schéma, migration, dépendance, commit, push, tag, publication Git ou activation runtime n'est effectué par cette préparation source.

## 2. Types de messages et d'outils

Les opérations utilisent `exec_command`, `write_stdin` et `apply_patch` pour lectures ciblées, modifications locales, tests, validation et archivage. Les deux décisions de périmètre sont conservées dans la conversation. Le nombre global de messages, appels d'outils et leur répartition temporelle est N/A : aucun collecteur exhaustif SCM n'est disponible. Les processus HTTP de test sont des fixtures isolées, pas des sessions de production.

Les quatre nouvelles régressions échouent avant correction sur le défaut `run-stop` et réussissent ensuite. Ces échecs attendus de tests ne sont ni des refus CAB ni des permissions consommées. La première validation du delta signale une exigence trop longue ; sa séparation en deux exigences permet la validation stricte avant toute écriture de code ou de test. Le premier archivage JSON est refusé car ses deux tâches de clôture, archivage et rapport, ne peuvent être cochées avant leurs preuves. L'archivage explicitement autorisé est ensuite exécuté avec `--yes --json` ; ces deux tâches sont finalisées sur leurs preuves réelles dans l'archive.

## 3. Fichiers modifiés

Le périmètre final comprend 58 fichiers, répartis sans double comptage ci-dessous. Les quatre artefacts du change actif sont déplacés par OpenSpec dans cette seule nouvelle archive. Les archives antérieures ne sont pas modifiées.

| Groupe | Nombre | Périmètre |
| --- | ---: | --- |
| Supports et configuration de version | 8 | `.codex/commands/cab.md`, `pyproject.toml`, `PROJECT.md`, `TECHNICAL.md`, `BUILD.md`, `README.md`, `ORCHESTRATED_CODING.md`, `CHANGELOG.md` |
| Canon OpenSpec | 3 | `concurrent-run-coordination`, `codex-integration-distribution`, `native-session-statistics` ; version 1.6.4 et deux exigences de reprise dans la première capacité |
| Scripts distribués | 19 | Les 16 modules `.mjs` et 3 scripts `.py` de `plugins/cab-approval-bridge/scripts/` ; correction fonctionnelle limitée à `ResourceRunRegistry.reserve` |
| Skills et références distribués | 6 | Deux `SKILL.md` ; références `concurrent-runs.md`, `monitor-service.md`, `run-lifecycle.md`, `observations.md` |
| Unités systemd distribuées | 3 | Descriptions de version controller, supervisor et monitor ; aucun service réel remplacé |
| Manifeste plugin | 1 | `1.6.4+codex.20261020162951` |
| Ressource web | 1 | `web-monitor/index.html` : version affichée |
| Broker Python | 3 | Versions de `cgpt_approval_bridge_server.py`, `cgpt_approval_bridge_router.py`, `cgpt_approval_bridge_journal.py` |
| Tests | 9 | `resource-coordination.test.mjs`, `concurrent-controller.test.mjs`, `controller-service-distribution.test.mjs`, `monitor-service-start.test.mjs`, `native-opencode.test.mjs`, `test_crash_recovery.py`, `test_session_reset.py`, `web-monitor-browser.mjs`, `web-monitor.test.mjs` |
| Artefacts du change archivé | 4 | `proposal.md`, `design.md`, `tasks.md`, delta `specs/concurrent-run-coordination/spec.md` |
| Rapport d'archive | 1 | `STATISTIQUES.md` |
| Total | 58 | 51 fichiers de version, 2 autres fichiers existants et 5 fichiers de cette archive |

Le nombre de lignes ajoutées ou retirées est N/A : l'état Git n'est pas inspecté. Une vérification d'empreintes confirme que 46 des 51 fichiers de version ne reçoivent aucune modification supplémentaire après cet alignement ; les cinq exceptions sont le manifeste et les quatre supports documentant le comportement ou son protocole embarqué. Les tests de régression et le correctif précèdent cette prise d'empreintes. Aucun autre changement préexistant n'est attribué à cette session.

## 4. Commandes

| Validation | Résultat observé |
| --- | --- |
| `openspec validate fix-stopped-run-rereservation --strict --no-interactive --json` avec le binaire DEVOPS | Réussie après correction documentaire : 1/1, sans problème |
| Node ciblé, motif `stopped abandoned\|stopped delivered\|fresh reservation preserves\|arrêté puis abandonné` sur les deux fichiers de régression | Avant correctif : 4 échecs ; après correctif : 4 réussites |
| `/home/devops/node/current/bin/node --test tests/*.test.mjs` | 283 collectés : 282 réussis, 0 échec, 1 ignoré ; 15,707 s |
| `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` | 67 réussis, 0 échec ; 5,985 s |
| `/home/devops/python/current/bin/python3 -m py_compile` sur les sources et tests Python modifiés | Réussie : 8 fichiers |
| `/home/devops/node/current/bin/node --check` sur chaque module/test JavaScript modifié | Réussie : 23 fichiers |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive --json` avant archivage | Réussie : 12/12, dont 1 change et 11 capacités |
| `/home/devops/.local/npm/bin/openspec archive fix-stopped-run-rereservation --yes --json` | Réussie : archive créée et 2 exigences synchronisées |
| Même validation globale stricte après archivage | Réussie : 11/11 capacités ; aucun change actif |
| UTF-8/LF et intégrité des fichiers du périmètre | 57 fichiers contrôlés avant archivage ; rapport et tâches de clôture contrôlés ensuite |

Les suites complètes représentent 349 tests réussis et un test ignoré, soit 350 collectés. Les quatre tests ciblés sont déjà inclus dans cette couverture et ne s'y ajoutent pas. Le test natif OpenCode optionnel reste ignoré ; aucune qualification du runtime Pixs ou d'une installation utilisateur n'est déduite de ces fixtures. Les tests navigateur autonomes ne sont pas exécutés : la seule modification web est le numéro de version, sans changement visuel ou interactif.

La réconciliation synthétique Python traite 694 approbations et 16 774 événements avec une seule lecture initiale du journal en 0,127 s ; la liste synthétique utilise une lecture en 0,131 s. Ces mesures des régressions existantes ne sont pas des performances de production.

## 5. Accès web

Aucune recherche web ni lecture distante n'est nécessaire pendant cette préparation source SCM. Les lectures du manifeste publié effectuées lors du diagnostic précédent ne sont pas comptabilisées comme mesures de cette session. Les fixtures HTTP locales des tests restent distinctes des accès externes. Aucune clé, configuration sensible ou donnée de production n'est utilisée dans les preuves du rapport.

## 6. Synthèse globale

Je dispose d'un correctif source 1.6.4 validé, de quatre régressions nouvelles et d'une archive synchronisée. La reprise après STOP/ABANDONED fonctionne dans le registre restauré et via le contrôleur HTTP redémarré, avec contexte neuf, historique intact et aucune permission transmise par la réservation. La source 1.6.3 de monitoring reste incluse ; aucune remise à zéro de ses travaux n'est effectuée.

| Élément de cohérence | État et justification |
| --- | --- |
| Projet réel | Sources 1.6.4 vérifiées ; installation active distincte et non remplacée par SCM |
| `AGENTS.md` | Inchangé : règles de périmètre, secrets et Git conservées |
| `PROJECT.md` | Mis à jour : version de référence et architecture distribuée 1.6.4 |
| `TECHNICAL.md` | Mis à jour : versions et section Contextes concurrents, portée des suspensions historiques |
| `BUILD.md` | Mis à jour : jeu de distribution 1.6.4 ; séparation préparation source et déploiement conservée |
| `DEVOPS.md` | Inchangé : aucun runtime, outil ou environnement de développement modifié |
| `README.md` | Mis à jour : version, comportement de reprise et limite source/runtime |
| `CHANGELOG.md` | Entrée 1.6.4 ajoutée ; préparation 1.6.3 et historique conservés |
| `ORCHESTRATED_CODING.md` | Versions et référence embarquée de coordination alignées ; SCM reste une session directe |
| OpenSpec | Deux exigences, cinq scénarios ajoutés ; change archivé et validation stricte après archivage réussie |

Les métriques de pilotage, quotas, temps productif, tokens, coûts et gains causaux restent N/A avec les motifs indiqués. Le rapport ne prouve ni publication Git, ni mise à jour marketplace, ni activation runtime, ni adoption des deltas Auth Pixs. Ces étapes restent séparées de la clôture source SCM.
