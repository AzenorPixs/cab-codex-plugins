# Statistiques SUP10 — CAB 2.1.6

Projet : Codex Approval Bridge (`cab`). Change : `fix-cab-shutdown-on-opencode-exit`. Code : **SUP10**, attribué par CAB-ACL-R5. Session Codex : `01a18452-ca39-7f51-b790-242a9de65156`. Mode : **SCM direct**, un agent de codage ; aucun orchestrateur de codage ni RUN CAB créé pour ce mandat. Rapport établi après archive le 2026-10-28T22:19:25.799864+00:00.

## 1. Statistiques générales et décisions

| Mesure | Résultat et preuve |
|---|---|
| Périmètre | Fermeture liée au serveur OpenCode, distribution source 2.1.6, tests, archive et statistiques. Extension ciblée du sceau validée explicitement. |
| Tâches | 7/7 validées ; voir tasks.md et QUALIFICATION.md. |
| Tests finaux uniques | **587/587 (100 %) = 513 Node + 74 Python**, zéro échec et zéro saut. Les passages et sous-ensembles rejoués ne sont pas additionnés. |
| Navigateurs | Chromium 156.0.8078.47 et Firefox 153.5.1 : en-tête et affichage mobile validés, preuves sous output/scm-2.1.6/browser/. |
| Syntaxe et intégrité | 76 fichiers Node/Python vérifiés ; 81 empreintes finales stables ; copies broker identiques ; UTF-8/LF contrôlé. |
| Archivage | Natif réussi, specsUpdated=true ; 8 exigences ajoutées et 4 modifiées, aucune suppression ni renommage. |
| Codeur | 1, Codex ; modèle exact et tokens N/A, non relevés. |
| Orchestrateurs / agents délégués | 0 dans ce mandat SCM direct. Deux chats CAB coordonnés, leurs résultats ne sont pas ajoutés aux mesures de ce change. |
| RUN réels | Aucune intervention sur les RUN réels. Préservation des jobs armés, réservations et gel vérifiée dans des fixtures dédiées. |
| Quotas, coûts, durée complète de session | N/A : collecte initiale et télémétrie de pilotage non déclenchées en SCM direct. Aucun gain de quota ou coût n’est inféré. |
| Installation / activation réelles | Aucune dans ce mandat ; la qualification source ne prouve pas leur exécution. |

## 2. Types de messages et d’outils

Deux décisions humaines couvrent le périmètre autonome initial puis l’extension du sceau. Les demandes et retours de coordination restent distincts des mandats unitaires CAB : aucune permission CAB réelle n’est émise pour ce SCM direct.

| Catégorie | Mesure |
|---|---|
| Messages humains, messages d’agent, appels d’outils | N/A en agrégat : aucune collecte exhaustive de télémétrie de session n’a été préparée ; pas de reconstruction rétroactive. |
| Outils observés | Lectures/recherches ciblées, commandes locales, contrôles de tests, OpenSpec et coordination entre chats. |
| Sondes statistiques et PLLM | Non déclenchées pour ce mandat direct. |
| Refus et erreurs de validation | Les diagnostics ci-dessous et COHERENCE.md les conservent ; les refus de sécurité ne sont jamais considérés comme succès. |

## 3. Fichiers modifiés

**95 fichiers source, documentaires et OpenSpec concernés** sont énumérés dans [PREUVES-SCM.json](PREUVES-SCM.json). Ce périmètre comprend des fichiers partagés dont les contributions concurrentes ont été conservées ; il ne mesure pas une attribution ligne par ligne.

- Module de cycle de vie et raccords controller, supervisor, monitor, contextes, registre et annulation du client V2.
- Updater, unités, fermeture d’import du moniteur, métadonnées, commandes, références et versions source/broker synchronisées.
- Tests de processus, EOF, erreurs de nettoyage, fixtures de port/PID, assertions d’identité et régression du sceau.
- PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md et les seuls amendements ciblés des deux suivis.
- Sept canons OpenSpec synchronisés et les artefacts de cette seule archive.

AGENTS.md et DEVOPS.md restent inchangés ; ORCHESTRATED_CODING.md n’est pas modifié, la session étant directe. L’archive MAI11 et ses empreintes finales sont conservées. Le paquet 1.7.1 et les preuves historiques 2.1.5 ne sont pas réécrits. Les artefacts de test détaillés restent sous output/, hors versionnement.

## 4. Commandes

| Contrôle | Résultat |
|---|---|
| Node : --test --test-concurrency=1 tests/*.test.mjs, avec paquet historique et binaire OpenCode V2 isolé | Exécuté et réussi : 513/513. Journal node-global-qualified.log. Durée mesurée : 284.732 s. |
| Python : unittest discover -s tests -p test_*.py | Exécuté et réussi : 74/74. Journal python-global.log. |
| Navigateur : CAB_MONITOR_BROWSER_UNIT=header node tests/web-monitor-browser.mjs | Exécuté et réussi sur Chromium et Firefox, profils/ports temporaires dédiés. |
| Syntaxe Node/Python, empreintes, copies broker, UTF-8/LF | Exécutés et réussis ; snapshots et vérifications conservés. |
| OpenSpec cible, global standard et strict | Exécutés et réussis avant archive ; après synchronisation : 16/16 en standard, 16/16 en strict et 76/76 archives strictes. |
| OpenSpec archive du seul change SUP10 | Exécuté et réussi ; reçu archive.json. |
| Tests sur les installations et RUN réels | Non exécutés : hors périmètre, aucune installation ni activation. |

Passages globaux conservés, sans addition des tests recouvrants :

| Journal | Réussis / total | Échecs | Sauts |
|---|---:|---:|---:|
| node-global.log | 506/508 | 2 | 0 |
| node-global-final.log | 511/512 | 1 | 0 |
| node-global-with-seal.log | 512/513 | 1 | 0 |
| node-global-complete.log | 512/513 | 1 | 0 |
| node-global-release.log | 512/513 | 1 | 0 |
| node-global-qualified.log | 513/513 | 0 | 0 |

Les premiers échecs concernent : arborescence documentaire du moniteur incomplète, double capture du temps du sceau, précondition SSE de migration, réponse PLLM insuffisamment diagnostiquée puis démarrage du moniteur historique avant transition. Ils sont conservés avec leurs revalidations. L’écart PLLM n’a pas été reproduit dans vingt fixtures ni dans le fichier complet (92/92) ; la collision de port reste une hypothèse, pas une cause acquise. Aucun test négatif ni garde n’a été désactivé ou affaibli. La dernière suite entière est verte.

## 5. Accès web

Aucune recherche ni consultation web externe : **0** pour ce mandat. Les accès HTTP des bancs restent locaux et synthétiques. Les échanges avec les deux chats CAB sont de la coordination applicative, sans source web utilisée pour le correctif. Les navigateurs utilisent uniquement le moniteur de test local.

## 6. Synthèse globale

SUP10 est réalisé, qualifié sur **587 tests uniques** et deux navigateurs, puis archivé avec ses preuves. Le broker et les trois services se ferment selon les critères vérifiés ; les états métier et protections restent conservés. La fermeture automatique exige un serveur et des services dans le même espace PID local avec identité vérifiable. Une panne HTTP/SSE seule ne prouve pas une fermeture ; la reprise reste explicite.

Le rapport couvre cette archive et ses mesures observées. Le commit et les publications conditionnelles SCM sont des étapes ultérieures, consignées séparément dans output/scm-2.1.6/git-*.json ; aucune installation ou activation n’est autorisée par cette clôture. Voir [la qualification](QUALIFICATION.md) et [la revue documentaire](COHERENCE.md) pour les limites et les corrections intermédiaires.
