# Statistiques — Réconciliation du prévol rejeté, CAB 2.1.7

Projet : CAB. Change : `fix-rejected-preflight-recovery-after-restart`. Code non attribué. Mandat SCM direct validé par le développeur le 29 octobre 2026 ; un agent Codex, aucune délégation. Ce rapport porte sur la qualification source et l'archive ; CABU et la réconciliation runtime sont des étapes suivantes.

## 1. Statistiques générales et décisions

5/5 tâches source validées. Dernière campagne : **555 tests réussis uniques = 481 Node + 74 Python**, 27 scénarios Node ignorés, aucun échec final. Les sous-ensembles et répétitions ne sont pas additionnés. Node total 508 ; total avec Python 582. Les ignorés ne sont pas comptés comme réussites. Voir [QUALIFICATION.md](QUALIFICATION.md).

Le développeur a autorisé le correctif ciblé et la réconciliation globale, imposé SCM et CABU après archivage, puis validé le périmètre autonome détaillé. Durée complète, tokens, coûts et quotas : N/A, absence de collecte exhaustive en SCM. Aucun RUN de codage CAB créé pour ce correctif direct.

## 2. Types de messages et d'outils

Lectures et recherches ciblées, édition, commandes Node/Python, HTTP local filtré et OpenSpec. Comptages exhaustifs de messages et outils : N/A, aucune télémétrie de pilotage déclenchée en SCM. Aucun sous-agent utilisé. Aucune permission native ou décision exécutable ancienne reconstruite. L'historique natif du recovery réel a été lu pour le diagnostic, sans commande métier.

## 3. Fichiers modifiés

Modules controller/job-context pour la nouvelle phase et la levée globale ; tests controller-session-recovery et concurrent-controller ; fichiers versionnés des quatre briques, copies broker, unités, plugins et commandes alignés en 2.1.7 ; PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md ; références et skills CAB/CABU ; cartographies et présent change OpenSpec. Le journal de l'incrément liste 62 fichiers de distribution/tests. Aucun fichier Pixs modifié par ce mandat SCM. AGENTS.md, ORCHESTRATED_CODING.md et DEVOPS.md restent inchangés avec justification dans la qualification.

## 4. Commandes et validations

| Contrôle | Résultat |
| --- | --- |
| node --test tests/controller-session-recovery.test.mjs | 44/44, dont persistance et nouveau prévol once/complete |
| node --test tests/concurrent-controller.test.mjs | 93/93, dont refus et release globale liée |
| Recovery + concurrence + distribution | 166/166 ; sous-ensemble de la suite finale |
| node --test --test-concurrency=1 sur les 27 fichiers *.test.mjs | 508 : 481 réussis, 27 ignorés, 0 échec ; 77,141 secondes |
| Python DevOps -B -m unittest discover -s tests -p test_*.py | 74/74 |
| Syntaxe | 35 modules Node, 11 fichiers Python |
| Intégrité | 74 fichiers UTF-8/LF contrôlés ; trois copies broker identiques |
| OpenSpec avant archive | Change strict valide ; global strict 17/17 |
| Archive native | Réussie : 2 exigences ajoutées, 5 modifiées et 1 renommée ; aucun retrait |

La campagne parallèle initiale a relevé 479 réussites, 2 échecs et 27 ignorés : attente de coordination expirée et rejet de restauration non observé. La restauration isolée passe 29/29 ; la campagne finale séquentielle passe sans modification de ces mécanismes. La contention est une interprétation, pas une cause instrumentée. Les journaux restent sous `output/scm-rejected-preflight/` et ne sont pas versionnés.

Les 26 scénarios historiques optionnels exigent CAB_TEST_ORIGINAL_PLUGIN ; le scénario OpenCode natif isolé exige CAB_TEST_OPENCODE. Ces entrées n'ont pas été fournies pour la campagne et expliquent les 27 ignorés. Aucune nouvelle qualification réelle des profils historiques mixtes n'est déduite.

## 5. Accès web

Aucune recherche web externe pour la correction source. Requêtes HTTP locales au contrôleur, au moniteur et via le client CAB authentifié ; seuls les résultats filtrés sont exposés. Les tests utilisent leurs propres serveurs et credentials synthétiques. Aucun secret n'a été affiché ou incorporé au correctif.

## 6. Synthèse globale

Le correctif source 2.1.7 est validé et archivé. Il conserve le retry ordinaire, scelle une réconciliation humaine non exécutable et recontrôle le recovery et la cohorte avant levée globale. Les sources validées ne prouvent pas le déploiement. Commit, publications SCM, CABU, versions réellement chargées et recovery réel sont suivis séparément ; aucune réussite opérationnelle n'est anticipée par ce rapport.
