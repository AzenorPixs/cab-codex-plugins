# Rapport d'archivage SCM — configure-controller-command-length-limit

Projet : Codex Approval Bridge (`cab`). Date : 20 octobre 2026, Europe/Paris. Livraison source CAB **1.4.0**, archivée sous `2026-10-20-configure-controller-command-length-limit`.

Agent de codage : Codex, session directe, fournisseur OpenAI. Version exacte du modèle, raisonnement, tokens, coût, cache, quotas, TTMT, débit et durée exhaustive : **N/A**, aucune télémétrie normalisée de pilotage collectée. La compétence de statistiques pilotées n'a pas été invoquée en SCM. Aucun agent OpenCode de production, orchestrateur distinct ou sous-agent n'a été lancé.

## 1. Statistiques générales et décisions

Le périmètre livré comprend la limite configurable de commande, son défaut à 16 384 unités UTF-16, le refus HTTP explicite, le diagnostic broker filtré et l'invariant commande exacte / décision corrélée / permission native once unique. Le périmètre comprend également l'incrément de 0.1.0 de toutes les briques, le seul bloc de concurrence du protocole local et la garde des opérations consommées ou invalidées avant admission. Ces extensions sont validées ; elles n'autorisent aucun déploiement.

| Validation finale | Réussis | Échecs | Ignorés | Total recensé |
| --- | ---: | ---: | ---: | ---: |
| Node, toutes les suites MJS en série | 234 | 0 | 1 | 235 |
| Python, découverte des tests | 59 | 0 | 0 | 59 |
| Total distinct | **293** | **0** | **1** | **294** |

Les 293 tests exécutés réussissent. Le scénario OpenCode réel, opt-in absent, est ignoré et n'est pas compté comme réussite. Les tentatives successives ne sont pas additionnées aux résultats finaux.

Syntaxe : **25 fichiers** Python/MJS contrôlés. Versions : **17 sources** annoncent 1.4.0 ; commande, unités, supports et manifeste sont alignés. Plugin : `1.4.0+codex.20261020072300`. Aucun schéma de données ni identifiant `resource-scoped-v1` n'est modifié.

OpenSpec strict global : **10/10** avant archive, **9/9** après archive. Archivage réussi une seule fois, synchronisation activée : **7 exigences ajoutées, 13 modifiées, 0 supprimée, 2 renommées**. Les cinq capacités concernées sont controller-transport, approval-workflow, codex-integration-distribution, concurrent-run-coordination et native-session-statistics.

## 2. Types de messages et d'outils

Lectures ciblées, recherches rg, éditions locales, calculs d'empreintes, contrôles de syntaxe, tests Node/Python, commandes CLI OpenSpec et vérifications documentaires. Répartition exhaustive des messages, appels d'outils, commandes, durées et volumes : **N/A**, aucun journal statistique exhaustif SCM n'a été collecté.

Les décisions et permissions des tests sont synthétiques. Aucun mandat CAB de production n'a été créé. Les tests utilisent des workspaces temporaires et des transports simulés ; ils n'installent pas de service utilisateur. L'identité non secrète du projet a été extraite localement selon l'exception filtrée de project.env ; aucune autre valeur du fichier n'a été restituée.

Deux diagnostics Git de lecture seule ont eu lieu pendant l'exploration initiale, avant chargement du prompt SCM : le premier a échoué sur la propriété du dépôt, le second a consulté l'état avec une exception limitée au processus. Aucun diagnostic Git n'a été exécuté ensuite. Aucun commit, préparation de commit, push, branche, tag, réécriture ou changement de configuration Git persistant n'a été réalisé.

## 3. Fichiers modifiés

Contrôle ciblé de **47 fichiers existants par empreinte** : **45 modifiés + 2 inchangés** (AGENTS.md et DEVOPS.md). L'archive contient **8 artefacts OpenSpec**, auxquels s'ajoute ce rapport, soit **9 nouveaux fichiers**. Les chemins finaux touchés sont donc **45 + 9 = 54** ; l'ensemble suivi représente **54 + 2 = 56 fichiers**. Ce contrôle ciblé ne prétend pas inventorier les changements externes concurrents de tout le disque.

Les 45 fichiers existants modifiés :

- `PROJECT.md`
- `TECHNICAL.md`
- `BUILD.md`
- `README.md`
- `CHANGELOG.md`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs`
- `src/cgpt_approval_bridge_server.py`
- `tests/controller-configuration.test.mjs`
- `tests/concurrent-controller.test.mjs`
- `tests/test_controller_decision_correlation.py`
- `openspec/specs/controller-transport/spec.md`
- `openspec/specs/approval-workflow/spec.md`
- `.codex/commands/cab.md`
- `ORCHESTRATED_CODING.md`
- `openspec/specs/codex-integration-distribution/spec.md`
- `openspec/specs/concurrent-run-coordination/spec.md`
- `openspec/specs/native-session-statistics/spec.md`
- `plugins/cab-approval-bridge/.codex-plugin/plugin.json`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs`
- `plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md`
- `plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md`
- `plugins/cab-approval-bridge/skills/coding-session-statistics/references/observations.md`
- `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service`
- `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service`
- `pyproject.toml`
- `src/cgpt_approval_bridge_journal.py`
- `src/cgpt_approval_bridge_router.py`
- `tests/controller-service-distribution.test.mjs`
- `tests/native-opencode.test.mjs`
- `tests/test_crash_recovery.py`
- `tests/test_session_reset.py`
- `tests/concurrent-supervisor.test.mjs`

Les huit artefacts archivés :

- `design.md`
- `proposal.md`
- `specs/approval-workflow/spec.md`
- `specs/codex-integration-distribution/spec.md`
- `specs/concurrent-run-coordination/spec.md`
- `specs/controller-transport/spec.md`
- `specs/native-session-statistics/spec.md`
- `tasks.md`

Ce rapport ajoute `STATISTIQUES.md`. UTF-8 et LF sont contrôlés sur le périmètre suivi et les artefacts ; aucune source secrète n'est ajoutée.

Bilan documentaire final :

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte initiale conservée ; aucune nouvelle règle d'agent. |
| PROJECT.md | Version de référence et vues courantes 1.4.0, architecture préservée. |
| TECHNICAL.md | Version 1.4.0 ; section 15 pour configuration/refus et section 6 pour la garde avant admission. |
| BUILD.md | Jeu source et version de distribution 1.4.0, sans installation ni nouveau format. |
| DEVOPS.md | Inchangé, empreinte conservée ; runtimes et index des prompts utilisés. |
| README.md | Version, variable, unité UTF-16, diagnostic et compatibilité actualisés. |
| CHANGELOG.md | Entrée 1.4.0 de préparation source ; historique 1.3.0 et antérieur préservé. |
| openspec/specs/ | Cinq capacités synchronisées par l'archivage ; neuf spécifications valides après archive. |
| ORCHESTRATED_CODING.md | Seul bloc de concurrence remplacé par la référence distribuée exacte avec titres décalés ; préfixe et suffixe préservés. |

Le préfixe extérieur au bloc du protocole conserve l'empreinte SHA-256 `1e2ffd66d4de2a50e399b0940006b015647b6bb41afb3fc71da9f159f5acdbea`. Les archives antérieures, profils installés et projets consommateurs n'ont pas été modifiés par les éditions du change.

## 4. Commandes

Validations finales exécutées et réussies :

- `/home/devops/node/current/bin/node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : code 0, 234 réussites, un ignoré ; durée native annoncée 53 145,679759 ms.
- `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` : code 0, 59 réussites après alignement 1.4.0, durée native 5,167 secondes.
- `/home/devops/node/current/bin/node --check <fichier.mjs>` et `py_compile.compile(..., doraise=True)` via `/home/devops/python/current/bin/python3` : 25 fichiers valides, soit les 17 sources distribuées et les huit suites modifiées. Les deux fichiers Python de l'évolution initiale ont également passé `python3 -m py_compile`.
- `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` : code 0 avant et après archivage, respectivement 10 puis 9 éléments.
- `/home/devops/.local/npm/bin/openspec archive configure-controller-command-length-limit --yes --json` : code 0, archive et synchronisation prouvées ; aucune option de désactivation de validation utilisée.

Lint, typage et construction tiers : **non pertinents au périmètre**, aucun contrôle de ce type n'est configuré pour les scripts concernés. Test OpenCode réel : **non exécuté**, opt-in absent ; aucune réussite de production n'est revendiquée.

Les échecs intermédiaires restent distingués du résultat final :

- Le premier contrôle OpenSpec strict a demandé de répartir des exigences trop longues ; le change a ensuite été validé sans avertissement.
- Les nouvelles fixtures ont été corrigées pour traiter un GET 404 vide, placer la commande divergente avant l'approbation et respecter le HTTP 400 existant d'une seconde décision. La décision initiale inchangée est vérifiée.
- Le test de distribution a révélé le bloc local CAB 1.0.0 divergent de la référence courante ; la seule section autorisée a été synchronisée.
- L'échec intermittent de réconciliation historique révélait une admission à effet de bord appelée avant la garde de consommation. Le nouveau test a échoué avant correction avec une session réinscrite après plusieurs sondages, puis réussi avec la garde corrigée. La suite globale finale couvre aussi l'ancien scénario.
- La fixture de supervision attend au plus cinq secondes au lieu de deux secondes et demie la première émission, sans affaiblir ses assertions ni modifier les délais de production.

## 5. Accès web

Aucun outil de recherche ou consultation web n'a été utilisé pour ce change. Les échanges HTTP des tests visent des services loopback simulés. Aucune installation, publication ou intervention externe n'a été réalisée. Nombre exhaustif d'octets réseau et durées réseau : **N/A**, pas de collecte dédiée.

## 6. Synthèse globale

La livraison source CAB 1.4.0 est implémentée, qualifiée, synchronisée et archivée avec son rapport individuel. Les résultats finaux établissent **293 tests réussis**, **un scénario réel ignoré**, **25 fichiers syntaxiquement valides**, **17 sources versionnées alignées** et **9 spécifications valides après archive**.

`OC_Codex_MAX_COMMAND_LENGTH` et son alias historique permettent le repli à 2000 ; le défaut est 16 384, avec comptage UTF-16 conservé. Les corps HTTP restent limités séparément à 256 KiB. Un dépassement indique les longueurs sans reprendre la commande et sans enregistrer l'opération ni créer de décision. Le broker conserve seulement le diagnostic filtré.

La commande exacte, la décision corrélée et la permission native once unique restent préservées. Une opération consommée ou invalidée ne déclenche plus l'admission susceptible de réinscrire sa session historique. Aucun blocage de qualification ne subsiste dans le périmètre livré. La mise en service, les installations actives et le scénario OpenCode réel restent hors qualification de cette livraison source.

