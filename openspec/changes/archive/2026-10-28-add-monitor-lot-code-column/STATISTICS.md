# Statistiques SCM — Codes de lot CAB 2.1.2

## 1. Statistiques générales et décisions

Session directe SCM du 28 octobre 2026, projet Codex Approval Bridge (cab), change add-monitor-lot-code-column. Périmètre : colonne « codes de lot » en deuxième position de RUN et CHANGE, code explicite du titre du change ou cellule vide, base commune 2.1.2, tests, documentation, synchronisation et archivage. Périmètre validé avant écriture. Aucun pilotage, sous-agent ou skill de statistiques pilotées utilisé. Durée totale, tokens, modèle exact et quotas : N/A, mesures non instrumentées.

## 2. Types de messages et d'outils

Compteurs exhaustifs de messages et d'appels : N/A, non instrumentés. Suite Node : 458 déclarés, 432 succès, zéro échec final, 26 scénarios optionnels non exécutés (profils historiques avec paquet/processus original requis et scénario OpenCode natif isolé). Suite Python : 73 succès. Total des suites globales : 531 déclarés, 505 exécutés et réussis, 26 non exécutés ; 100 % des tests exécutés réussis. Les 42 tests ciblés sont un sous-ensemble et ne sont pas additionnés. Qualification navigateur distincte : Chromium et Firefox, chacun en bureau et mobile, réussie.

## 3. Fichiers modifiés

INVENTAIRE-SCM.json contient les 64 supports de version, les fichiers fonctionnels et les empreintes SHA-256 de 66 sources/supports examinés. Collecteur monitor-data, frontend app.mjs, tests unitaires et navigateur adaptés ; versions des composants, plugins, commandes, unités et supports courants alignées. Documentation : PROJECT, TECHNICAL, BUILD, README et CHANGELOG. AGENTS et DEVOPS inchangés, motifs dans VALIDATION.md. Deux exigences ajoutées au canon local-web-monitor et une exigence de distribution modifiée. Anciennes archives et preuves runtime préservées. Les captures de qualification sont sous tests/runtime/lot-codes-2.1.2. Lignes ajoutées/supprimées : N/A, aucun diff Git analysé.

## 4. Commandes

`node --test tests/web-monitor.test.mjs tests/controller-service-distribution.test.mjs` : 42 succès. `node --test tests/*.test.mjs` : 432 succès, 26 non exécutés, zéro échec. `python3 -B -m unittest discover -s tests -p 'test_*.py'` : 73 succès. `node tests/web-monitor-browser.mjs` : qualification complète réussie Chromium 156.0.8078.47 et Firefox 153.5.1, en 1440 × 1100 et 390 × 844. Versions regex initialement anciennes et fixture V2 /api/location absente corrigées, puis contrôles rejoués avec succès.

Syntaxe : 34 fichiers Node et 11 fichiers Python ; UTF-8/LF : 66 sources/supports ; trois copies broker identiques. Validation OpenSpec stricte avant archive : 16 éléments valides. Archivage réussi sous 2026-10-28-add-monitor-lot-code-column : deux exigences ajoutées et une modifiée, aucune supprimée ni renommée. Toutes les tâches sont cochées sur preuves. Aucun BLOCKER.md/BLOCKERS.md dans cette archive, donc nettoyage non applicable. Commit et publications conditionnelles suivent ce rapport ; aucun résultat Git futur n'est déclaré acquis ici.

## 5. Accès web

Aucune recherche Internet nécessaire à cette évolution locale. Navigation automatisée limitée aux fixtures loopback, avec fermeture des navigateurs, serveurs et profils temporaires par les blocs de nettoyage. Aucun service CAB installé n'est modifié. Nombre exhaustif de requêtes HTTP : N/A, non instrumenté. Les publications SCM éventuelles font l'objet de vérifications par fournisseur, sans restitution de secret ni du contenu brut de project.env.

## 6. Synthèse globale

Les deux tableaux affichent le code du change associé, actif ou archivé référencé, et une cellule vide en son absence. Les tris, filtres, compteurs, sélection, fraîcheur et actions existants restent qualifiés. La matrice documentaire complète et les limites figurent dans VALIDATION.md. CAB 2.1.2 est qualifié dans les sources ; l'installation active reste inchangée. Ce rapport comporte six sections, est en UTF-8/LF et ses totaux sont vérifiés. La clôture SCM est complétée par les résultats réels du commit et des publications conditionnelles, restitués séparément.
