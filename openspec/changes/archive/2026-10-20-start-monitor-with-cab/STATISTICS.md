# Rapport d'archivage SCM — start-monitor-with-cab

Projet : Codex Approval Bridge (`cab`). Date : 20 octobre 2026, Europe/Paris.
Livraison source : **1.6.1**. Session directe SCM.
Archive : `2026-10-20-start-monitor-with-cab`.

## 1. Statistiques générales et décisions

Je livre l'intégration du service indépendant de monitoring dans /cab start.
La commande prépare son jeu installé, démarre explicitement l'unité avant le
contrôleur et vérifie service, page, version et workspace. Une instance active
conforme est réutilisée sans redémarrage ni modification de configuration.
/cab stop et le reset préservent le moniteur pour observer les autres briques
indisponibles. Les diagnostics de monitoring restent distincts du statut CAB.

Le jeu source initial annonçait 1.6.0 ; les briques et supports courants sont
alignés sur la cible 1.6.1, avec cachebuster neuf. Les archives et l'historique
1.6.0 restent conservés. Aucun déploiement ou démarrage n'a été effectué sur
le profil utilisateur réel.

| Validation finale | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node, toutes les suites MJS en série | 276 | 0 | 1 | 277 |
| Python, découverte unittest | 59 | 0 | 0 | 59 |
| Total distinct | **335** | **0** | **1** | **336** |

Le scénario OpenCode réel est ignoré, opt-in absent. Les répétitions ciblées
ne sont pas additionnées. **30 fichiers** passent la syntaxe et **22 modules
sources** annoncent 1.6.1. Le contrôle systemd statique de l'unité retourne 0.

Chromium 155.0.8059.79 et Firefox 153.5.0 passent chacun vingt-deux groupes de
vérifications, incluant MONITOR, ETAT/ÉTAPE, versions, historique, couleurs,
SSE, pannes, filtres, navigation STATS, fenêtres, annulation et purge sur
fixtures, protection des contextes actifs et affichage mobile. Les captures
MONITOR et STATS sont examinées. Ces groupes ne sont pas ajoutés aux tests Node.

OpenSpec strict : **12/12** avant archivage ; **11/11**, code 0 après
synchronisation. Archivage : code 0, une seule archive, synchronisation activée, 4 exigences ajoutées, 15 modifiées, 0 supprimée et 0 renommée.

Modèle exact, tokens, coût, cache, quotas, TTMT, débit, durée exhaustive et
comptages complets des messages ou outils : **N/A**, aucune télémétrie de
pilotage normalisée collectée en SCM. Aucune compétence de statistiques
pilotées invoquée, aucun sous-agent ni orchestrateur distinct lancé.

## 2. Types de messages et d'outils

Lectures ciblées, recherches rg, empreintes, éditions locales, contrôles de
syntaxe, tests Node/Python, vérification statique systemd, navigateurs
headless et CLI OpenSpec. L'identité non secrète PROJECT_NAME/PROJECT_ID a
été extraite localement selon le filtrage autorisé ; aucun autre contenu de
project.env n'a été exposé. Aucune commande Git n'a été exécutée.

La commande /cab est un protocole Markdown versionné destiné à l'agent.
L'intégration modifie donc ce protocole et sa référence distribuée, et non
un CLI natif autonome inexistant. Les actions réelles daemon-reload et start
appartiennent à une invocation explicite ultérieure de /cab start. Cette
session n'a ni installé d'unité réelle, ni activé de service, ni créé de
heartbeat, permission, décision ou mandat de production.

Les tests emploient des services et profils isolés. Le nouveau test copie
les six modules et quatre ressources du jeu documenté, puis lance son entrée
isolée selon le modèle ExecStart, sans composants amont. Il vérifie page,
assets et identité HTTP, y compris chemins avec espaces. Le test de port
occupé vérifie le refus sans interrompre le propriétaire. La syntaxe de l'unité
et l'absence de dépendances aux autres services sont vérifiées séparément.

## 3. Fichiers modifiés

**52 fichiers existants modifiés + 10 nouveaux fichiers = 62 chemins livrés** ; **30 fichiers suivis inchangés**, soit **92 fichiers contrôlés**. Les sept artefacts du change ont été déplacés dans son archive par OpenSpec.

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
- `plugins/cab-approval-bridge/skills/approval-bridge/references/run-lifecycle.md`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/session-reset.md`
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
- `tests/native-opencode.test.mjs`
- `tests/test_crash_recovery.py`
- `tests/test_session_reset.py`
- `tests/web-monitor-browser.mjs`
- `tests/web-monitor.test.mjs`

Nouveaux fichiers, dont ce rapport :

- `openspec/changes/archive/2026-10-20-start-monitor-with-cab/STATISTIQUES.md`
- `openspec/changes/archive/2026-10-20-start-monitor-with-cab/design.md`
- `openspec/changes/archive/2026-10-20-start-monitor-with-cab/proposal.md`
- `openspec/changes/archive/2026-10-20-start-monitor-with-cab/specs/codex-integration-distribution/spec.md`
- `openspec/changes/archive/2026-10-20-start-monitor-with-cab/specs/concurrent-run-coordination/spec.md`
- `openspec/changes/archive/2026-10-20-start-monitor-with-cab/specs/local-web-monitor/spec.md`
- `openspec/changes/archive/2026-10-20-start-monitor-with-cab/specs/native-session-statistics/spec.md`
- `openspec/changes/archive/2026-10-20-start-monitor-with-cab/tasks.md`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md`
- `tests/monitor-service-start.test.mjs`


Le contrôle initial suit 82 fichiers par empreinte et ajoute les seuls
artefacts identifiés du périmètre. UTF-8/LF est contrôlé sur cet ensemble,
sans prétendre inventorier d'éventuelles modifications externes de tout le
disque. Les traces et captures sont dans `.monitor-work/` ; les répertoires
et processus des fixtures sont nettoyés par les tests.

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte conservée ; aucune nouvelle règle d'agent. |
| PROJECT.md | Version cible et section 5.3.1 : démarrage explicite, réutilisation et indépendance. |
| TECHNICAL.md | Modèles de services et section Démarrage du service web par /cab start : identité, erreurs et conservation. |
| BUILD.md | Jeu installé complet, référence monitor-service, déclenchement différé et préservation des fonctions 1.6.0. |
| DEVOPS.md | Inchangé, empreinte conservée ; runtimes et chemins de qualification utilisés. |
| README.md | /cab start devient le lancement intégré ; lancement manuel et diagnostic indépendant conservés. |
| CHANGELOG.md | Entrée 1.6.1 de préparation source, historique 1.6.0 et antérieur conservé. |
| openspec/specs/ | Quatre capacités synchronisées ; **11/11**, code 0 après archivage. |
| ORCHESTRATED_CODING.md | Version et démarrage indépendant documentés sans modifier les mandats ou le gate. |
| Commande, skill et reset | Référence de service, ordre de démarrage et maintien explicite du moniteur à l'arrêt/reset. |
| Sources et distribution | Versions 1.6.1 cohérentes ; identité du moniteur ajoutée et modèle systemd sans couplage. |

L'identité publique contient uniquement le workspace configuré, canonique au
lancement CLI. Elle reste disponible sans contrôleur ou superviseur. Les
variables, ports, autorisations métier, schémas et mécanismes STATS ne sont
pas modifiés. Le moniteur conserve son propre fichier monitor.env et sa
politique Restart=on-failure, sans activation au login ni dépendance au
contrôleur ou au superviseur.

## 4. Commandes

Validations exécutées et réussies :

- `TMPDIR=<dossier local> node --test --test-concurrency=1 tests/controller-service-distribution.test.mjs tests/monitor-service-start.test.mjs tests/web-monitor.test.mjs` : code 0, 36 tests ciblés réussis.
- `TMPDIR=<dossier local> node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : code 0, 276 réussites et un ignoré, durée native 59 260,768007 ms.
- `TMPDIR=<dossier local> PYTHONPYCACHEPREFIX=<cache local> python3 -m unittest discover -s tests -p 'test_*.py'` : code 0, 59 réussites, durée native 5,125 s.
- `TMPDIR=<dossier local> node tests/web-monitor-browser.mjs` : code 0, Chromium et Firefox headless, chacun vingt-deux groupes vérifiés.
- `systemd-analyze --user --man=no verify <modèle du moniteur>` : code 0, contrôle statique sans activation d'unité.
- `node --check <fichier.mjs>` et `py_compile.compile(..., doraise=True)` : 30 fichiers concernés, code 0.
- `openspec validate --all --strict --no-interactive` : code 0 avant archivage, 12/12 ; **11/11**, code 0 après archivage.
- `openspec archive start-monitor-with-cab --yes --json` : code 0, une seule archive, synchronisation activée, 4 exigences ajoutées, 15 modifiées, 0 supprimée et 0 renommée.

Les runtimes utilisés sont `/home/devops/node/current/bin/node`,
`/home/devops/python/current/bin/python3`, `/usr/bin/systemd-analyze` et
`/home/devops/.local/npm/bin/openspec`. Lint, typage et construction tiers :
**non pertinents**, aucune chaîne correspondante n'est configurée pour ces
scripts. ShellCheck : **non pertinent**, aucun script shell modifié.
Activation et redémarrage par un gestionnaire systemd utilisateur réel :
**non exécutés**, hors périmètre des profils actifs ; seuls le modèle statique
et le paquet isolé sont qualifiés. Le fonctionnement d'un déploiement réel
n'est pas présenté comme exécuté.

Aucun échec de validation n'a été rencontré dans cette évolution. Les
modifications du test qui interdisait tout démarrage du moniteur correspondent
au nouveau contrat validé ; les protections d'indépendance et d'absence
d'activation au login sont conservées et renforcées. Les tests existants
n'ont pas été désactivés et les délais n'ont pas été augmentés.

## 5. Accès web

Aucune recherche ou consultation web externe pour cette évolution. Les tests
HTTP/JSON/SSE, WebDriver et BiDi utilisent les seules fixtures loopback. Aucun
endpoint de production n'a été sondé ; les captures montrent des données
simulées. Volumes et durées par appel : **N/A**, aucune collecte exhaustive.

## 6. Synthèse globale

La livraison source 1.6.1 intègre le service web dans /cab start et conserve
son indépendance. Le démarrage explicite et la preuve d'identité précèdent
le contrôleur ; un monitoring indisponible est signalé séparément. /cab stop
et le reset conservent sa configuration, son jeu installé et ses connexions.
Une instance active divergente ou un port occupé n'est jamais remplacé ou
interrompu implicitement. Le lancement manuel reste possible.

Qualification : **335 tests réussis, un scénario réel ignoré**, trente fichiers
syntaxiquement valides, vingt-deux modules en 1.6.1, modèle systemd vérifié et
deux navigateurs qualifiés. Cohérence et archivage : **11/11**, code 0 ;
code 0, une seule archive, synchronisation activée, 4 exigences ajoutées, 15 modifiées, 0 supprimée et 0 renommée. Aucun blocage connu ne subsiste dans la préparation source.
L'utilisation effective requiert le chargement du jeu 1.6.1 et l'invocation
explicite de /cab start ; aucun service actif n'a été modifié dans cette session.
