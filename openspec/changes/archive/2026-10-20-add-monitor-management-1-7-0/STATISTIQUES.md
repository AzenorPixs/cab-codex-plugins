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


Revue par empreintes : **56 fichiers existants modifiés + 12 nouveaux chemins = 68 chemins livrés**. Les 29 autres fichiers initiaux restent inchangés.

Fichiers existants modifiés :

- `.codex/commands/cab.md`
- `BUILD.md`
- `CHANGELOG.md`
- `ORCHESTRATED_CODING.md`
- `PROJECT.md`
- `README.md`
- `TECHNICAL.md`
- `openspec/specs/codex-integration-distribution/spec.md`
- `openspec/specs/concurrent-run-coordination/spec.md`
- `openspec/specs/local-web-monitor/spec.md`
- `openspec/specs/native-session-statistics/spec.md`
- `plugins/cab-approval-bridge/.codex-plugin/plugin.json`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs`
- `plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/run-lifecycle.md`
- `plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md`
- `plugins/cab-approval-bridge/skills/coding-session-statistics/references/observations.md`
- `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service`
- `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service`
- `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service`
- `plugins/cab-approval-bridge/web-monitor/app.mjs`
- `plugins/cab-approval-bridge/web-monitor/index.html`
- `plugins/cab-approval-bridge/web-monitor/stats.mjs`
- `plugins/cab-approval-bridge/web-monitor/style.css`
- `pyproject.toml`
- `src/cgpt_approval_bridge_journal.py`
- `src/cgpt_approval_bridge_router.py`
- `src/cgpt_approval_bridge_server.py`
- `tests/concurrent-controller.test.mjs`
- `tests/controller-service-distribution.test.mjs`
- `tests/monitor-service-start.test.mjs`
- `tests/native-opencode.test.mjs`
- `tests/test_crash_recovery.py`
- `tests/test_session_reset.py`
- `tests/web-monitor-browser.mjs`
- `tests/web-monitor.test.mjs`

Nouveaux fichiers :

- `openspec/changes/archive/2026-10-20-add-monitor-management-1-7-0/STATISTIQUES.md`
- `openspec/changes/archive/2026-10-20-add-monitor-management-1-7-0/design.md`
- `openspec/changes/archive/2026-10-20-add-monitor-management-1-7-0/proposal.md`
- `openspec/changes/archive/2026-10-20-add-monitor-management-1-7-0/specs/codex-integration-distribution/spec.md`
- `openspec/changes/archive/2026-10-20-add-monitor-management-1-7-0/specs/concurrent-run-coordination/spec.md`
- `openspec/changes/archive/2026-10-20-add-monitor-management-1-7-0/specs/local-web-monitor/spec.md`
- `openspec/changes/archive/2026-10-20-add-monitor-management-1-7-0/specs/monitor-management/spec.md`
- `openspec/changes/archive/2026-10-20-add-monitor-management-1-7-0/specs/native-session-statistics/spec.md`
- `openspec/changes/archive/2026-10-20-add-monitor-management-1-7-0/tasks.md`
- `openspec/specs/monitor-management/spec.md`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs`
- `tests/monitor-management.test.mjs`

## 4. Commandes et résultats

Validations exécutées et réussies :

- `node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : 293 réussis, un ignoré, code 0, 84 747,744940 ms ; trace node-tests-final.txt.
- `python3 -m unittest discover -s tests -p 'test_*.py'` : 67 réussis, code 0, 13,784 s ; trace python-tests.txt.
- `node tests/web-monitor-browser.mjs` : Chromium 155.0.8059.79 et Firefox 153.5.0, 34 groupes chacun, code 0 ; résultat JSON et captures dans le dossier de travail. Captures bureau Chromium et archives mobile Firefox examinées.
- `node --check <fichier.mjs>` et `python3 -m py_compile <fichier.py>` : 34 fichiers, code 0 ; syntax.json.
- `systemd-analyze --user --man=no verify <unité monitor>` : code 0 ; aucune activation réelle.
- `openspec validate add-monitor-management-1-7-0 --strict --no-interactive` : code 0 avant code/tests, puis après complétion des deltas.
- `openspec validate --all --strict --no-interactive` : 12/12 avant archivage et 12/12 après, code 0. Les 25 blocs d’exigences des deltas correspondent exactement aux spécifications synchronisées.

Les premières validations OpenSpec ont refusé un scénario omis puis deux exigences trop longues ; corrigés avant code/tests. Un premier lancement ciblé a été interrompu sur une attente devenue circulaire dans le test de collecte : le nouveau contrat attend la collecte partagée, le test attend désormais les deux appels après libération de sa fixture. La reprise ciblée passe 93/93.

Deux passages navigateur ont révélé des interactions entre génération restaurée et génération courante : doublon puis réapparition d'un ancien RUN après archivage du nouveau. La projection a été corrigée et une régression dédiée ajoutée ; Chromium et Firefox passent ensuite intégralement. Le premier passage complet Node a donné 292 réussis, un échec réseau `fetch failed` dans une réservation native simulée, un ignoré. Le test concerné passe isolément, puis la suite complète passe 293/293 exécutés sans modification de ce test pour contourner l'échec.

TMPDIR et PYTHONPYCACHEPREFIX sont dirigés vers .scm-monitor-1.7-work dans la racine. Ce dossier contient les preuves et artefacts régénérables, hors livraison source. Lint, typage et construction tiers : **non pertinents**, aucune chaîne correspondante configurée ; ShellCheck : **non pertinent**, aucun script shell modifié. Intégration native OpenCode opt-in : **non exécutée**, CAB_TEST_OPENCODE absent. Déploiement et services système réels : **non exécutés**, hors périmètre.


Synchronisation et archivage ciblés : `openspec archive add-monitor-management-1-7-0 --yes --json`, code 0. Archive `2026-10-20-add-monitor-management-1-7-0` ; neuf exigences ajoutées et seize modifiées, aucune supprimée ou renommée. Les autres archives sont conservées.

## 5. Accès web

Aucune recherche ou consultation web externe. Les tests HTTP/SSE, WebDriver et BiDi utilisent des fixtures loopback. Les commandes des unités sont simulées, y compris le redémarrage Web avec remplacement effectif du serveur de test et reconnexion SSE. Nombre exhaustif d'appels, volumes et durée par appel : **N/A**, aucun relevé normalisé.

## 6. Synthèse globale

Je livre le correctif source 1.7.0 : titre simplifié, cartes et commandes des briques, Web indépendant, archives privées des RUN et changes, suppression d'affichage et désarchivage sans reprise métier. Les contrôles protègent les RUN réservés, demandes, effets et activités natives ; les sources observées et les preuves sont conservées. Les tests de rejet d'origine, corruption, liens, générations, concurrence, persistance et navigation complètent les régressions existantes.

Qualification finale : 360 tests réussis et un ignoré, 34 fichiers syntaxiquement valides, deux navigateurs qualifiés. L’archivage ciblé, les 25 exigences synchronisées, le présent rapport à six sections et les 68 chemins UTF-8/LF sont vérifiés. Aucun blocage connu ne subsiste dans ce périmètre source. Le déploiement réel reste distinct de cette préparation source.
