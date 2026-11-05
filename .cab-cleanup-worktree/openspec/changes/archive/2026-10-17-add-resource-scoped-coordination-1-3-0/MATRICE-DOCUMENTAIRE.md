# Matrice documentaire et critères SCM CAB 1.3.0

Revue finale du jeu source commun aux deux changes autorisés. Les preuves de qualification sont conservées dans VALIDATIONS-SCM.json ; les empreintes ciblées figurent dans INVENTAIRE-SCM.json. Le déploiement et l'état des RUN actifs ne sont pas évalués.

| Élément | État et preuve observée |
| --- | --- |
| Projet réel | Sources 1.3.0 et plugin 1.3.0+codex.20261016211108 ; 17 sources annonçant une version contrôlées, 19 tests de distribution réussis. Aucun service installé n'est qualifié par ces résultats. |
| AGENTS.md | Inchangé, empreinte initiale conservée. Sections 5, 6, 7, 12 et 21 compatibles avec le périmètre explicitement validé, SCM direct, archive et rapport sans Git. |
| PROJECT.md | Mis à jour : référence 1.3.0, principes architecturaux, diagramme et section Pilotage concurrent 1.3.0. Réservation du change distincte des accès, publication ciblée et quatre exceptions globales. |
| TECHNICAL.md | Mis à jour : API, statistiques natives/fenêtres, contextes concurrents 1.3.0, schémas et capacités ; legacySources, migration, rollback et prévol. Import ordonné à plusieurs fichiers documenté. |
| BUILD.md | Mis à jour : statistiques, versionnement et distribution concurrente 1.3.0 ; jeu complet, migration quiescente avec sauvegarde et retour arrière conditionnel. Préparation source explicitement distincte de l'installation. |
| DEVOPS.md | Inchangé, empreinte initiale conservée. Chemins Python 3.14.8, Node 24.22.0 et OpenSpec 1.14.2 utilisés ; aucune dépendance ni modification d'environnement requise. |
| README.md | Mis à jour : version publique, coordination ciblée, diagramme, cinq consultations et limites des imports historiques. |
| CHANGELOG.md | Entrée 1.3.0 — préparation source complétée : coordination, compatibilité, statistiques et absence de déploiement. Aucune date de publication inventée. |
| ORCHESTRATED_CODING.md | Mis à jour : protocole embarqué identique à la référence distribuée après décalage des titres ; test de distribution exécuté. Aucune session pilotée déclenchée. |
| openspec/specs/ | Huit capacités concernées par les deltas du change de coordination ; deux par le change statistiques. Validation stricte des deux changes et des neuf références : 11/11 avant archive. La CLI d'archive synchronise les références ; contrôle global strict requis après les deux archives. |
| Commande /cab et skills sources | Mis à jour : version, cinq vues en lecture seule, pause/arrêt ciblés ou globaux explicites, ressources, migration et références. Modification de la commande source Codex autorisée dans le périmètre ; aucun cache installé ou prompt consommateur modifié. |
| Catalogue marketplace | Inchangé, empreinte initiale conservée : rattache déjà le plugin complet ; aucune version propre à créer. |

## Correspondance des critères et preuves

| Critère validé | Preuve exécutée |
| --- | --- |
| Trois RUN indépendants, ensemble atomique, lecteurs compatibles et FIFO entre conflits | resource-coordination.test.mjs, 20 succès ; concurrent-controller.test.mjs, 29 succès. |
| Exclusivité privée, promotion et identités physiques/sous-arbres | Tests du registre : arrivée d'un pair, parent déclaré, liens matériels refusés et invalidation de descendants. |
| Préparation exacte, décisions distinctes, permission once et fins inconnues | Tests HTTP : trois sessions, broker MCP source réel avec transports simulés, callID, versions, deux opérations par groupe, erreurs et protections conservées après redémarrage. |
| Publication/rapport ciblés sans cohorte ordinaire | Tests OpenSpec en lecture avec écriture indépendante, publication idempotente, REPORT, révisions, closing, gates et rapport propre au change. |
| Exceptions globales et suspension ciblée | Tests des quatre causes, drainage, observation native invalidée, pause prioritaire, groupe repris sans libération de ses fichiers et absence de rejeu. |
| Reprise, migration et retour arrière | États synthétiques historiques, sauvegarde exacte, prévol once/exit 0 requis, rollback refusé après nouveaux effets et compatibilité historique isolée jusqu'à réconciliation explicite. |
| Supervision et healthcheck | 3 tests de supervision concurrente, 11 de supervision persistante, 6 de healthcheck, plus suites de restauration/reprise. |
| Statistiques, confidentialité et distribution | 11 tests natifs, 11 tests observations, scénarios HTTP d'import/consultation et 19 tests de distribution. Import réel hors ligne : 38 586 lignes, cinq fenêtres et répétition déjà importée. |
| Syntaxe et régressions | 37 fichiers Python/MJS vérifiés ; Python 56 succès, Node 213 succès, 1 scénario natif opt-in ignoré. Total commun : 269 succès, aucun échec final. |

## Limites et écart conservé

Les contrôles restent locaux et simulés ; le scénario OpenCode vivant est volontairement non exécuté (opt-in absent), conformément au périmètre. Aucun gain réel de productivité ou état de readiness des RUN actifs n'est revendiqué. Aucun lint, contrôle de types ou construction tiers n'est configuré dans pyproject.toml ; aucune dépendance ajoutée.

Trois anciennes fixtures utilisaient la racine CAB réelle malgré des transports OpenCode/Codex simulés. Elles ont pu écrire des fichiers techniques sous le runtime exclu. Leur workspace est désormais temporaire et les variables CAB héritées sont filtrées dans les fixtures. Aucun nettoyage ni restauration du runtime n'a été tenté, l'état initial n'étant pas prouvé. Aucun appel natif n'était dirigé vers les RUN actifs. Cet écart interdit de prétendre à une absence totale d'écriture runtime pendant les tests.

Une dernière tentative HTTP a compté le polling périodique de permissions dans la mesure des lectures de cohorte. La fixture de ce seul test utilise désormais une cadence supérieure à sa durée et attend la lecture initiale SSE ; les assertions exactes restent inchangées. La relance a réussi 29/29.

L'import réel reste historique et filtré. Les catégories absentes restent inconnues ; les quotas sont partagés et deux relevés ne mesurent pas la consommation de SCM. La comparaison au résumé historique présente un écart maximal absolu de 3,437 secondes par catégorie : arrondi milliseconde, découpage conservateur et changements de portée. Elle n'est pas déclarée identique. Les résultats détaillés sont dans output/scm/cab-1-3-0/qualification-observations.json ; aucun message/outil/décision détaillé absent de l'audit n'est reconstruit.

Le contrôle de périmètre compare 60 empreintes initiales et six nouveaux fichiers sources/tests/documentation ; il ne constitue pas un inventaire exhaustif du disque. Aucun appel Git ni propagation de PROMPTS n'a été exécuté pendant SCM.
