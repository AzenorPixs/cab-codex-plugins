# Rapport d'archivage — fix-cab-session-recovery

Session SCM directe dans `/home/devops/datas/cab`. Objectif et exception permettant ce seul change supplémentaire validés par le développeur. Aucun pilotage OpenCode/CAB ni skill de statistiques utilisé pour cette correction source.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex | N/A — version non exposée | OpenAI | N/A — télémétrie absente | N/A | N/A | N/A |

### Agents orchestrateurs

Aucun agent orchestrateur distinct : session SCM exécutée directement. Aucune sonde activée, conformément au prompt SCM.

## 1. Statistiques générales et décisions

| Validation finale | Réussis | Échecs | Total | Taux |
|---|---:|---:|---:|---:|
| Tests Node | 31 | 0 | 31 | 100 % |
| Tests Python | 37 | 0 | 37 | 100 % |
| Total des suites finales | 68 | 0 | 68 | 100 % |

Syntaxe des deux scripts JavaScript modifiés, compilation en mémoire des trois modules Python inchangés, manifeste JSON et UTF-8/LF réussis. Change strictement valide avant archivage. Référentiel standard : 7 spécifications valides avec avertissements préexistants. Strict global : 1 valide et 6 en échec uniquement pour 13 exigences de plus de 500 caractères, observées avant toute synchronisation des canons ; hors périmètre, non masquées.

Les premières tentatives ciblées échouaient sur un mock exigeant directory pour un contrôle global de santé, puis sur une transmission momentanément en cours. Les fixtures et attentes ont été corrigées sans affaiblir le verrou. La première validation du delta strict signalait des exigences trop longues : elles ont été découpées. Deux appels archive non destructifs ont refusé, d'abord deux tâches circulaires, puis la confirmation de synchronisation. Les tâches ont été corrigées ; la synchronisation a été confirmée dans le périmètre déjà autorisé. L'archive effective a réussi une seule fois.

Messages, tokens, cache, coût, temps de génération, quota Codex et durée calendaire totale : N/A — collecte de télémétrie non activée en SCM. Un test réussi ne constitue pas une approbation manuelle d'outil. Les échecs techniques de validation ne sont pas des refus de permission.

## 2. Types de messages et d'outils

Lectures ciblées, éditions locales, contrôles de syntaxe, suites Node/Python et CLI OpenSpec ont été utilisés directement. Mandats CAB et décisions MCP : 0 (non applicables à SCM). Répartition exhaustive des appels et messages : N/A — absence de journal statistique normalisé pour cette session directe. Aucun agent OpenCode de production lancé.

## 3. Fichiers modifiés

Source et documentation :

- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs`
- `/home/devops/datas/cab/tests/controller-session-recovery.test.mjs` (créé)
- `/home/devops/datas/cab/tests/persistent-job-supervisor.test.mjs`
- `/home/devops/datas/cab/tests/controller-service-distribution.test.mjs`
- `/home/devops/datas/cab/.codex/commands/cab.md`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md`
- `/home/devops/datas/cab/PROJECT.md`
- `/home/devops/datas/cab/TECHNICAL.md`
- `/home/devops/datas/cab/BUILD.md`
- `/home/devops/datas/cab/README.md`
- `/home/devops/datas/cab/CHANGELOG.md`

Canons synchronisés par l'archive :

- `/home/devops/datas/cab/openspec/specs/controller-transport/spec.md`
- `/home/devops/datas/cab/openspec/specs/persistent-job-supervision/spec.md`
- `/home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md`

Le change a créé sept artefacts sous `/home/devops/datas/cab/openspec/changes/fix-cab-session-recovery`, déplacés une seule fois vers `/home/devops/datas/cab/openspec/changes/archive/2026-10-08-fix-cab-session-recovery`. Ce rapport ajoute STATISTIQUES.md à cette archive. Total de chemins finaux concernés : 23 = 12 sources/documents + 3 canons + 8 fichiers d'archive ; les anciens chemins déplacés ne sont pas comptés une seconde fois. Statistiques de tentatives d'écriture par outil : N/A — collecte non activée. Aucun fichier fonctionnel supprimé.

## 4. Commandes

| Commande finale (libellé abrégé à 100 caractères) | Résultat |
|---|---|
| node --test tests/*.test.mjs | 31 réussis |
| python3 -B -m unittest discover -s tests -p 'test_*.py' | 37 réussis |
| node --check .../cgpt-approval-bridge-controller.mjs | réussi |
| node --check .../cgpt-approval-bridge-supervisor.mjs | réussi |
| openspec validate fix-cab-session-recovery --strict | réussi |
| openspec validate --specs --strict | échec : avertissements préexistants |
| openspec validate --specs | réussi avec avertissements |
| openspec archive fix-cab-session-recovery --json --yes | réussi ; 10 exigences ajoutées, 1 modifiée |

Exécutables résolus depuis DEVOPS : `/home/devops/node/current/bin/node`, `/home/devops/python/current/bin/python3`, `/home/devops/.local/npm/bin/openspec`. TMPDIR des tests est situé dans la racine CAB. Nombre exhaustif d'appels par famille : N/A — pas de collecte normalisée. Aucune commande Git exécutée ou proposée, aucun refus de permission enregistré dans cette session SCM. Aucun drapeau de désactivation de validation OpenSpec utilisé.

## 5. Accès web

Accès web externe de développement : 0, sans URL visitée. Les tests utilisent des services HTTP/SSE simulés en loopback et des fixtures synthétiques ; leurs appels ne constituent pas des accès au service OpenCode installé. Aucune authentification fournisseur, installation, publication, connexion à un compte ou donnée de production utilisée.

## 6. Synthèse globale

Correction source complète et archivée : récupération prepare/complete du même job, prévol natif et polling corrélés, conservation des jalons/critères, gel du superviseur, révocation des anciennes sessions et prévention des outils natifs lecture seule. 68 tests finaux réussis. Le redémarrage restaure le gel et les sessions révoquées ; une décision locale de prévol perdue n'est pas inventée, complete reste refusé et requiert une décision humaine. Aucune relance automatique d'un prévol échoué ajoutée.

| Document | Bilan et preuve |
|---|---|
| AGENTS.md | Inchangé : §5/6/7, autorisations, neutralité et reprise du même RUN préservées ; exception de change accordée explicitement |
| PROJECT.md | Mis à jour §5/7 : récupération explicite et outils lecture seule |
| TECHNICAL.md | Mis à jour §7/8 : API, preuves, révocation, gel et limites de redémarrage |
| BUILD.md | Mis à jour §6 : contrôle de récupération dans le même RUN, installation distincte |
| DEVOPS.md | Inchangé : mêmes exécutables, dépendances et environnements |
| README.md | Mis à jour : orchestration, récupération et prévention |
| CHANGELOG.md | Entrée Unreleased ajoutée sans inventer une release |
| OpenSpec | Trois canons synchronisés ; seul fix-cab-session-recovery archivé |

Déploiement dans le profil installé, reprise du RUN Pixs et test réel de service : non exécutés, hors périmètre. Versions et dépendances inchangées. Les trois anciens changes restent ouverts et sont préservés. Aucun secret ajouté ; aucun fichier sensible lu dans ce SCM. Début et durée calendaire, quota Codex avant/après et différence : N/A — mesures non activées en SCM ; aucune reconstruction ni attribution de quota partagée. La fin de rédaction ci-dessous est un horodatage du rapport, pas une mesure de durée de codage.

Rapport rédigé le 2026-10-08T08:58:47.450966+00:00.
