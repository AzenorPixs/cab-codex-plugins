# Statistiques — CAB 2.1.4

## 1. Statistiques générales et décisions

Session directe SCM, un agent Codex gpt-6.1-sol, aucun sous-agent. Le développeur a validé explicitement la compatibilité 2/6 et 3/7, les tests, l’archive, les statistiques, la publication, l’activation et la reprise d’un CAB test isolé. Ce rapport couvre la qualification source. Activation et dialogue réel font l’objet de preuves opérationnelles postérieures, sans succès anticipé. Change : support-pllm-catalog-3-7-2-1-4 ; date : 28 octobre 2026.

Durée exhaustive, tokens, coût et temps humain : N/A, non instrumentés. Aucune compétence ni sonde de statistiques de pilotage déclenchée dans SCM ; aucun quota interrogé.

## 2. Messages et outils

Lectures ciblées, recherches rg, éditions du change et des sources, validations syntaxiques, tests Node/Python et OpenSpec. Nombre exhaustif de messages, lectures et commandes : N/A, pas de compteur de session. Délégations : 0. Les tentatives et essais intermédiaires ne sont pas additionnés aux totaux uniques des suites finales.

## 3. Fichiers et documentation

Le correctif comportemental porte sur cgpt-approval-bridge-model-policy.mjs et tests/model-policy.test.mjs. Le lecteur accepte les deux couples stricts et la conservation de mode7 dans une preuve native validée. Les sources de distribution et tests courants sont alignés sur 2.1.4 (65 fichiers lors du passage de version). Les preuves runtime historiques et les archives précédentes restent intactes.

Les cadrages PROJECT/TECHNICAL/BUILD, README, CHANGELOG et la référence model-policy.md sont ajustés. Les versions communes du protocole et des commandes sont alignées ; AGENTS.md et DEVOPS.md sont inchangés. La matrice par fichier et les chemins sont dans [PREUVES-SCM.json](PREUVES-SCM.json). Le nombre total de chemins du commit sera constaté à l’étape Git ; il n’est pas assimilé aux seuls changements de comportement.

DEVELOPMENT_MAP.md est un squelette et openspec/BATCH_CODES.md est absent. Ils sont laissés intacts : exécuter ultérieurement ACL.md pour les générer ou compléter. Aucun code de lot inventé. UTF-8/LF vérifié sur 73 fichiers concernés ; copies broker identiques.

## 4. Commandes et validations

| Contrôle | Résultat final |
| --- | --- |
| node --test tests/model-policy.test.mjs tests/controller-service-distribution.test.mjs | 50 réussis |
| node --test tests/*.test.mjs avec CAB_TEST_OPENCODE | 481 cas : 456 réussis, 0 échec, 25 non exécutés |
| Python DevOps -B -m unittest discover -s tests -p test_*.py | 73 réussis, 0 échec |
| Total unique des suites finales | 554 cas déclarés : 529 exécutés et réussis, 25 non exécutés, 0 échec |
| Node --check et Python py_compile | 72 fichiers, 0 erreur |
| Préparation du catalogue public actif avec le lecteur 2.1.4 | réussie, patch de chemin public seulement, aucun catalogue réécrit |
| OpenSpec global standard/strict avant archive | 16/16 chacun |
| openspec archive support-pllm-catalog-3-7-2-1-4 --yes | réussi, tâches complètes, deux specs synchronisées |
| OpenSpec standard/strict après archive | 15/15 chacun |

Les 25 cas non exécutés exigent le paquet historique 1.7.1 épinglé via CAB_TEST_ORIGINAL_PLUGIN, non fourni ; les tests courants et l’intégration native isolée OpenCode sont exécutés. Les 50 contrôles ciblés appartiennent à la suite globale et ne sont pas additionnés une seconde fois. Journaux détaillés : output/scm-2.1.4, ignoré par Git.

## 5. Accès web et réseau

Navigation web externe et appels LLM pendant la correction source : 0. Services loopback et processus de fixture utilisés par les tests ; volume exhaustif de requêtes : N/A, non instrumenté. La tentative initiale de lecture de l’API réelle OpenCode a reçu ECONNREFUSED ; le développeur a indiqué remettre l’instance sur 4096. Ce constat ne vaut ni fermeture par cette session ni échec du correctif source. Les publications et l’activation suivent la présente archive selon l’autorisation distincte explicite ; leurs preuves ne sont pas inventées ici.

## 6. Synthèse globale

Source 2.1.4 qualifiée et change archivé. Un schéma 2 à six lignes et un schéma 3 à sept lignes valides sont admis ; tout autre couple, priorité/mode incohérent, sélection ambiguë ou date non admissible reste refusé. Les contrôles de modèle, raisonnement, prévol et jobs existants sont conservés. Aucun catalogue ni secret modifié ou exposé par les tests.

Le correctif est prêt pour la publication et l’activation autorisées, puis le CAB test réel dans un nouveau RUN et une session persistante dédiés, sans purge ni modification des RUN antérieurs. Ces phases opérationnelles restent à prouver séparément. Aucun bilan de blocage n’est nécessaire pour cette qualification source achevée.
