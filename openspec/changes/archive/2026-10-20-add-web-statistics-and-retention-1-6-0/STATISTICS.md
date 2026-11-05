# Rapport d’archivage SCM — STATS et purge des historiques

Projet : Codex Approval Bridge (`cab`). Version source : **1.6.0**.
Date : 20 octobre 2026, Europe/Paris.
Archive : `2026-10-20-add-web-statistics-and-retention-1-6-0`.

## 1. Statistiques générales et décisions

Je livre STATS sous MONITOR, une page de statistiques filtrées par période
et RUN, et une purge manuelle des historiques antérieurs à 1/3/7/30/365 jours.
Les sources natives et importées restent séparées. Les cumuls par contexte
restent distincts des fenêtres. La purge exige prévisualisation, confirmation
et recontrôle ; elle préserve les contextes actifs ou référencés, les fichiers
opérationnels et les preuves métier. Les agrégats globaux cumulatifs restent
conservés. La rétention native reste limitée à 30 jours.

| Qualification finale distincte | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node, toutes les suites MJS | 273 | 0 | 1 | 274 |
| Python, découverte unittest | 59 | 0 | 0 | 59 |
| Total distinct | **332** | **0** | **1** | **333** |

Le test OpenCode natif opt-in reste ignoré : aucune intégration de production
n’est revendiquée. Les répétitions ciblées ne sont pas additionnées. Les 59
tests Python passent sous Python 3.13 puis sous Python 3.14.8 de DEVOPS.md ;
ils ne sont comptés qu’une fois. Le test de distribution repasse après
actualisation du cachebuster réel `1.6.0+codex.20261020094415`.

Chromium **155.0.8059.79** et Firefox **153.5.0** passent chacun **22 groupes**
de vérifications, dont navigation STATS/MONITOR, fenêtre 7 jours, filtre RUN,
cumul distinct, prévisualisation, annulation, purge, protection active,
indisponibilité avec anciennes données et affichage mobile sans débordement.
La qualification finale utilise les dernières règles CSS. Les captures bureau,
mobile et dialogue ont été examinées ; les tableaux mobiles défilent en interne.
Ces deux parcours restent distincts des totaux des tests unitaires.

Syntaxe : **24 fichiers JavaScript + 8 fichiers Python = 32 fichiers**.
OpenSpec strict avant archivage : **11/11**. Archivage : code 0,
**7 exigences ajoutées, 15 modifiées, 0 supprimée, 3 renommées**,
synchronisation activée. Contrôle strict final après archivage : **11/11**, code 0.

Tokens, coût, TTMT, débit, quota Codex, durée exhaustive et volumes exacts
par outil : **N/A — aucune télémétrie de pilotage normalisée collectée dans
cette session directe SCM**. Aucun modèle ou fournisseur n’est déduit des tests.
La compétence de statistiques pilotées, les sondes CAB et les sous-agents
n’ont pas été déclenchés.

## 2. Types de messages et d’outils

Lectures ciblées, recherches rg, éditions locales, empreintes SHA-256,
contrôles de syntaxe, tests Node/Python, navigateurs headless et CLI OpenSpec.
Les échanges HTTP/JSON/SSE et WebDriver/BiDi concernent des services loopback
simulés et des profils isolés. Aucun message externe, mandat de production,
permission réelle ou appel LLM supplémentaire n’a été envoyé.

L’identité non secrète du projet a été extraite localement selon l’exception
AGENTS.md ; aucune autre variable de project.env n’a été transmise. Les
sources exclues n’ont pas été utilisées. La rédaction suit les préférences
explicites du projet, sans revendication de références stylistiques récupérées.

Un diagnostic Git initial, avant lecture du prompt SCM, a été refusé pour
propriété du dépôt. Aucun état Git n’a été inspecté avec succès ; aucun
nouveau diagnostic Git n’a suivi le chargement de SCM. Aucun commit,
préparation de commit, branche, push, tag ou configuration Git n’a été réalisé.

## 3. Fichiers modifiés

L’inventaire ciblé initial contient **78 fichiers**. Après synchronisation,
**52 fichiers existants sont modifiés**, **26 restent inchangés** et
**13 fichiers sont nouveaux**, soit **65 chemins livrés** et **91 fichiers
contrôlés**. Ces nombres proviennent des empreintes locales, sans inspection
Git ni prétention d’inventaire exhaustif de la machine. Les huit artefacts du
change ont été déplacés vers cette archive une seule fois par OpenSpec.

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
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs`
- `plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/run-lifecycle.md`
- `plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md`
- `plugins/cab-approval-bridge/skills/coding-session-statistics/references/observations.md`
- `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service`
- `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service`
- `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service`
- `plugins/cab-approval-bridge/web-monitor/app.mjs`
- `plugins/cab-approval-bridge/web-monitor/index.html`
- `plugins/cab-approval-bridge/web-monitor/style.css`
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

Nouveaux fichiers, dont le présent rapport :

- `openspec/changes/archive/2026-10-20-add-web-statistics-and-retention-1-6-0/STATISTIQUES.md`
- `openspec/changes/archive/2026-10-20-add-web-statistics-and-retention-1-6-0/design.md`
- `openspec/changes/archive/2026-10-20-add-web-statistics-and-retention-1-6-0/proposal.md`
- `openspec/changes/archive/2026-10-20-add-web-statistics-and-retention-1-6-0/specs/codex-integration-distribution/spec.md`
- `openspec/changes/archive/2026-10-20-add-web-statistics-and-retention-1-6-0/specs/concurrent-run-coordination/spec.md`
- `openspec/changes/archive/2026-10-20-add-web-statistics-and-retention-1-6-0/specs/local-web-monitor/spec.md`
- `openspec/changes/archive/2026-10-20-add-web-statistics-and-retention-1-6-0/specs/native-session-statistics/spec.md`
- `openspec/changes/archive/2026-10-20-add-web-statistics-and-retention-1-6-0/specs/web-statistics-retention/spec.md`
- `openspec/changes/archive/2026-10-20-add-web-statistics-and-retention-1-6-0/tasks.md`
- `openspec/specs/web-statistics-retention/spec.md`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs`
- `plugins/cab-approval-bridge/web-monitor/stats.mjs`
- `tests/statistics-maintenance.test.mjs`

| Document | Bilan et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte initiale conservée ; aucune nouvelle règle d’agent. |
| PROJECT.md | Section 5.3.1 : STATS et maintenance propriétaire ; schéma cohérent avec le relais de purge. Références courantes 1.6.0. |
| TECHNICAL.md | Section « STATS et maintenance des historiques — 1.6.0 » : routes, champs, bornes, protections, concurrence, reçus et erreurs partielles. |
| BUILD.md | Inventaires et section de distribution du moniteur : statistics-maintenance, observation-statistics et stats.mjs requis. |
| DEVOPS.md | Inchangé, empreinte conservée ; runtimes et navigateurs décrits utilisés. Python 3.14.8 a été qualifié explicitement. |
| README.md | Section supervision : navigation, sélections, confirmation et limites de purge ; schéma actualisé. |
| CHANGELOG.md | Entrée 1.6.0 « préparation source » ; entrées historiques 1.5.0 et antérieures conservées. |
| openspec/specs/ | local-web-monitor, native-session-statistics, codex-integration-distribution et concurrent-run-coordination synchronisées ; nouvelle web-statistics-retention ; strict final 11/11. |
| ORCHESTRATED_CODING.md | Références de version courante alignées ; règles métier conservées. Aucun pilotage exécuté. |

La marketplace ne porte pas de numéro de version propre et reste inchangée ;
son référencement est couvert par le test de distribution. Les schémas JSON,
contrats de permission, licences et configurations OpenCode restent préservés.
Les captures, résultats navigateur, empreintes et caches régénérables restent
sous `.scm-web-stats-work/` ; ce dossier de travail n’appartient pas aux sources
à versionner. Les profils et workspaces des fixtures sont nettoyés par les tests.

## 4. Commandes

Validations exécutées et réussies :

- `TMPDIR=<dossier local> node --test --test-concurrency=2 tests/*.test.mjs` : code 0, 273 réussis, un ignoré ; durée native 30 705,827985 ms.
- `TMPDIR=<dossier local> PYTHONPYCACHEPREFIX=<cache local> /home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` : code 0, 59 réussis ; durée native 5,476 s sous Python 3.14.8.
- `TMPDIR=<dossier local> /home/devops/node/current/bin/node tests/web-monitor-browser.mjs` : code 0 ; Chromium et Firefox, bureau 1440×1100 et mobile 390×844, avec fixtures de purge et captures.
- `node --check <fichier.mjs>` et `py_compile.compile(..., doraise=True)` : 24 fichiers JavaScript et 8 Python vérifiés. Python 3.14.8 utilisé pour la vérification Python finale.
- `/home/devops/node/current/bin/node --test tests/controller-service-distribution.test.mjs` : code 0, 21 réussis après actualisation finale du cachebuster.
- `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` : code 0, 11/11 avant archivage et 11/11 après les corrections documentaires finales.
- `/home/devops/.local/npm/bin/openspec archive add-web-statistics-and-retention-1-6-0 --yes --json` : code 0, archive unique, synchronisation activée, totaux 7/15/0/3.

Les contrôles Node initiaux utilisaient `/usr/bin/node`, identique octet pour
octet à `/home/devops/node/current/bin/node` selon `cmp -s` (code 0).
Les contrôles navigateur finaux et de distribution utilisent explicitement
le chemin DEVOPS.md. Le préfixe de cache Python et TMPDIR pointent dans la
racine autorisée. Aucun script shell n’a été modifié. Lint, typage et build
tiers : **non pertinents**, aucune chaîne correspondante configurée pour ce
périmètre sans dépendance tierce. Intégration native opt-in et déploiement :
**non exécutés**, hors préparation source.

Échecs intermédiaires corrigés : deux assertions de distribution attendaient
encore la version échappée 1.5.0 ; leurs attentes ont été alignées sur 1.6.0.
La première fixture navigateur ne définissait pas integrationOwner à null,
ce qui rendait son segment statistique invalide ; la fixture complète passe
ensuite les deux navigateurs. Une exigence de protection trop longue a été
raccourcie après avertissement strict. Après archivage, le contrôle strict
principal a signalé la longueur de l’exigence du moniteur : elle a été
condensée dans la spécification et son delta archivé, sans changement de
comportement ni second archivage. Le Purpose généré a été complété avant
le strict final. Aucun test n’a été supprimé, désactivé ou affaibli.

## 5. Accès web

Aucune recherche ou consultation web externe pendant cette session.
Les échanges réseau des validations ciblent uniquement les serveurs loopback
de test et les navigateurs isolés. Les sources de production, magasins privés
réels et services utilisateur n’ont pas été interrogés ou modifiés.
Volumes réseau et durée exhaustive par appel : **N/A — aucune collecte dédiée**.

## 6. Synthèse globale

Je livre les sources CAB 1.6.0 avec STATS et purge historique explicite.
Le contrôle final établit **332 tests distincts réussis, un scénario natif
ignoré, deux navigateurs qualifiés et 32 fichiers syntaxiquement valides**.
L’archive est unique, les spécifications sont synchronisées et le strict
final passe sur onze capacités. Les mesures absentes restent motivées N/A.

La purge ne supprime pas tous les fichiers JSON : elle retire seulement les
éléments statistiques admissibles des deux magasins propriétaires, après
confirmation. Elle conserve les contextes protégés, segments mixtes et jeux
protégés. Les agrégats globaux cumulatifs non décomposables restent conservés.
Une purge confirmée est irréversible sans sauvegarde préalable ; un échec
partiel est présenté par magasin. Les jetons/reçus sont temporaires et une
nouvelle prévisualisation est nécessaire après expiration ou redémarrage.

La mise en service, les mises à jour de profils installés et les suppressions
de données réelles restent distinctes de cette livraison source. Aucun
service actif, RUN réel, permission, décision ou preuve opérationnelle n’a été
modifié. Les tests de purge ont utilisé uniquement les fixtures isolées.
