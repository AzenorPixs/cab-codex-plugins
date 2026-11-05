# Statistiques SCM — CAB 2.1.10

## 1. Statistiques générales et décisions

Rapport établi le 2026-10-29T08:56:32.129287+00:00, après archivage natif réussi de `2026-10-29-fix-native-edit-and-supervisor-mandates`. Session SCM directe, un agent Codex, aucun agent de codage délégué et aucun RUN CAB créé pour ce travail. Modèle exact, tokens du présent chat, quotas, coût et durée calendaire complète : N/A, télémétrie non collectée. Fournisseur synthétique des tests distinct d’un agent réel.

Décisions humaines observées : validation du périmètre initial ; validation de l’extension V2 ; demande explicite de documentation edit ; demande de priorité medium puis high. Les décisions et permissions des tests sont synthétiques et ne sont pas des permissions utilisateur actives. Aucun CABU.

## 2. Types de messages et d’outils

Lectures ciblées, commandes locales, écritures contrôlées, tests Node/Python/OpenSpec et liaison autorisée avec le parent. Aucun sous-agent lancé. Les messages de signalement ont été distingués des preuves et les erreurs de fixture des défauts CAB. Totaux de messages, d’appels d’outils et de décisions de plateforme : N/A, absence de collecte exhaustive ; aucune estimation.

La qualification native couvre catalogue, shell/write/edit, ask/once, refus, ambiguïté, restrictions deny, récupération après erreur MCP et SSE. Ses credentials sont synthétiques. Les sessions et processus privés sont nettoyés par le banc.

## 3. Fichiers modifiés

Périmètre : client V2, contexte de job, contrôleur, superviseur, statistiques, politique de modèle, schéma broker et copie distribuée ; tests correspondants ; versions communes, métadonnées/plugins/unités/commandes ; skill CAB, référence de politique et consignes statistiques ; PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md ; cartographie/registre ciblés ; cinq capacités OpenSpec et le présent dossier d’archive.

AGENTS.md, DEVOPS.md et ORCHESTRATED_CODING.md : inchangés. Le protocole partagé template reste hors mandat ; ses exemples historiques constituent une limite documentaire préexistante signalée dans QUALIFICATION.md. Aucun fichier métier Pixs, secret ou stockage privé OpenCode modifié. Artefacts techniques sous output/scm-native-edit ignorés par Git. Décompte Git des chemins avant commit : 92, dont 11 créés dans cette seule archive ; liste contrôlée dans PREUVES-SCM.json. Aucun chemin inattendu ni changement concurrent détecté.

## 4. Commandes et validations

| Campagne finale | Réussis | Échoués | Ignorés | Preuve |
| --- | ---: | ---: | ---: | --- |
| Node global, 530 tests | 502 | 0 | 28 | output/scm-native-edit/node-final.log |
| Python global | 75 | 0 | 0 | output/scm-native-edit/python-final.log |
| OpenCode privé explicite | 1 | 0 | 0 | output/scm-native-edit/native-final.log |

Les tests ciblés/reprises préparatoires ne sont pas additionnés à cette table ; elle décrit les exécutions finales et non un nombre de cas uniques (le banc natif optionnel est ignoré dans le global puis lancé explicitement). Contrôleur concurrent : 105/105 ; distribution documentaire : 29/29. Syntaxe : 55 modules JS et 10 Python. Copies broker identiques et textes UTF-8/LF vérifiés. OpenSpec global standard et strict avant archive : 17/17 chacun. Après synchronisation/correction documentaire : standard et strict 16/16 chacun, distribution 29/29 ; concordance des 21 exigences finales des deltas avec les specs vérifiée. Archivage natif : réussi, 11 exigences ajoutées et 9 modifiées à la synchronisation native, puis une exigence documentaire séparée après contrôle strict (état final 12 ajouts/9 modifications).

Commandes principales : Node `--test --test-concurrency=1 tests/*.test.mjs` ; Python DevOps `-m unittest discover -s tests -p test_*.py` ; banc natif avec CAB_TEST_OPENCODE ; OpenSpec validate --all, validate --all --strict et archive du seul change. Les 28 ignorés sont explicitement non exécutés dans la campagne globale. Aucune construction frontend pertinente, aucune installation de dépendance. Étapes Git SCM conditionnelles après ce rapport ; leurs résultats sont restitués séparément.

## 5. Accès web

Navigation web : aucune. Accès HTTP des qualifications : loopback des instances privées et fournisseur synthétique. Publications Git distantes : conditionnelles selon SCM, exécutées après le rapport ; destination/SHA et résultat exacts seront conservés dans output/scm-native-edit/publication-*.json et le bilan final. Aucun accès fournisseur réel, secret ou métrique historique reconstituée.

## 6. Synthèse globale

Sources communes CAB 2.1.10 qualifiées et change archivé. Édition native directe documentée, relance sans mandat neutralisée pour les RUN, retry historique strictement borné, permissions isolées par session, métriques/SSE V2 normalisés et priorité medium puis high appliquée à la sélection par défaut/documentée aux reprises sûres. Les garanties et limites exactes figurent dans QUALIFICATION.md.

Source, archivage, publication et activation sont distincts. Les briques actives 2.1.9, le raccord OpenCode et les RUN Pixs ont été préservés. Activation CABU non effectuée ; elle exige une coordination distincte. Aucun BLOCKER.md/BLOCKERS.md de ce change n’a été créé ; aucun bilan historique d’un autre change n’est nettoyé. Statistiques sans mesures inventées.
