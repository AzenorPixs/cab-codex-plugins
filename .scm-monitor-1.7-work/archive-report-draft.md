# Rapport d'archivage SCM — add-monitor-management-1-7-0

Projet : Codex Approval Bridge (`cab`). Livraison source : **1.7.0**.
Date : 20 octobre 2026, Europe/Paris. Session directe SCM.

## 1. Statistiques générales et décisions

Je livre les commandes des briques et le rangement privé des lignes du moniteur. Les opérations de l'interface préservent les sources OpenSpec observées, les RUN réels et leurs preuves. Le périmètre autonome et cet archivage sont validés pour cette session.

Qualification finale : 293 tests Node réussis, un scénario natif optionnel ignoré ; 67 tests Python réussis. Total distinct : **360 réussis, zéro échec final, un ignoré, 361 tests**. Les répétitions ciblées ne sont pas additionnées. Chromium et Firefox valident chacun 34 groupes de contrôle, distincts du total unitaire. Syntaxe : 34 fichiers, 8 Python et 26 JavaScript. Les 23 modules source publient 1.7.0, ainsi que commande, unités et version de base du plugin ; cachebuster neuf.

Tokens, coûts, quotas, cache, débit, durée exhaustive, inventaire complet des messages et outils : **N/A**, aucune télémétrie normalisée de pilotage n'est activée en SCM. Aucune invocation du skill de statistiques pilotées ou d'un sous-agent.

## 2. Types de messages et d'outils

Lectures ciblées, rg, empreintes SHA-256, éditions locales, contrôles syntaxiques, tests Node/Python, fixtures HTTP/JSON/SSE, adaptateur systemd simulé, WebDriver Chromium et BiDi Firefox, CLI OpenSpec et vérification statique systemd. L'identité non secrète du projet est extraite localement par filtrage de PROJECT_NAME/PROJECT_ID, sans restitution brute du fichier env.

L'état Git a été consulté pendant l'exploration initiale, avant lecture du prompt SCM ; aucune commande Git n'a suivi cette lecture. Aucun commit, préparation de commit, branche, push, tag ou publication n'est réalisé. Aucun service réel, profil installé ou projet consommateur n'est modifié. Aucun message n'est envoyé à un autre chat.

## 3. Fichiers et cohérence documentaire

Le périmètre comprend l'interface web, les modules monitor/monitor-data et le nouveau monitor-management, la garde temporaire du contrôleur, l'identité publique contrôleur/superviseur, les tests et la distribution 1.7.0. Les sources observées par les actions du produit restent intactes ; les seuls dossiers OpenSpec écrits pendant SCM sont ses spécifications et son change dédié.

AGENTS.md et DEVOPS.md restent inchangés avec empreintes conservées : les règles générales et l'environnement déclaré restent applicables. PROJECT.md décrit la gestion locale et l'indépendance Web. TECHNICAL.md précise routes, éligibilité, catalogue, garde, délais et PID. BUILD.md et la référence monitor-service ajoutent le module requis au jeu isolé de onze ressources. README.md explique les actions, limites et stockage privé ; CHANGELOG.md conserve l'historique et ajoute 1.7.0. ORCHESTRATED_CODING.md n'est aligné que sur la version de distribution. Commande, skill et références distribuées restent cohérents ; aucune propagation vers les projets consommateurs.

Le moniteur conserve une limite de 2 Mio et 2000 entrées pour son catalogue ; les lignes supprimées restent des marqueurs de présentation. Un verrou abandonné ou un catalogue invalide interdit une écriture sans réinitialisation silencieuse. Le Web lancé manuellement garde un redémarrage manuel. Aucun changement du schéma opérationnel CAB, aucune nouvelle dépendance ni migration réelle.

## 4. Commandes et résultats

Validations exécutées et réussies :

- `node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : 293 réussis, un ignoré, code 0, 84 747,744940 ms ; trace node-tests-final.txt.
- `python3 -m unittest discover -s tests -p 'test_*.py'` : 67 réussis, code 0, 13,784 s ; trace python-tests.txt.
- `node tests/web-monitor-browser.mjs` : Chromium 155.0.8059.79 et Firefox 153.5.0, 34 groupes chacun, code 0 ; résultat JSON et captures dans le dossier de travail. Captures bureau Chromium et archives mobile Firefox examinées.
- `node --check <fichier.mjs>` et `python3 -m py_compile <fichier.py>` : 34 fichiers, code 0 ; syntax.json.
- `systemd-analyze --user --man=no verify <unité monitor>` : code 0 ; aucune activation réelle.
- `openspec validate add-monitor-management-1-7-0 --strict --no-interactive` : code 0 avant code/tests, puis après complétion des deltas.
- `openspec validate --all --strict --no-interactive` : 12/12 avant archivage, code 0.

Les premières validations OpenSpec ont refusé un scénario omis puis deux exigences trop longues ; corrigés avant code/tests. Un premier lancement ciblé a été interrompu sur une attente devenue circulaire dans le test de collecte : le nouveau contrat attend la collecte partagée, le test attend désormais les deux appels après libération de sa fixture. La reprise ciblée passe 93/93.

Deux passages navigateur ont révélé des interactions entre génération restaurée et génération courante : doublon puis réapparition d'un ancien RUN après archivage du nouveau. La projection a été corrigée et une régression dédiée ajoutée ; Chromium et Firefox passent ensuite intégralement. Le premier passage complet Node a donné 292 réussis, un échec réseau `fetch failed` dans une réservation native simulée, un ignoré. Le test concerné passe isolément, puis la suite complète passe 293/293 exécutés sans modification de ce test pour contourner l'échec.

TMPDIR et PYTHONPYCACHEPREFIX sont dirigés vers .scm-monitor-1.7-work dans la racine. Ce dossier contient les preuves et artefacts régénérables, hors livraison source. Lint, typage et construction tiers : **non pertinents**, aucune chaîne correspondante configurée ; ShellCheck : **non pertinent**, aucun script shell modifié. Intégration native OpenCode opt-in : **non exécutée**, CAB_TEST_OPENCODE absent. Déploiement et services système réels : **non exécutés**, hors périmètre.

## 5. Accès web

Aucune recherche ou consultation web externe. Les tests HTTP/SSE, WebDriver et BiDi utilisent des fixtures loopback. Les commandes des unités sont simulées, y compris le redémarrage Web avec remplacement effectif du serveur de test et reconnexion SSE. Nombre exhaustif d'appels, volumes et durée par appel : **N/A**, aucun relevé normalisé.

## 6. Synthèse globale

Je livre le correctif source 1.7.0 : titre simplifié, cartes et commandes des briques, Web indépendant, archives privées des RUN et changes, suppression d'affichage et désarchivage sans reprise métier. Les contrôles protègent les RUN réservés, demandes, effets et activités natives ; les sources observées et les preuves sont conservées. Les tests de rejet d'origine, corruption, liens, générations, concurrence, persistance et navigation complètent les régressions existantes.

Qualification finale : 360 tests réussis et un ignoré, 34 fichiers syntaxiquement valides, deux navigateurs qualifiés. Le déploiement réel reste distinct de cette préparation source.
