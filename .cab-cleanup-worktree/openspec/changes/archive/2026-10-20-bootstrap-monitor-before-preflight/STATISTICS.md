# Rapport d'archivage SCM — bootstrap-monitor-before-preflight

Projet : Codex Approval Bridge (`cab`). Date : 20 octobre 2026, Europe/Paris.
Livraison source : **1.6.3**, depuis 1.6.2. Session directe SCM.
Archive : `2026-10-20-bootstrap-monitor-before-preflight`.

## 1. Statistiques générales et décisions

Je corrige le démarrage du monitoring : dès résolution du workspace, la commande,
le skill et le protocole appliquent la procédure de service avant PLLM, santé
OpenCode et prévols modèle/MCP. Le contrôle couvre entrée, reprise et services
réutilisés. Le routage start/run/resume renvoie d'abord au seul bootstrap ;
ce renvoi ne déclenche aucune purge en reprise. Une unité absente ne reste
pas un simple constat si son installation est autorisée.

La tentative bornée et les preuves unité/page/version/workspace précèdent les
contrôles amont. Instance conforme, configuration et port existants sont
préservés. Une panne amont n'arrête pas le moniteur ; une divergence active
ne permet pas sa réaffectation. Diagnostics CAB et monitoring restent distincts.
Les correctifs broker précédents et l'historique des versions sont conservés.

| Qualification | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node, suite complète | 278 | 0 | 1 | 279 |
| Python, unittest | 67 | 0 | 0 | 67 |
| Total distinct | **345** | **0** | **1** | **346** |

Le scénario OpenCode natif est ignoré : opt-in CAB_TEST_OPENCODE absent.
Les 26 tests ciblés, repris après le dernier ajustement du routage, sont tous
réussis et ne sont pas additionnés au total. Deux nouveaux tests couvrent
l'ordre prioritaire et la reprise avec services actifs. La comparaison avec
le contenu initial confirme que les trois points d'entrée omettaient le
démarrage du moniteur avant les étapes amont.

Syntaxe : **30 fichiers**, 8 Python et 22 JavaScript. Les **22 modules sources**
portent 1.6.3 ; leurs corps ne changent que pour cette version. Le modèle
systemd passe la vérification statique. Chromium 155.0.8059.79 et Firefox
153.5.0 passent chacun 22 groupes MONITOR/STATS : SSE, versions, ETAT/ÉTAPE,
couleurs, cycle, pannes, filtres, navigation, maintenance et affichage mobile.
Les captures MONITOR bureau Chromium et mobile Firefox sont examinées.
Ces groupes ne sont pas ajoutés au total unitaire.

OpenSpec strict : **12/12** avant archivage, **11/11** après synchronisation,
code 0. Une seule archive : une exigence ajoutée, seize modifiées, zéro
supprimée ou renommée. La comparaison des blocs confirme que les trois
spécifications finales correspondent exactement aux deltas approuvés.

Modèle exact, tokens, coûts, cache, quotas, débit, durée exhaustive et nombre
complet de messages/outils : **N/A**, aucune télémétrie de pilotage normalisée
collectée en SCM. Aucun skill de statistiques pilotées, sous-agent ou
orchestrateur distinct n'est lancé pour ce travail.

## 2. Types de messages et d'outils

Lectures ciblées, rg, empreintes SHA-256, éditions locales, syntaxe, tests
Node/Python, navigateurs headless, vérification statique systemd et CLI OpenSpec.
Aucune commande Git ni inspection de son état. L'identité non secrète du projet
est extraite localement par filtrage des seules clés PROJECT_NAME/PROJECT_ID ;
aucun contenu env brut n'est restitué.

/cab est une procédure Markdown destinée à l'agent consommateur. Le correctif
modifie ses points d'entrée et sa référence distribuée. Les tests de contrat
qualifient cette procédure et ne prouvent pas son exécution future par un agent.
Le test fonctionnel lance le jeu installé isolé avec toutes les sources amont
absentes, vérifie page, assets et identité, et préserve le propriétaire d'un
port occupé. Aucun nouvel installateur ou serveur n'est ajouté.

Aucun déploiement ou démarrage de service réel, appel au contrôleur de
production, migration, intervention sur les RUN, message à un autre chat ou
fournisseur n'est réalisé dans cette session.

## 3. Fichiers et cohérence documentaire

**52 fichiers existants modifiés + 7 nouveaux chemins = 59 chemins livrés**.
Les 33 autres fichiers de la photographie initiale restent inchangés :
85 fichiers initiaux + 7 nouveaux = **92 chemins contrôlés**. Aucun fichier
initial n'est supprimé. OpenSpec déplace six artefacts du change dans son
archive ; le septième fichier est le présent rapport.

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
- `plugins/cab-approval-bridge/web-monitor/index.html`
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

- `openspec/changes/archive/2026-10-20-bootstrap-monitor-before-preflight/STATISTIQUES.md`
- `openspec/changes/archive/2026-10-20-bootstrap-monitor-before-preflight/design.md`
- `openspec/changes/archive/2026-10-20-bootstrap-monitor-before-preflight/proposal.md`
- `openspec/changes/archive/2026-10-20-bootstrap-monitor-before-preflight/specs/codex-integration-distribution/spec.md`
- `openspec/changes/archive/2026-10-20-bootstrap-monitor-before-preflight/specs/concurrent-run-coordination/spec.md`
- `openspec/changes/archive/2026-10-20-bootstrap-monitor-before-preflight/specs/native-session-statistics/spec.md`
- `openspec/changes/archive/2026-10-20-bootstrap-monitor-before-preflight/tasks.md`

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte conservée ; règles d'autorisation et de travail conservées. |
| PROJECT.md | Version et section 5.3.1 : contrôle dès le workspace, reprise, indépendance. |
| TECHNICAL.md | Version et Démarrage du service web : ordre avant PLLM/prévols, preuves et pannes. |
| BUILD.md | Version et Distribution de CAB Monitor : déclenchement au pilotage autorisé, services réutilisés. |
| DEVOPS.md | Inchangé, empreinte conservée ; runtimes et navigateurs déclarés utilisés. |
| README.md | Version et Supervision web locale : entrée/reprise, ordre et lancement manuel conservé. |
| CHANGELOG.md | Nouvelle entrée 1.6.3 de préparation source ; historique conservé. |
| openspec/specs/ | Trois capacités synchronisées : distribution, concurrence, statistiques ; strict 11/11. |
| ORCHESTRATED_CODING.md | Bootstrap avant identité/PLLM, exemption SCM, mandats existants préservés. |
| Commande et skill | Routage et contrôle obligatoire en reprise, preuves HTTP, diagnostics séparés. |
| Sources et distribution | 22 modules en 1.6.3 ; unités inchangées hors description de version. |

UTF-8/LF contrôlé sur les fichiers concernés. Le périmètre repose sur les
empreintes et les seuls répertoires nécessaires ; il ne prétend pas inventorier
le disque entier. Traces et captures régénérables restent dans .monitor-work,
hors livraison ; les tests nettoient leurs processus et profils temporaires.

## 4. Commandes et résultats

Validations exécutées et réussies :

- `/home/devops/node/current/bin/node --test tests/controller-service-distribution.test.mjs tests/monitor-service-start.test.mjs` : code 0, 26 tests ; reprise finale après modification du routage.
- `/home/devops/node/current/bin/node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : code 0, 278 réussis et un ignoré ; 82 977,271862 ms. Les deux suites de contrat sont rejouées après le dernier ajustement documentaire.
- `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` : code 0, 67 réussis en 10,565 s.
- `/home/devops/node/current/bin/node tests/web-monitor-browser.mjs` : code 0, Chromium et Firefox, 22 groupes chacun.
- `/usr/bin/systemd-analyze --user --man=no verify <unité monitor source>` : code 0, contrôle statique sans démarrage.
- `node --check <fichier.mjs>` et `python3 -m py_compile <fichier.py>` : code 0, 30 fichiers ; nouveau contrôle du test après son dernier ajustement.
- `/home/devops/.local/npm/bin/openspec validate bootstrap-monitor-before-preflight --strict --no-interactive` : code 0 avant toute édition de code/test.
- `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` : code 0, 12/12 avant archivage et 11/11 après.
- `/home/devops/.local/npm/bin/openspec archive bootstrap-monitor-before-preflight --yes --json` : code 0, une seule archive et synchronisation des trois capacités.

TMPDIR et PYTHONPYCACHEPREFIX sont dirigés sous la racine vers .monitor-work
pour les commandes concernées. Preuves : early-monitor-*.txt/json et
web-monitor-browser-results.json dans ce dossier.

Lint, typage et construction tiers : **non pertinents**, aucune chaîne
correspondante configurée pour ces scripts. ShellCheck : **non pertinent**,
aucun script shell modifié. Intégration OpenCode native opt-in : **non exécutée**.
Installation et démarrage systemd sur le profil réel : **non exécutés**, hors
périmètre. Aucun test n'est affaibli ou désactivé et aucun délai n'est augmenté.

Un comparateur auxiliaire de synchronisation a échoué à son premier passage :
sa découpe des titres confondait les niveaux Markdown. Le contrôle a été
corrigé puis exécuté avec succès sur les trois capacités, sans modification
des sources ni des spécifications pour contourner cet écart. Aucun test
fonctionnel ou contrôle OpenSpec n'a échoué.

## 5. Accès web

Aucune recherche ou consultation web externe. Les tests HTTP/JSON/SSE,
WebDriver et BiDi utilisent des fixtures loopback. Les captures montrent des
données simulées. Volumes et durée par appel : **N/A**, aucun relevé exhaustif.

## 6. Synthèse globale

Je livre le correctif source 1.6.3 : le monitoring est contrôlé avant les
dépendances amont, y compris en reprise avec services réutilisés. Configuration,
RUN, permissions, schémas, transports et fonctions STATS conservent leurs
contrats. Le moniteur garde son indépendance et aucune activation au login
n'est ajoutée.

Qualification : **345 tests réussis, un scénario optionnel ignoré**, 30 fichiers
syntaxiquement valides, 22 modules cohérents et deux navigateurs qualifiés.
Archivage ciblé et synchronisation réussis ; aucun blocage connu dans ce
périmètre source. L'utilisation réelle requiert la distribution et le chargement
des procédures 1.6.3, puis un démarrage ou une reprise de pilotage autorisés.
Aucun déploiement réel n'est présenté comme réalisé.
