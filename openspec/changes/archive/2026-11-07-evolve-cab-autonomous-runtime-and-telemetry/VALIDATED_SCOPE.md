# Périmètre autonome validé — 6 novembre 2026

Catégories1–8 approuvées dans le chat Correctif CAB, mandat final « Sous mandat SCM avec CI/CD ». Objectif/autorité, SGS, CCAB, CABU, nettoyage/WebMonitor, distribution, optimisation LLM/cache et réalisation/livraison sont inclus. Aucun nouvel accord intermédiaire pour ces lots. Toute extension métier ou nouvelle allocation hors mandat remonte au développeur.

Décisions : agent libre dans le change pour lectures/exploration/outils et dans son atelier ; toute écriture projet hors atelier et tout accès web validés préalablement par l’orchestrateur. Toute preuve de test validée par l’orchestrateur ; les essais intermédiaires peuvent continuer. Actions hors change et ressources supplémentaires validées par développeur. Atelier racine .cab-tests/<change>/<RUN>/, séparation des pairs, nettoyage à archive ou arrêt dépendance. Le modèle direct Codex est activé explicitement, sans agent/OC fictif.

SGS : toutes les mesures natives disponibles, rôles séparés, fournisseurs/modèles/niveaux de raisonnement et changements horodatés, chronologie globale, attentes, tokensentrée/sortie/raisonnement/cache et totaux natifs sans doublecompte. Sources manquantes N/A motivé, pas de télémétrie native remplacée par récitLLM. Statistiques historiques réimportées depuis les rapports, version/provenance conservées. Autres briques gardent leurs seules données métier ; outbox temporaire non bloquante pour SGS indisponible.

CCAB : orchestrateur désigné connaît immédiatement le contrat via plugin/skill/commande ; FIFO par défaut, lots pertinents justifiés, provenance et horodatage par entrée, travail coordonné avec déclarants, qualification/fauxpositif/méthode de reprise ou correction code/doc sousSCM/version/DIU/CABU, clôture sur preuves. Aucun nouvel agent/chat imposé.

Nettoyage : RUN en cours refusé, RUN clos autorisé. Les anciens formats seuls ne bloquent pas. Rapports durables avant purge ; statistiques historiques rendues viaSGS, incidentsCCAB nécessaires indépendants, Archives expose ce qui est réellement conservé. Le développeur peut supprimer les archivesCAB depuis l’interface sans approbation additionnelle. Chaque compte nettoie ses propres fichiers. C12transaction erasure-8bf1e6c3-15cc-48ae-8c2a-a501f4bec290 resteSEALED, OC4SID supprimés, CABnonpurgé ; reprise du même reçu sous2.4, sans nouveau2.3.x.

Livraison : testsminimumvital adaptés (pas de campagnegénérale systématique), source/doc/OpenSpec cohérentes, rapportSGS puis CI/CDroot exclusivement `diu projects cicd cab 2.4.0`, CABU, contrôle des versions actives, continuité et notification aux propriétaires. Les paramètres locaux sont résolus sans exposer de secrets ni écrire manuellement project.env.

Complément explicite du développeur : mettre à jour PROJECT.md, TECHNICAL.md et BUILD.md en cohérence avec2.4.0 dans la même livraison ; objectifs/architecture/contrats/installations et migration doivent décrire les comportements qualifiés, avec distinction des versions sources et actives.

Complément explicite : les huit catégories et leurs ajouts validés doivent être reportés dans PROJECT.md, TECHNICAL.md, BUILD.md ET README.md, avec correspondance explicite des couvertures.
