# Rapport d'archivage SCM — add-run-lifecycle-steps

Projet : Codex Approval Bridge (`cab`). Date : 20 octobre 2026, Europe/Paris.
Livraison source : **1.5.0**, sans incrément de version. Session directe SCM.
Archive : `2026-10-20-add-run-lifecycle-steps`.

## 1. Statistiques générales et décisions

Je livre les onze étapes nommées du cycle, les retours explicites et leur
historique persistant. Le tableau présente ETAT, ÉTAPE et tâches cochées ; la
phase technique reste dans le détail du RUN. Les versions affichées viennent
des briques observées. La surbrillance concerne uniquement la ligne du job :
WAITING en jaune, BLOCKED en rouge, avec blocage prioritaire sur une attente.

| Validation finale | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node, toutes les suites MJS en série | 260 | 0 | 1 | 261 |
| Python, découverte unittest | 59 | 0 | 0 | 59 |
| Total distinct | **319** | **0** | **1** | **320** |

Le scénario OpenCode réel reste ignoré, opt-in absent. Les répétitions ne sont
pas additionnées aux résultats. **11 fichiers MJS** passent la syntaxe et
**21 modules sources** annoncent 1.5.0. Le manifeste et pyproject restent
inchangés, de même que les versions des briques déjà présentes.

Chromium 155.0.8059.79 et Firefox 153.5.0 passent chacun quinze groupes de
vérifications : rendu, limite effective, RUN/changes, tâches 3/14 puis 4/14,
ETAT distinct d'ÉTAPE, versions propres, cycle de onze étapes, retour Revue
8/11 vers Implémentation 6/11, historique, couleurs sur les lignes, filtres,
SSE, panne UNKNOWN, reconnexion et mobile sans débordement. Le passage dynamique
WAITING vers BLOCKED est vérifié. Les captures desktop et mobile sont examinées.
Ces groupes navigateur ne sont pas ajoutés au décompte Node.

OpenSpec strict : **11/11** avant archivage ; **10/10**, code 0 après
synchronisation. Archivage : code 0, une seule archive, synchronisation activée, 11 exigences ajoutées, 0 modifiée, 0 supprimée et 0 renommée.

Tokens, coût, cache, quota, TTMT, débit, durée exhaustive et comptages détaillés
des messages et outils : **N/A**, aucune télémétrie de pilotage normalisée
collectée en SCM. Aucun sous-agent, orchestrateur distinct ou agent OpenCode
de production lancé ; aucune compétence de statistiques pilotées invoquée.

## 2. Types de messages et d'outils

Lectures ciblées, recherches rg, éditions locales, empreintes, validations
Node/Python/OpenSpec et navigateurs headless. Le cycle est une observation
structurée, déclarée par POST /job/progress et sa route par RUN. Sa persistance
ne crée ni décision, ni permission, ni relance, ni acquisition, ni gate.

Les tests utilisent seulement des services loopback, workspaces et profils
isolés. Une ancienne source garde une étape inconnue et sa dernière version
connue avec fraîcheur explicite. Aucun historique de production n'est lu et
aucune déclaration n'est envoyée à un RUN actif. Aucun Git, commit, préparation
de commit, push, branche, installation ou changement de profil utilisateur.

## 3. Fichiers modifiés

**22 fichiers existants modifiés + 11 nouveaux fichiers = 33 chemins livrés** ; **47 fichiers suivis inchangés**, soit **80 fichiers contrôlés**. OpenSpec a déplacé les sept artefacts du change dans son archive.

Fichiers existants modifiés :

- `.codex/commands/cab.md`
- `BUILD.md`
- `CHANGELOG.md`
- `ORCHESTRATED_CODING.md`
- `PROJECT.md`
- `README.md`
- `TECHNICAL.md`
- `openspec/specs/codex-integration-distribution/spec.md`
- `openspec/specs/controller-transport/spec.md`
- `openspec/specs/local-web-monitor/spec.md`
- `openspec/specs/persistent-job-supervision/spec.md`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs`
- `plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md`
- `plugins/cab-approval-bridge/web-monitor/app.mjs`
- `plugins/cab-approval-bridge/web-monitor/style.css`
- `tests/concurrent-controller.test.mjs`
- `tests/controller-job-restoration.test.mjs`
- `tests/controller-service-distribution.test.mjs`
- `tests/web-monitor-browser.mjs`
- `tests/web-monitor.test.mjs`

Nouveaux fichiers, dont ce rapport :

- `openspec/changes/archive/2026-10-20-add-run-lifecycle-steps/STATISTIQUES.md`
- `openspec/changes/archive/2026-10-20-add-run-lifecycle-steps/design.md`
- `openspec/changes/archive/2026-10-20-add-run-lifecycle-steps/proposal.md`
- `openspec/changes/archive/2026-10-20-add-run-lifecycle-steps/specs/codex-integration-distribution/spec.md`
- `openspec/changes/archive/2026-10-20-add-run-lifecycle-steps/specs/controller-transport/spec.md`
- `openspec/changes/archive/2026-10-20-add-run-lifecycle-steps/specs/local-web-monitor/spec.md`
- `openspec/changes/archive/2026-10-20-add-run-lifecycle-steps/specs/persistent-job-supervision/spec.md`
- `openspec/changes/archive/2026-10-20-add-run-lifecycle-steps/tasks.md`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/run-lifecycle.md`
- `tests/run-lifecycle.test.mjs`


Le contrôle porte sur 69 fichiers initiaux par empreinte et les nouveaux
artefacts identifiés. Il ne prétend pas inventorier les changements externes
sur tout le disque. UTF-8/LF est contrôlé sur ce périmètre. Les traces et
captures de qualification sont dans `.monitor-work/` ; les workspaces et
profils de fixtures sont nettoyés par les tests.

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte conservée ; aucune nouvelle règle d'agent. |
| PROJECT.md | Section 5.3.1 : ETAT, cycle, retours et versions observées. |
| TECHNICAL.md | Section Cycle du RUN, ETAT et versions observées : catalogue, API, persistance, compatibilité, couleurs et priorité. |
| BUILD.md | Catalogue partagé ajouté au jeu distribué ; version 1.5.0 conservée. |
| DEVOPS.md | Inchangé, empreinte conservée ; runtimes, OpenSpec et navigateurs utilisés. |
| README.md | Présentation ETAT/ÉTAPE, phase en détail, versions et couleurs des lignes. |
| CHANGELOG.md | Entrée 1.5.0 existante complétée, sans nouvelle version ou date de publication. |
| openspec/specs/ | Quatre capacités existantes synchronisées ; **10/10**, code 0. |
| ORCHESTRATED_CODING.md | Déclaration d'étape, séquence et référence distribuée ajoutées ; mandats et gates conservés. |
| Commande et skill CAB | Catalogue et producteur documentés, dépendances run-steps et monitor-events explicitées. |
| Manifeste et pyproject | Inchangés, empreintes conservées, version de base 1.5.0. |

Les anciens jobs sans lifecycle restent lisibles, sans étape inventée. Un
champ présent invalide refuse la restauration. Réarmement du même job et
récupération du même RUN conservent l'historique ; un nouveau job démarre sans
étape. Les cent derniers passages et la séquence totale restent séparés de
la position sur onze. La phase technique WORK/REPORT et les tâches X/Y ne
sont ni renommées ni réinterprétées comme étapes dans les API.

## 4. Commandes

Validations exécutées et réussies :

- `TMPDIR=<dossier local> node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : code 0, 260 réussites et un ignoré ; durée native 61 555,801333 ms.
- `TMPDIR=<dossier local> PYTHONPYCACHEPREFIX=<cache local> python3 -m unittest discover -s tests -p 'test_*.py'` : code 0, 59 réussites ; durée native 5,094 secondes.
- `TMPDIR=<dossier local> node tests/web-monitor-browser.mjs` : code 0, Chromium et Firefox headless, chacun quinze groupes vérifiés ; captures 1440×1100 et 390×844.
- `node --check <fichier.mjs>` : 11 fichiers concernés, code 0.
- `openspec validate --all --strict --no-interactive` : code 0 avant archivage, 11/11 ; **10/10**, code 0 après archivage.
- `openspec archive add-run-lifecycle-steps --yes --json` : code 0, une seule archive, synchronisation activée, 11 exigences ajoutées, 0 modifiée, 0 supprimée et 0 renommée.

Les runtimes explicites sont `/home/devops/node/current/bin/node`,
`/home/devops/python/current/bin/python3` et
`/home/devops/.local/npm/bin/openspec`. Lint, typage et construction tiers :
**non pertinents**, aucune chaîne de ce type configurée pour ces modules et
ressources. Tests Python syntaxiques supplémentaires : **non pertinents**,
aucun fichier Python modifié. Tests sur RUN actifs et installation :
**non exécutés**, hors périmètre.

Les tests ciblés couvrent catalogue, positions, retours 7→6 et 8→6,
idempotence, séquence concurrente, réarmement, redémarrage, récupération,
nouveau job, persistance échouée, gate inchangé et refus de données invalides.
La première qualification des couleurs a révélé une attente encore jaune
malgré une cause supérieure de blocage ; la priorité BLOCKED a été corrigée,
les régressions ciblées et la passe globale finale ont réussi, puis les deux
navigateurs ont validé le passage au rouge. Aucun test ou délai existant n'a
été affaibli. Cette tentative échouée n'est pas comptée comme réussite.

## 5. Accès web

Aucune recherche ou consultation web externe pour cette évolution. Les tests
HTTP/JSON/SSE, WebDriver et BiDi visent les seules fixtures loopback. Les
versions de production ne sont pas sondées ; les versions visibles dans les
captures sont des données simulées. Volumes réseau et durées par appel :
**N/A**, aucune collecte exhaustive dédiée.

## 6. Synthèse globale

La livraison conserve 1.5.0 et ajoute ETAT, les onze étapes avec retours,
l'historique durable et les versions réellement observées. WAITING colore la
ligne du job en jaune, BLOCKED en rouge ; l'étape reste indépendante. La phase
technique reste dans le détail. Un job à Clôture 11/11 ne devient terminal
qu'après validation du gate existant. Aucun service actif n'est redémarré.

Qualification finale : **319 tests réussis, un scénario réel ignoré**, deux
navigateurs, onze fichiers syntaxiquement valides et vingt et un modules
sources en 1.5.0. Cohérence documentaire et archivage : **10/10**, code 0 ;
code 0, une seule archive, synchronisation activée, 11 exigences ajoutées, 0 modifiée, 0 supprimée et 0 renommée. Aucun blocage connu ne subsiste dans la livraison source.
Le chargement des nouveaux modules et du protocole dans un environnement actif
reste une opération de mise en service distincte.
