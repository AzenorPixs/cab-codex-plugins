# Statistiques SCM — minimize-integration-exclusion

Session directe autorisée le 16 octobre 2026 : premier lot, propositions 1 à 4.
Archive : `/home/devops/datas/cab/openspec/changes/archive/2026-10-16-minimize-integration-exclusion`. Sources : baseline.json, review.json, validation.json et
sorties de tests dans `/home/devops/datas/cab/output/scm/minimize-integration-exclusion`. Le bilan final ne recompte pas les essais intermédiaires.
Aucune compétence statistique de pilotage ni sonde n'a été activée en SCM.

## 1. Statistiques générales et décisions

| Mesure | Valeur |
|---|---:|
| Tests finaux exécutés | 223 (100 %) |
| Tests réussis | 223 (100 %) |
| Tests échoués, ignorés ou annulés dans la passe finale | 0 (0 %) |
| Suites finales réussies | 12/12 (100 %) |
| Fichiers existants modifiés | 18 |
| Exigences canoniques ajoutées | 5 |
| Archives réalisées | 1 |
| Décisions et permissions sur RUN actifs | 0 — aucune interaction avec ces RUN |
| Tokens, cache, coût, compactions et temps de génération | N/A — télémétrie de pilotage sans objet en SCM |

Les réponses once synthétiques des fixtures ne sont pas des décisions de production.
Un appel d'outil réussi ne prouve pas une approbation humaine distincte.

## 2. Types de messages et d'outils

Les 223 cas de test sont ventilés ci-dessous ; leur part a pour dénominateur 223.
Les compteurs exhaustifs des messages et outils de l'agent restent N/A : aucun
collecteur de pilotage n'a été activé. Les arrondis sont à une décimale.

| Suite | Tests | Part | Réussis | Échoués |
|---|---:|---:|---:|---:|
| python | 52 | 23.3 % | 52 | 0 |
| concurrent-controller.test | 22 | 9.9 % | 22 | 0 |
| concurrent-run-registry.test | 22 | 9.9 % | 22 | 0 |
| concurrent-supervisor.test | 1 | 0.4 % | 1 | 0 |
| controller-configuration.test | 13 | 5.8 % | 13 | 0 |
| controller-healthcheck-compatibility.test | 6 | 2.7 % | 6 | 0 |
| controller-job-restoration.test | 27 | 12.1 % | 27 | 0 |
| controller-service-distribution.test | 17 | 7.6 % | 17 | 0 |
| controller-session-recovery.test | 41 | 18.4 % | 41 | 0 |
| native-opencode.test | 1 | 0.4 % | 1 | 0 |
| native-statistics.test | 10 | 4.5 % | 10 | 0 |
| persistent-job-supervisor.test | 11 | 4.9 % | 11 | 0 |
| Total | 223 | 100 % | 223 | 0 |

## 3. Fichiers modifiés

| Chemin absolu | État |
|---|---|
| /home/devops/datas/cab/BUILD.md | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/CHANGELOG.md | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/ORCHESTRATED_CODING.md | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/PROJECT.md | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/README.md | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/TECHNICAL.md | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/openspec/specs/concurrent-run-coordination/spec.md | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/tests/concurrent-controller.test.mjs | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/tests/concurrent-run-registry.test.mjs | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/tests/concurrent-supervisor.test.mjs | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/tests/test_piloted_prompts.py | Modification source/documentation/test vérifiée |
| /home/devops/datas/cab/tests/test_session_reset.py | Modification source/documentation/test vérifiée |

Les quatre artefacts du change ont été déplacés par OpenSpec vers cette archive :
proposal.md, design.md, tasks.md et specs/concurrent-run-coordination/spec.md.
Le présent STATISTIQUES.md est créé après archive. Les preuves locales sont dans
output/scm/minimize-integration-exclusion et ne sont pas destinées à Git.
Les nombres de tentatives d'écriture approuvées/refusées/en erreur sont N/A :
les hashes prouvent les contenus finaux, pas les effectifs d'appels.
Aucun fichier de code n'a été supprimé ; aucun prompt protégé n'a été modifié.

## 4. Commandes

Les 12 commandes de suites finales ci-dessous ont réussi (12/12, 100 %).
Elles ne constituent pas un inventaire exhaustif des commandes d'analyse et d'édition.

| Suite | Commande | Exit |
|---|---|---:|
| python | `python3 -B -m unittest discover -s tests -p test_*.py -v` | 0 |
| concurrent-controller.test | `node --test --test-isolation=none --test-reporter=tap tests/concurrent-controller.test.mjs` | 0 |
| concurrent-run-registry.test | `node --test --test-isolation=none --test-reporter=tap tests/concurrent-run-registry.test.mjs` | 0 |
| concurrent-supervisor.test | `node --test --test-isolation=none --test-reporter=tap tests/concurrent-supervisor.test.mjs` | 0 |
| controller-configuration.test | `node --test --test-isolation=none --test-reporter=tap tests/controller-configuration.test.mjs` | 0 |
| controller-healthcheck-compatibility.test | `node --test --test-isolation=none --test-reporter=tap tests/controller-healthcheck-compatibility.test.mjs` | 0 |
| controller-job-restoration.test | `node --test --test-isolation=none --test-reporter=tap tests/controller-job-restoration.test.mjs` | 0 |
| controller-service-distribution.test | `node --test --test-isolation=none --test-reporter=tap tests/controller-service-distribution.test.mjs` | 0 |
| controller-session-recovery.test | `node --test --test-isolation=none --test-reporter=tap tests/controller-session-recovery.test.mjs` | 0 |
| native-opencode.test | `node --test --test-isolation=none --test-reporter=tap tests/native-opencode.test.mjs` | 0 |
| native-statistics.test | `node --test --test-isolation=none --test-reporter=tap tests/native-statistics.test.mjs` | 0 |
| persistent-job-supervisor.test | `node --test --test-isolation=none --test-reporter=tap tests/persistent-job-supervisor.test.mjs` | 0 |

Syntaxe : cinq fichiers Node contrôlés avec node --check et quatre fichiers Python
avec py_compile, compilations dirigées vers output. OpenSpec strict ciblé réussi,
puis global préarchive 10/10 et post-archive 9/9, tous exit 0. Archive :
`openspec archive minimize-integration-exclusion --yes --json`, exit 0,
specsUpdated=true, cinq exigences ajoutées, aucune modifiée ou supprimée.

Une passe intermédiaire a échoué sur concurrent-supervisor : attente fixe de
1200 ms face à un délai de 1000 ms et une cadence de 250 ms. La fixture attend
maintenant l'état exact sous borne et conserve toutes ses assertions ; le code
du superviseur reste inchangé. validation-failed.json conserve l'échec.
Une tentative initiale de lecture Git a échoué sur la propriété du dépôt ;
aucune configuration Git n'a été modifiée ni aucune inspection renouvelée.
Aucune commande refusée par l'approbation automatique n'a été observée.

## 5. Accès web

Aucune navigation web ni transmission à un fournisseur LLM n'a été effectuée.
Les échanges réseau des tests sont limités aux fixtures loopback isolées ; aucun
endpoint des RUN actifs n'a été appelé. Le smoke OpenCode utilise une instance
éphémère, sans modèle, avec répertoires XDG et ports propres. Aucune URL de
production n'a été visitée. Les taux web sont N/A — dénominateur nul.

## 6. Synthèse globale

| Mesure | Valeur |
|---|---|
| Début mesuré | 16/10/2026 06:01:39 CEST |
| Fin après archive et strict, avant rédaction | 16/10/2026 06:22:47 CEST |
| Durée calendaire, pauses et validations incluses | 00 h 21 min 07 s |
| Quota Codex avant/après et différence | N/A — aucun relevé de quota en SCM |
| Python | 52/223 (23,3 %) réussis |
| Node | 171/223 (76,7 %) réussis |
| Total des tests finaux | 223/223 (100 %) réussis |
| Archive | Réalisée, delta synchronisé et tâches finalisées |
| Publication source | Préparée localement, sans déploiement ni migration active |
| Git | Aucun commit, push, branche ou configuration modifié |
| Secrets | Aucune source sensible ouverte ni valeur sensible ajoutée |

La réduction observée par fixture est de neuf à cinq lectures natives pour trois
RUN et un contrôle de cohorte. Aucun gain de durée sur RUN actifs n'est revendiqué.
Les validations combinées, décisions unitaires, ask/once, rapport et gate restent
requis. Le schéma 3 exige une distribution compatible et un retour arrière
coordonné. Les instantanés immuables restent à valider séparément.
