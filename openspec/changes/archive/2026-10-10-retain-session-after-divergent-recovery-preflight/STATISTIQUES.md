# Statistiques — SCM retain-session-after-divergent-recovery-preflight

Projet : Codex Approval Bridge. Version source livrée : **0.87.2**.
Archive : `2026-10-10-retain-session-after-divergent-recovery-preflight`.

Session Codex directe, périmètre et archivage validés explicitement par le développeur. Le skill de statistiques des sessions pilotées n'est pas invoqué conformément à SCM. Ce rapport répond à l'obligation distincte d'AGENTS.md §7. Il utilise les sorties observées, les résultats finaux conservés dans output/scm-retain-recovery-session et la baseline ciblée ; aucune mesure absente n'est estimée.

## 1. Statistiques générales et décisions

| Mesure | Valeur et limite |
| --- | --- |
| Début tracé de l'implémentation | 2026-10-10T21:09:53+02:00 ; exploration antérieure exclue |
| Fin après archivage et contrôles | 2026-10-10T21:20:58+02:00 ; avant rédaction du rapport |
| Durée de la période tracée | 00 h 11 min 04 s |
| Durée globale de conversation | N/A : borne initiale complète non collectée |
| Agent | Codex direct ; modèle exact, tokens, coût, débit et quotas N/A, télémétrie native non collectée |
| Validation développeur du périmètre | 1, après proposition SCM |
| Décisions CAB réelles | 0 ; les décisions HTTP des tests sont simulées |
| Archivages de ce change | 1, exit 0 ; aucune répétition |

| Tests finaux distincts | Réussis | Échoués | Taux |
| --- | --- | --- | --- |
| Node, six suites exécutées séparément | 57 | 0 | 100 % |
| Python, suite complète | 38 | 0 | 100 % |
| Total des runners finaux | 95 | 0 | 100 % |

Le passage ciblé 29/29 et les autres répétitions ne s'ajoutent pas aux 95 tests finaux. Les sous-tests sont comptés selon les runners. Syntaxe : trois fichiers Python et quatre fichiers JavaScript contrôlés, 7/7.

## 2. Types de messages et d'outils

| Catégorie | Mesure et couverture |
| --- | --- |
| Agent de codage piloté et orchestrateur séparé | Sans objet, SCM direct |
| Messages et appels d'outils totaux | N/A : collecte exhaustive non activée |
| Lecture, édition, compaction et durée par outil | N/A : aucun historique natif exhaustif collecté |
| Tokens, cache, coût, TTMT, débit, quotas | N/A : aucune télémétrie native collectée |
| Permissions CAB réelles | 0 ; aucun RUN OpenCode piloté |
| Permissions techniques de plateforme | Écritures source .codex et tests hors sandbox accordés ; aucune installation de profil |

Le prévol et les réponses once des tests sont des fixtures. Ils ne constituent pas des décisions ni des preuves d'intégration d'un RUN réel. Les tests vérifient refus, nouvelle tentative, conservation du job/candidate, frontière native, absence de rejeu, concurrence et restauration.

## 3. Fichiers modifiés

| Chemin absolu | État |
| --- | --- |
| /home/devops/datas/cab/PROJECT.md | Modifié |
| /home/devops/datas/cab/TECHNICAL.md | Modifié |
| /home/devops/datas/cab/BUILD.md | Modifié |
| /home/devops/datas/cab/README.md | Modifié |
| /home/devops/datas/cab/CHANGELOG.md | Modifié |
| /home/devops/datas/cab/ORCHESTRATED_CODING.md | Modifié |
| /home/devops/datas/cab/pyproject.toml | Modifié |
| /home/devops/datas/cab/.codex/commands/cab.md | Modifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | Modifié |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py | Modifié |
| /home/devops/datas/cab/tests/test_crash_recovery.py | Modifié |
| /home/devops/datas/cab/tests/test_session_reset.py | Modifié |
| /home/devops/datas/cab/tests/controller-session-recovery.test.mjs | Modifié |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | Modifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | Modifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | Modifié |
| /home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md | Modifié |
| /home/devops/datas/cab/openspec/specs/controller-transport/spec.md | Modifié |
| /home/devops/datas/cab/openspec/specs/persistent-job-supervision/spec.md | Modifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md | Modifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/session-reset.md | Modifié |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-retain-session-after-divergent-recovery-preflight/design.md | Créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-retain-session-after-divergent-recovery-preflight/proposal.md | Créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-retain-session-after-divergent-recovery-preflight/specs/codex-integration-distribution/spec.md | Créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-retain-session-after-divergent-recovery-preflight/specs/controller-transport/spec.md | Créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-retain-session-after-divergent-recovery-preflight/specs/persistent-job-supervision/spec.md | Créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-retain-session-after-divergent-recovery-preflight/tasks.md | Créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-retain-session-after-divergent-recovery-preflight/STATISTIQUES.md | Rapport après archivage |

| Type de chemin | Nombre | Part |
| --- | --- | --- |
| Préexistants modifiés, dont trois spécifications canoniques | 21 | 75.0 % |
| Artefacts du change créés puis archivés | 6 | 21.4 % |
| Rapport d'archive | 1 | 3.6 % |
| Total de chemins de livraison distincts | 28 | 100.0 % |

La baseline cible compare les fichiers autorisés sans inspection Git. Les trois anciens changes actifs sont identiques à leurs contenus initiaux. AGENTS.md et DEVOPS.md sont inchangés. Broker, superviseur, pyproject et deux tests Python ne changent que du numéro 0.87.1 vers 0.87.2. Le plugin reçoit un cachebuster neuf. Manifeste JSON et UTF-8/LF vérifiés. Aucun fichier PROMPTS, cache installé ou configuration privée n'est modifié. Les données de validation et pycache dans output sont des artefacts locaux régénérables, hors des 28 chemins de livraison ; ils ne sont pas destinés à Git.

## 4. Commandes et validations

| Suite Node finale, exécutée une par une | Code | Tests |
| --- | --- | --- |
| /home/devops/node/current/bin/node --test tests/controller-configuration.test.mjs | 0 | 13/13 |
| /home/devops/node/current/bin/node --test tests/controller-healthcheck-compatibility.test.mjs | 0 | 6/6 |
| /home/devops/node/current/bin/node --test tests/controller-job-restoration.test.mjs | 0 | 4/4 |
| /home/devops/node/current/bin/node --test tests/controller-service-distribution.test.mjs | 0 | 13/13 |
| /home/devops/node/current/bin/node --test tests/controller-session-recovery.test.mjs | 0 | 16/16 |
| /home/devops/node/current/bin/node --test tests/persistent-job-supervisor.test.mjs | 0 | 5/5 |

Commandes finales complémentaires :

- `TMPDIR=/home/devops/datas/cab/output/scm-retain-recovery-session /home/devops/python/current/bin/python3 -B -m unittest discover -s tests -p 'test_*.py'` : exit 0, 38/38.
- `python DevOps -m py_compile` sur les trois fichiers Python modifiés avec PYTHONPYCACHEPREFIX dans output : exit 0.
- `node --check` sur contrôleur, superviseur et les deux tests Node modifiés : quatre exit 0.
- `quick_validate.py plugins/cab-approval-bridge/skills/approval-bridge` via /usr/bin/python3 : exit 0, Skill is valid!.
- `openspec validate retain-session-after-divergent-recovery-preflight --strict --json` avant code puis avant archivage : deux exit 0, 1/1, issues[].
- `openspec archive retain-session-after-divergent-recovery-preflight --yes --json` : exit 0, specsUpdated=true ; 6 exigences ajoutées, 6 modifiées, 5 supprimées, zéro renommage.
- `openspec validate --specs --strict --json` initial puis final : exit 1, 13 WARNING historiques, zéro ERROR ; ces exécutions ne sont pas déclarées réussies.
- `openspec validate --specs --json` final : exit 0, 7/7. Les tuples capacité/niveau/chemin/message des 13 avertissements sont identiques au relevé initial, comparaison automatisée.

Les avertissements historiques de longueur concernent approval-persistence [3,4], approval-workflow [0], archive-session-statistics [0,1], codex-integration-distribution [1], controller-transport [1,5,6,7], persistent-job-supervision [0,1,3]. Aucun nouvel avertissement ni ERROR.

Échecs intermédiaires conservés : deux invocations Node sandbox interrompues avant les tests ; diagnostic sans isolation 12/13 avec ancienne attente de version, corrigée ; deux suites groupées 56/57 avec contrôleur simulé indisponible pour strictCommands=false. Le test isolé, la suite de configuration actuelle et sa copie antérieure réussissent séparément. La cause exacte des deux indisponibilités groupées n'est pas établie. Les six suites finales exécutées séparément réussissent sans désactivation ni affaiblissement de test. Une écriture source .codex a d'abord échoué en lecture seule, puis réussi avec permission technique. Compteurs exhaustifs des commandes, refus et erreurs N/A, non collectés.

## 5. Accès web

| Accès | Nombre et limite |
| --- | --- |
| Navigation web | 0 ; aucun outil web invoqué |
| Fournisseur distant ou benchmark | 0 ; aucune sonde de pilotage |
| HTTP loopback simulé | N/A : nombre de requêtes non collecté |
| Journal réseau exhaustif | N/A : non collecté |

Les fixtures démarrent et arrêtent leurs propres processus simulés. Aucun service utilisateur CAB ni processus OpenCode réel n'est lancé, arrêté ou redémarré pour cette correction. Les sources exclues et les secrets ne sont pas utilisés ; aucun contrôle exhaustif des emplacements exclus n'est prétendu.

## 6. Synthèse globale

Sources corrigées : un prévol de récupération divergent conserve désormais sa candidate, le job et le runtime. retry explicite exige un refus natif sans effet et des identifiants neufs. complete vérifie le préfixe historique intact puis le nouveau prévol exact. Un délai MCP seul conserve le polling du même approval_id. Les décisions, preuves, jalons et autorisations consommées restent préservés. Le remplacement initial CISMP reste inchangé.

Validation finale : 95/95 tests, 7/7 contrôles syntaxiques et skill valide. OpenSpec ciblé strict réussi ; canon global sans strict 7/7, strict exit 1 limité aux 13 avertissements historiques identiques. Un archivage réussi et un rapport à six sections, UTF-8/LF et totaux contrôlés.

La matrice documentaire détaillée figure dans tasks.md : PROJECT/TECHNICAL/BUILD/README/CHANGELOG, protocole local et distribué, trois capacités synchronisées ; AGENTS/DEVOPS/config OpenSpec inchangés avec justification. Les sources ont la version 0.87.2 ; aucun déploiement ni publication n'est réalisé. L'intégration réelle reste non exécutée dans ce périmètre SCM. Aucun commit, branche, push ou autre écriture Git.
