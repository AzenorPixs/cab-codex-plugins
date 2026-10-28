# Rapport d'archivage SCM — add-resource-scoped-coordination-1-3-0

Session directe `cab-1-3-0-resource-scoped-coordination`, projet `/home/devops/datas/cab`. État : **TERMINÉ pour la livraison source et l'archive documentée**. Ce rapport couvre cette seule archive ; les validations communes au jeu 1.3.0 sont explicitement partagées avec l'autre archive.

Coordination durable par ressources : ensembles atomiques, FIFO entre conflits, lectures compatibles, exclusivité privée et promotion, révisions/proofs ciblées, publication idempotente, REPORT, reprise et quatre exceptions globales. Migration et retour arrière qualifiés sur états synthétiques. Les décisions unitaires et permissions natives once restent obligatoires.

### Agent de codage

| Agent | Fournisseur | Version exacte / raisonnement | TTMT / débit / temps de service |
| --- | --- | --- | --- |
| Codex, session directe | OpenAI | N/A — métadonnées exactes non relevées | N/A — télémétrie de pilotage non activée en SCM |

Aucun orchestrateur distinct, sous-agent ou agent de codage OpenCode n'a été lancé. Les processus OpenCode/Codex des tests sont simulés. Le prompt SCM exclut la compétence de statistiques pilotées et ses sondes ; ce rapport utilise uniquement les preuves disponibles.

## 1. Statistiques générales et décisions

Le développeur a validé le cycle SCM complet jusqu'à archivage et rapport, sans Git, déploiement ou intervention sur les RUN actifs. Il a ensuite explicitement autorisé l'intégration des fonctions et la clôture du change statistiques. Ces deux décisions de périmètre sont documentées ; elles ne valent pas autorisation de mise en service.

| Validation finale commune | Réussis | Ignorés | Échecs |
| --- | ---: | ---: | ---: |
| Node, 12 suites exécutées et un scénario opt-in | 213 | 1 | 0 |
| Python, découverte de tests | 56 | 0 | 0 |
| Total des tests | **269** | **1** | **0** |

Taux parmi les 269 tests exécutés : 100 %. Parmi les 270 scénarios recensés : 269 exécutés (99,63 %) et un ignoré (0,37 %). Le scénario OpenCode vivant est **non exécuté**, opt-in absent conformément au périmètre ; il n'est pas compté comme réussite. Les 269 succès sont le même total partagé dans les deux rapports : ils ne doivent pas être additionnés en 538.

Syntaxe : 37 fichiers Python/MJS contrôlés avec succès. Distribution : 17 sources annonçant une version contrôlées à 1.3.0 ; manifeste plugin `1.3.0+codex.20261016211108`. OpenSpec strict ciblé : deux changes valides. Global strict avant archive : 11/11 ; après les deux archives : 9/9, exit natif 0 et aucun avertissement émis. Aucun lint, contrôle de types ou construction tiers n'est configuré dans `pyproject.toml` (dépendances vides) ; ces contrôles sont non pertinents au périmètre.

Bornes documentaires : première empreinte `2026-10-16T20:20:24.602793+00:00` ; rédaction de ce rapport `2026-10-16T22:56:43.394930+00:00` (Europe/Paris `2026-10-17T00:56:43.394930+02:00`). Intervalle entre ces contrôles : 9378.792 secondes. Cette borne partielle ne mesure ni toute la conversation ni le temps de service du modèle. Durée exhaustive de session, tokens, cache, coût, TTMT, débit et quotas SCM : **N/A**, collecte absente ; aucune reconstruction rétroactive. Les quotas de l'audit historique sont partagés et ne mesurent pas SCM.

Échecs intermédiaires conservés dans le registre partiel : attentes historiques de version/protocole corrigées conformément au nouveau contrat, compatibilité historique sans RUN préservée, contraintes `listen EPERM` traitées par exécution autorisée des seuls serveurs simulés hors sandbox. La dernière course de comptage des lectures HTTP provenait du polling périodique de permissions ; seule la cadence de cette fixture de mesure a été isolée, sans changer ses assertions. La relance a donné 29/29. Les résultats finaux ne masquent pas ces tentatives ; un échec technique de test n'est pas un refus CAB de production.

**Écart de qualification :** trois anciennes fixtures utilisaient la racine CAB réelle comme workspace, avec transports OpenCode/Codex simulés. Elles ont pu écrire des fichiers techniques sous `.opencode/state/cgpt-approval-bridge/`. Leur isolation a été corrigée vers des répertoires temporaires et les variables CAB héritées sont filtrées. Aucun appel natif n'était dirigé vers les RUN actifs. Aucun nettoyage, lecture ou restauration de ce runtime exclu n'a été entrepris, son état initial n'étant pas prouvé. L'absence totale d'écriture runtime pendant la qualification n'est donc pas revendiquée.

## 2. Types de messages et d'outils

Lectures ciblées, recherches, éditions locales, empreintes, vérifications de syntaxe, tests Python/Node, consultations de documentation officielle et CLI OpenSpec. Répartition exhaustive des messages/appels : **N/A**, aucun journal statistique normalisé de SCM. Mandats et approbations CAB de production : zéro, non applicables à cette session directe ; les décisions et permissions observées dans les tests sont synthétiques.

Les suites Node sont exécutées séparément. Les élévations de sandbox concernent les fixtures loopback éphémères et l'édition déjà autorisée de la commande source Codex protégée ; elles n'ont pas installé ou démarré un service utilisateur. Une première revue automatique a refusé l'édition de `.codex/commands/cab.md` en la confondant avec une configuration OpenCode ; le périmètre et la distinction source Codex ont ensuite été prouvés, puis la même édition ciblée a été autorisée. Aucun contournement de cette revue n'a été employé.

## 3. Fichiers modifiés

Le contrôle ciblé compare 60 empreintes initiales et six nouveaux fichiers : **52 fichiers existants modifiés + 6 créés + 8 inchangés = 66**. Parmi les 58 chemins sources/spécifications touchés : 89,66 % existants modifiés et 10,34 % nouveaux. Ce jeu est commun aux deux changes, sans attribution exclusive inventée. Il ne constitue pas un inventaire exhaustif du disque ou de modifications externes concurrentes.

| Chemin relatif à CAB | État |
| --- | --- |
| `.codex/commands/cab.md` | modifié |
| `BUILD.md` | modifié |
| `CHANGELOG.md` | modifié |
| `ORCHESTRATED_CODING.md` | modifié |
| `PROJECT.md` | modifié |
| `README.md` | modifié |
| `TECHNICAL.md` | modifié |
| `openspec/specs/approval-persistence/spec.md` | modifié |
| `openspec/specs/approval-workflow/spec.md` | modifié |
| `openspec/specs/codex-integration-distribution/spec.md` | modifié |
| `openspec/specs/concurrent-run-coordination/spec.md` | modifié |
| `openspec/specs/controller-transport/spec.md` | modifié |
| `openspec/specs/native-session-statistics/spec.md` | modifié |
| `openspec/specs/persistent-job-supervision/spec.md` | modifié |
| `openspec/specs/supervision-remediation/spec.md` | modifié |
| `plugins/cab-approval-bridge/.codex-plugin/plugin.json` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs` | créé |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | créé |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | modifié |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | modifié |
| `plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | modifié |
| `plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md` | modifié |
| `plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md` | modifié |
| `plugins/cab-approval-bridge/skills/coding-session-statistics/references/observations.md` | créé |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | modifié |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | modifié |
| `pyproject.toml` | modifié |
| `src/cgpt_approval_bridge_journal.py` | modifié |
| `src/cgpt_approval_bridge_router.py` | modifié |
| `src/cgpt_approval_bridge_server.py` | modifié |
| `tests/concurrent-controller.test.mjs` | modifié |
| `tests/concurrent-supervisor.test.mjs` | modifié |
| `tests/controller-configuration.test.mjs` | modifié |
| `tests/controller-healthcheck-compatibility.test.mjs` | modifié |
| `tests/controller-job-restoration.test.mjs` | modifié |
| `tests/controller-service-distribution.test.mjs` | modifié |
| `tests/controller-session-recovery.test.mjs` | modifié |
| `tests/helpers/cab-environment.mjs` | créé |
| `tests/native-opencode.test.mjs` | modifié |
| `tests/native-statistics.test.mjs` | modifié |
| `tests/observation-statistics.test.mjs` | créé |
| `tests/persistent-job-supervisor.test.mjs` | modifié |
| `tests/resource-coordination.test.mjs` | créé |
| `tests/test_concurrent_broker.py` | modifié |
| `tests/test_crash_recovery.py` | modifié |
| `tests/test_pending_listing.py` | modifié |
| `tests/test_piloted_prompts.py` | modifié |
| `tests/test_session_reset.py` | modifié |

`AGENTS.md`, `DEVOPS.md`, le catalogue marketplace et les autres chemins inchangés conservent leurs empreintes, détaillées dans l'inventaire. Aucun fichier fonctionnel n'est supprimé. Les dossiers de changes ont été déplacés uniquement par les deux archives explicitement autorisées. Des sorties locales régénérables de cette session ont été remplacées après vérification de leur empreinte ; aucun nettoyage large n'a été effectué.

Fichiers de cette archive avant ce rapport (17 chemins) :

- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/.openspec.yaml`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/INVENTAIRE-SCM.json`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/MATRICE-DOCUMENTAIRE.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/PERIMETRE-SCM.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/PREUVES-SCM.json`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/VALIDATIONS-SCM.json`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/design.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/proposal.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/specs/approval-persistence/spec.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/specs/approval-workflow/spec.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/specs/codex-integration-distribution/spec.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/specs/concurrent-run-coordination/spec.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/specs/controller-transport/spec.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/specs/native-session-statistics/spec.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/specs/persistent-job-supervision/spec.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/specs/supervision-remediation/spec.md`
- `openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/tasks.md`

Ce rapport ajoute `STATISTIQUES.md`, soit 18 fichiers dans cette archive. Les artefacts OpenSpec/proofs sont distincts des 58 chemins sources. Les sorties hors versionnement sont `output/scm/cab-1-3-0/observations-multirun.json` et `qualification-observations.json` ; `.gitignore` exclut déjà output/. Aucun travail Git n'a été effectué.

La [matrice documentaire](/home/devops/datas/cab/openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/MATRICE-DOCUMENTAIRE.md) donne pour chaque cadrage, README, CHANGELOG et protocole son état et ses preuves. L'[inventaire](/home/devops/datas/cab/openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/INVENTAIRE-SCM.json) conserve les SHA-256. Les huit capacités canoniques concernées ont été synchronisées ; archive-session-statistics reste inchangée. Aucune propagation des prompts ou modification d'un cache installé n'a été réalisée.

## 4. Commandes

| Suite finale commune | Réussis | Ignorés | Échecs |
| --- | ---: | ---: | ---: |
| tests/resource-coordination.test.mjs | 20 | 0 | 0 |
| python | 56 | 0 | 0 |
| tests/concurrent-controller.test.mjs | 29 | 0 | 0 |
| tests/concurrent-run-registry.test.mjs | 22 | 0 | 0 |
| tests/native-statistics.test.mjs | 11 | 0 | 0 |
| tests/observation-statistics.test.mjs | 11 | 0 | 0 |
| tests/controller-service-distribution.test.mjs | 19 | 0 | 0 |
| tests/controller-configuration.test.mjs | 13 | 0 | 0 |
| tests/controller-session-recovery.test.mjs | 41 | 0 | 0 |
| tests/controller-job-restoration.test.mjs | 27 | 0 | 0 |
| tests/persistent-job-supervisor.test.mjs | 11 | 0 | 0 |
| tests/concurrent-supervisor.test.mjs | 3 | 0 | 0 |
| tests/controller-healthcheck-compatibility.test.mjs | 6 | 0 | 0 |
| tests/native-opencode.test.mjs | 0 | 1 | 0 |

Python : `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'`. Node : `/home/devops/node/current/bin/node tests/<suite>.test.mjs`, une suite par invocation ; les fixtures HTTP utilisent le PATH des runtimes DEVOPS. Syntaxe : `py_compile` et `node --check` sur les fichiers recensés. Les commandes exactes, codes de sortie et sorties conservées sont dans [VALIDATIONS-SCM.json](/home/devops/datas/cab/openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0/VALIDATIONS-SCM.json). Le registre est partiel : nombre exhaustif de commandes et répartition par outil **N/A**.

Archivage de ce change : `/home/devops/.local/npm/bin/openspec archive add-resource-scoped-coordination-1-3-0 --yes --json`, réussi une seule fois, avec synchronisation des spécifications, sans désactiver la validation : 31 exigences ajoutées, 23 modifiées, aucune supprimée ni renommée ; huit capacités synchronisées. Chemin natif : `/home/devops/datas/cab/openspec/changes/archive/2026-10-17-add-resource-scoped-coordination-1-3-0`. L'option non interactive exécute l'archivage déjà explicitement validé par le développeur.

Contrôle commun après archives : `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive`, exit 0, neuf spécifications valides, zéro échec, aucun avertissement émis. Le contrôle du rapport exige ses six sections, UTF-8/LF, totaux cohérents et présence des preuves ; il est enregistré dans PREUVES-SCM.json après rédaction.

Qualification réelle hors ligne : CLI `cgpt-approval-bridge-import-observations.mjs`, deux `--samples` ordonnés, `--config`, `--monitor`, `--quota`, `--proof`, puis `--output`. **38 586 lignes**, arrêt déclaré et stabilité des entrées vérifiés ; dataset `audit-17178822d83f1240a6acfb0dc315b6d3`, SHA-256 `b6027c03c165e26c2d2484275ea9e254b8b6348d3930244404a63ea36860f8b0`. La vérification en mémoire retourne `imported` puis `already-imported`, sans écrire dans un contrôleur actif.

Le jeu contient 1 502 intervalles, 127 événements, 49 contextes, deux relevés de quota et une preuve documentaire. Les cinq sélections courant/dernière livraison observée/24 h/7 j/30 j respectent leurs partitions temporelles. Les sources natives et importées restent séparées. Le résumé historique présente un écart maximal absolu de 3,437 secondes par catégorie, lié aux bornes millisecondes, découpages conservateurs et changements de portée ; il n'est pas déclaré identique. Les lacunes et mesures antérieures non prouvées restent inconnues, jamais zéro inventé. Détails : [QUALIFICATION-OBSERVATIONS.json](/home/devops/datas/cab/openspec/changes/archive/2026-10-17-integrate-observation-statistics/QUALIFICATION-OBSERVATIONS.json).

## 5. Accès web

Une référence primaire officielle a été consultée pour la corrélation native : [processeur OpenCode v1.19.2](https://raw.githubusercontent.com/anomalyco/opencode/v1.19.2/packages/opencode/src/session/processor.ts). Elle distingue le début d'un outil de sa fin après attente de permission ; le test utilise callID et une fin postérieure à once. Les recherches visaient la source officielle OpenCode ; une ouverture de bash.ts a échoué et n'a pas servi de preuve. Nombre exhaustif d'accès web, durées et volumes : **N/A**, pas de collecte normalisée. Aucune URL de service actif ou donnée sensible n'a été transmise pour cette recherche.

## 6. Synthèse globale

Ce change est livré dans les sources CAB 1.3.0, synchronisé et archivé avec son rapport individuel. Les validations communes établissent 269 tests réussis, un scénario natif volontairement non exécuté et OpenSpec strict 9/9 après archive. Les sources, cadrages, documentation, commande et distribution sont cohérents dans le périmètre revu.

Les quatre causes globales sont réconciliation commune, maintenance partagée, pause globale et arrêt global explicites. Les validations, publications et rapports ordinaires protègent leurs ressources ; les RUN indépendants progressent. Décisions explicites, mandats unitaires, ask/once, révisions et gates sont conservés. Le broker reste au magasin extensible 2, le registre concurrent passe au schéma 4, les observations utilisent un magasin privé 2 et des bundles 1 ; MCP reste 2024-11-05.

Aucun Git, déploiement, migration active, propagation interprojets ou intervention native sur les RUN actifs. L'écart des anciennes fixtures et les limites de l'import sont conservés ci-dessus. Le scénario OpenCode vivant et les gains réels de productivité restent non qualifiés ; la mise en service et la migration nécessiteront leur autorisation distincte. Aucun autre change n'est laissé à clôturer dans le périmètre autorisé.
