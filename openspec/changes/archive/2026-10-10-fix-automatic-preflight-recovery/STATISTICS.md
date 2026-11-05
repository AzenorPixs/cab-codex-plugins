# Statistiques — SCM fix-automatic-preflight-recovery

Projet : Codex Approval Bridge, sources 0.87.1. Archive : 2026-10-10-fix-automatic-preflight-recovery.

Session directe Codex autorisée par le développeur, sans pilotage OpenCode/CAB. Le skill coding-session-statistics et ses sondes ne sont pas invoqués conformément à PROMPTS/SCM.md. Le rapport satisfait l’obligation distincte d’archivage d’AGENTS.md §7. Les sources sont les sorties réellement observées, les fichiers autorisés et un journal partiel de validations ; aucune télémétrie absente n’est reconstituée.

## 1. Statistiques générales et décisions

| Mesure | Valeur | Limite |
| --- | --- | --- |
| Début de la période d’implémentation tracée | 2026-10-10T15:07:00+02:00 | Avant la première écriture OpenSpec ; exploration antérieure exclue |
| Fin après archivage et contrôles | 2026-10-10T15:20:27+02:00 | Avant production du rapport |
| Durée de cette période | 00 h 13 min 27 s | Pauses, attentes, tests et archivage inclus |
| Durée globale de la conversation SCM | N/A | Borne initiale complète non collectée |
| Agent | Codex direct | Modèle exact, version, service actif, tokens et coût N/A, télémétrie native non collectée |
| Validation développeur du périmètre | 1 | Inclut coexistence avec les trois anciens changes et archivage de ce seul change |
| Décisions CAB réelles | 0 | Sans objet en SCM ; les refus HTTP des tests sont synthétiques |
| Appels d’outils et messages totaux | N/A | Historique natif exhaustif non collecté |
| Validations journalisées | 24 | Compteur partiel ; lectures, éditions et contrôles ad hoc exclus |

| Suites complètes finales | Réussis | Échecs | Taux |
| --- | --- | --- | --- |
| Node | 44 | 0 | 100 % |
| Python | 38 | 0 | 100 % |
| Total rapporté par les runners | 82 | 0 | 100 % |

Le passage Node ciblé 24/24 est une exécution supplémentaire des mêmes tests et ne s’ajoute pas aux 82 résultats des suites complètes finales. Node compte les sous-tests selon son runner. Trois compilations Python et quatre contrôles Node --check réussis (7/7, 100 %).

Échecs intermédiaires conservés : premier delta OpenSpec avec noms de scénarios omis ; deux attentes Python anciennes de version ; indentation introduite dans une assertion puis corrigée. Les compilations et la suite Python finale sont réussies. Deux commandes visant le venv absent ont retourné 127, sans exécuter les tests ; Python DevOps 3.14.8, repli déclaré dans DEVOPS.md, a été utilisé sans installation.

## 2. Types de messages et d’outils

| Catégorie | Mesure | Couverture |
| --- | --- | --- |
| Agent de codage piloté / orchestrateur séparé | Sans objet | Un agent Codex en SCM direct |
| Messages, parties, terminaisons et compactions | N/A | Pas de collecte native exhaustive |
| Lectures et éditions directes | N/A | Nombre total d’appels non collecté ; chemins contrôlés en section 3 |
| Validations par commande | 24 | Journal explicite, détaillé en section 4 |
| Transport MCP CAB et permissions réelles | Sans objet | Aucune session pilotée dans ce travail |
| Tokens, cache, coût, TTMT, débit | N/A | Non collectés ; aucune sonde ni estimation |
| Quotas Codex avant/après et différence | N/A | Non collectés en SCM direct ; aucun quota fournisseur substitué |

Un exit0 n’est pas une approbation CAB. Les tests HTTP utilisent un faux OpenCode et une commande Codex factice ; leurs décisions et permissions sont des fixtures, pas des autorisations du RUN Pixs. Les contrôles de distribution vérifient le protocole exécuté par l’orchestrateur ; aucun nouvel automate de décision ou endpoint n’est ajouté.

## 3. Fichiers modifiés

| Chemin absolu complet | État | Part des chemins |
| --- | --- | --- |
| /home/devops/datas/cab/ORCHESTRATED_CODING.md | Modifié | 3.8 % |
| /home/devops/datas/cab/.codex/commands/cab.md | Modifié | 3.8 % |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md | Modifié | 3.8 % |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/session-reset.md | Modifié | 3.8 % |
| /home/devops/datas/cab/PROJECT.md | Modifié | 3.8 % |
| /home/devops/datas/cab/TECHNICAL.md | Modifié | 3.8 % |
| /home/devops/datas/cab/BUILD.md | Modifié | 3.8 % |
| /home/devops/datas/cab/README.md | Modifié | 3.8 % |
| /home/devops/datas/cab/CHANGELOG.md | Modifié | 3.8 % |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py | Modifié | 3.8 % |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | Modifié | 3.8 % |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | Modifié | 3.8 % |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | Modifié | 3.8 % |
| /home/devops/datas/cab/pyproject.toml | Modifié | 3.8 % |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | Modifié | 3.8 % |
| /home/devops/datas/cab/tests/controller-session-recovery.test.mjs | Modifié | 3.8 % |
| /home/devops/datas/cab/tests/test_crash_recovery.py | Modifié | 3.8 % |
| /home/devops/datas/cab/tests/test_session_reset.py | Modifié | 3.8 % |
| /home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md | Modifié | 3.8 % |
| /home/devops/datas/cab/openspec/specs/persistent-job-supervision/spec.md | Modifié | 3.8 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-automatic-preflight-recovery/proposal.md | Créé puis archivé | 3.8 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-automatic-preflight-recovery/design.md | Créé puis archivé | 3.8 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-automatic-preflight-recovery/tasks.md | Créé puis archivé | 3.8 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-automatic-preflight-recovery/specs/codex-integration-distribution/spec.md | Créé puis archivé | 3.8 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-automatic-preflight-recovery/specs/persistent-job-supervision/spec.md | Créé puis archivé | 3.8 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-automatic-preflight-recovery/STATISTIQUES.md | Rapport après intervalle | 3.8 % |
| Total | 26 | 100 % |

| Type de chemin | Nombre | Part |
| --- | --- | --- |
| Préexistants modifiés | 20 | 76.9 % |
| Artefacts OpenSpec créés puis déplacés | 5 | 19.2 % |
| Rapport d’archive | 1 | 3.8 % |
| Total | 26 | 100 % |

Ces nombres comptent des chemins distincts, pas des tentatives d’écriture. Compteurs exhaustifs d’écritures approuvées/refusées/en erreur N/A, non collectés en SCM. Les cinq artefacts ont été déplacés une fois par l’archivage autorisé. Les deux deltas et tasks.md ont ensuite reçu la clarification documentaire des contrôles post-archive, sans réarchivage. Les trois changes historiques restent intacts ; 24 fichiers préexistants du périmètre de contrôle restent identiques à leur empreinte. Six fichiers (trois composants runtime, pyproject et deux tests Python) sont vérifiés par inversion du seul numéro 0.87.1 vers 0.87.0. JSON, UTF-8 et LF contrôlés.

Temporaires de validation dans output/scm-tests et caches py_compile régénérables exclus des fichiers de livraison. Aucune source exclue ni état privé de production n’est utilisé.

## 4. Commandes

| Famille journalisée | Total | Part | exit0 | exit non nul |
| --- | --- | --- | --- | --- |
| OpenSpec change | 5 | 20.8 % | 4 (80.0 %) | 1 (20.0 %) |
| Tests Node | 2 | 8.3 % | 2 (100.0 %) | 0 (0.0 %) |
| Interpréteur venv | 1 | 4.2 % | 0 (0.0 %) | 1 (100.0 %) |
| Tests Python | 4 | 16.7 % | 1 (25.0 %) | 3 (75.0 %) |
| Syntaxe Python | 3 | 12.5 % | 3 (100.0 %) | 0 (0.0 %) |
| Syntaxe Node | 4 | 16.7 % | 4 (100.0 %) | 0 (0.0 %) |
| Archivage | 1 | 4.2 % | 1 (100.0 %) | 0 (0.0 %) |
| OpenSpec global / baseline | 4 | 16.7 % | 1 (25.0 %) | 3 (75.0 %) |
| Total | 24 | 100 % | 16 (66.7 %) | 8 (33.3 %) |

| N° | Commande affichée (100 caractères maximum) | Code | Résultat |
| --- | --- | --- | --- |
| 1 | /home/devops/.local/npm/bin/openspec validate fix-automatic-preflight-recovery --strict | 1 | Non nul — qualification ci-dessous |
| 2 | /home/devops/.local/npm/bin/openspec validate fix-automatic-preflight-recovery --strict | 0 | Réussie |
| 3 | TMPDIR=/home/devops/datas/cab/output/scm-tests /home/devops/node/current/bin/node --test tests/cont… | 0 | Réussie |
| 4 | TMPDIR=/home/devops/datas/cab/output/scm-tests /home/devops/node/current/bin/node --test tests/*.te… | 0 | Réussie |
| 5 | /home/devops/datas/cab/.venv/bin/python3 --version | 127 | Non nul — qualification ci-dessous |
| 6 | TMPDIR=/home/devops/datas/cab/output/scm-tests /home/devops/datas/cab/.venv/bin/python3 -B -m unitt… | 127 | Non nul — qualification ci-dessous |
| 7 | TMPDIR=/home/devops/datas/cab/output/scm-tests /home/devops/python/current/bin/python3 -B -m unitte… | 1 | Non nul — qualification ci-dessous |
| 8 | TMPDIR=/home/devops/datas/cab/output/scm-tests /home/devops/python/current/bin/python3 -B -m unitte… | 1 | Non nul — qualification ci-dessous |
| 9 | /home/devops/python/current/bin/python3 -m py_compile src/cgpt_approval_bridge_server.py | 0 | Réussie |
| 10 | /home/devops/python/current/bin/python3 -m py_compile tests/test_crash_recovery.py | 0 | Réussie |
| 11 | /home/devops/python/current/bin/python3 -m py_compile tests/test_session_reset.py | 0 | Réussie |
| 12 | TMPDIR=/home/devops/datas/cab/output/scm-tests /home/devops/python/current/bin/python3 -B -m unitte… | 0 | Réussie |
| 13 | /home/devops/node/current/bin/node --check plugins/cab-approval-bridge/scripts/cgpt-approval-bridge… | 0 | Réussie |
| 14 | /home/devops/node/current/bin/node --check plugins/cab-approval-bridge/scripts/cgpt-approval-bridge… | 0 | Réussie |
| 15 | /home/devops/node/current/bin/node --check tests/controller-service-distribution.test.mjs | 0 | Réussie |
| 16 | /home/devops/node/current/bin/node --check tests/controller-session-recovery.test.mjs | 0 | Réussie |
| 17 | /home/devops/.local/npm/bin/openspec validate fix-automatic-preflight-recovery --strict | 0 | Réussie |
| 18 | /home/devops/.local/npm/bin/openspec validate fix-automatic-preflight-recovery --strict | 0 | Réussie |
| 19 | /home/devops/.local/npm/bin/openspec archive fix-automatic-preflight-recovery --yes --json | 0 | Réussie |
| 20 | /home/devops/.local/npm/bin/openspec validate --specs --strict --json | 1 | Non nul — qualification ci-dessous |
| 21 | /home/devops/.local/npm/bin/openspec validate --specs --strict --json [fixture préchange byte-ident… | 1 | Non nul — qualification ci-dessous |
| 22 | /home/devops/.local/npm/bin/openspec validate --specs --strict --json | 1 | Non nul — qualification ci-dessous |
| 23 | /home/devops/.local/npm/bin/openspec validate --specs --json | 0 | Réussie |
| 24 | /home/devops/.local/npm/bin/openspec validate fix-automatic-preflight-recovery --strict --json [cop… | 0 | Réussie |

Journal de 24 invocations (16 exit0, 66.7 % ; 8 non nulles, 33.3 %), sans prétendre compter toutes les commandes de la session. Les libellés [fixture préchange byte-identique] et [copie exacte archive] précisent le répertoire temporaire, pas des arguments supplémentaires. Textes longs tronqués pour affichage ; commandes de test et résultats exacts sont décrits dans tasks.md. Aucune commande refusée par une permission CAB réelle ; sans objet en SCM.

Les huit résultats non nuls se répartissent en trois échecs corrigés (delta initial et deux passages Python), deux invocations non exécutables faute de venv, et trois contrôles stricts globaux/baseline qualifiés. Le premier strict global avait 17 WARNING ; quatre provenaient des nouvelles présentations et ont été supprimés en transférant les détails vers les scénarios, sans changer le contrat. Le strict final reste exit1, 1/7, pour les 13 WARNING inchangés ci-dessous ; il n’est pas déclaré réussi. Sans --strict : exit0, 7/7, mêmes WARNING, zéro ERROR. Le delta archivé final est validé --strict, 1/1, issues[], dans une copie exacte isolée.

| Capacité | Niveau | Chemin | Motif |
| --- | --- | --- | --- |
| approval-persistence | WARNING | requirements[3] | Texte d’exigence >500 caractères |
| approval-persistence | WARNING | requirements[4] | Texte d’exigence >500 caractères |
| approval-workflow | WARNING | requirements[0] | Texte d’exigence >500 caractères |
| archive-session-statistics | WARNING | requirements[0] | Texte d’exigence >500 caractères |
| archive-session-statistics | WARNING | requirements[1] | Texte d’exigence >500 caractères |
| codex-integration-distribution | WARNING | requirements[1] | Texte d’exigence >500 caractères |
| controller-transport | WARNING | requirements[1] | Texte d’exigence >500 caractères |
| controller-transport | WARNING | requirements[5] | Texte d’exigence >500 caractères |
| controller-transport | WARNING | requirements[6] | Texte d’exigence >500 caractères |
| controller-transport | WARNING | requirements[7] | Texte d’exigence >500 caractères |
| persistent-job-supervision | WARNING | requirements[0] | Texte d’exigence >500 caractères |
| persistent-job-supervision | WARNING | requirements[1] | Texte d’exigence >500 caractères |
| persistent-job-supervision | WARNING | requirements[3] | Texte d’exigence >500 caractères |

Les treize tuples capacité/niveau/chemin/message sont identiques entre la fixture antérieure et le strict final. Les deux fichiers reconstruits de la fixture correspondent byte pour byte aux empreintes initiales :

| Fichier avant modification | SHA-256 |
| --- | --- |
| openspec/specs/codex-integration-distribution/spec.md | 5773f05153fc9310c506cc9789d423da9c93a788409b492baf7831a57bb9750a |
| openspec/specs/persistent-job-supervision/spec.md | d6c093a80faada45d91a842dffc00a8ff5607819103d01d956dd067ee56c0db6 |

Les autres capacités sont copiées depuis leurs sources non modifiées par ce travail. Les cinq exigences changées ne produisent plus de nouveau WARNING. Aucun test n’est désactivé ni affaibli pour obtenir un résultat vert. Les tests Python de version restent des assertions exactes 0.87.1.

## 5. Accès web

| Accès | Nombre | Limite |
| --- | --- | --- |
| Navigation web / URL visitée | 0 | Aucun outil web invoqué |
| Appel fournisseur ou compte distant | 0 | Aucun benchmark ni sonde de pilotage |
| HTTP local des tests | N/A | Services simulés en loopback ; nombre de requêtes non collecté |
| Journal réseau exhaustif | N/A | Non collecté ; aucune absence globale de réseau inférée |

Pas d’URL visitée ou refusée à lister. Taux d’approbation/refus/erreur web N/A : dénominateur zéro. Les services locaux simulés et leurs processus sont arrêtés par les fixtures ; aucun service utilisateur CAB ni processus OpenCode réel n’est démarré, arrêté ou redémarré par ce SCM.

## 6. Synthèse globale

| Contrôle | Résultat |
| --- | --- |
| Version des sources | 0.87.1 ; cachebuster distinct du plugin |
| Tests complets finaux | 44 Node + 38 Python = 82 réussis (100 %), zéro échec final |
| Syntaxe | 3 compilations Python + 4 contrôles Node = 7/7 (100 %) |
| Delta final archivé | --strict, exit0, 1/1, issues[] sur copie exacte |
| Canon global | Sans --strict : exit0, 7/7 ; strict : exit1, 13 WARNING inchangés, zéro ERROR |
| Archivage | Une exécution exit0, specsUpdated=true, cinq exigences modifiées, zéro suppression |
| Rapport | Six sections, UTF-8/LF et totaux vérifiés après écriture |
| Installation et publication | Non exécutées ; sources corrigées, profil et services existants non déployés |
| RUN Pixs | Non repris par ce SCM ; aucune écriture du projet Pixs |
| Git | État non inspecté ; aucun commit, branche, tag ou push |
| Secrets | Aucun ajouté dans les contenus contrôlés ; aucune assertion exhaustive sur les sources exclues |

La matrice documentaire finale et les commandes essentielles sont consignées dans tasks.md : AGENTS.md et DEVOPS.md inchangés avec justification, protocole local et distribué aligné, PROJECT/TECHNICAL/BUILD/README/CHANGELOG actualisés, deux capacités synchronisées. L’identité du document local, héritée de Pixs, est corrigée vers CAB. L’absence transitoire du document au premier contrôle s’est résolue avant édition ; aucune restauration forcée.

Le correctif automatise le protocole de l’orchestrateur après un prévol incomplet prouvé et refusé sans effet. Il conserve polling sur timeout seul, gardes de purge, décision explicite de chaque prévol neuf et interdiction de reprise métier avant preuve. Effet inconnu, preuve absente, propriété incertaine ou purge partielle restent bloquants. La validation isolée ne prouve pas une récupération réelle OpenCode : installation et essai d’intégration relèvent d’une étape distincte autorisée.
