# Rapport d'archivage — update-cab-orchestration-cadences

Session SCM directe dans `/home/devops/datas/cab`, après validation explicite du
périmètre par « Je valide » le 10 octobre 2026. Le prompt SCM interdit
l'invocation du skill de statistiques et ses sondes de pilotage : aucun RUN
OpenCode/CAB de production ni collecte de télémétrie SCMP n'a été lancé.
Ce rapport factuel constitue la preuve documentaire exigée après archivage.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex | N/A — version exacte non exposée | OpenAI | N/A — télémétrie absente | N/A | N/A | N/A |

### Agents orchestrateurs

Aucun agent orchestrateur distinct : session SCM exécutée directement.
Aucun sous-agent ni agent OpenCode de production utilisé. Le temps de service
du modèle est indisponible et n'est pas assimilé au temps des commandes.

## 1. Statistiques générales et décisions

| Suites finales | Réussis | Échecs | Total | Taux de réussite |
|---|---:|---:|---:|---:|
| Tests Node | 33 | 0 | 33 | 100 % |
| Tests Python | 37 | 0 | 37 | 100 % |
| Total | 70 | 0 | 70 | 100 % |

Les 11 contrôles Node de distribution comprennent deux nouveaux scénarios
documentaires : cadences indépendantes et attente PLLM persistante ; sondes
statistiques sans arrêt du travail. Ils sont inclus dans les 33 tests Node
et ne sont pas comptés une seconde fois.

Syntaxe : trois fichiers Python et trois fichiers JavaScript modifiés
contrôlés avec succès. Manifestes JSON, chemins distribués, versions et
UTF-8/LF valides. Delta OpenSpec strict valide avant archivage. Référentiel
standard après synchronisation : 7/7 spécifications valides avec
avertissements. Référentiel global strict : échec, 1 valide et 6 en échec,
avec exactement les 13 mêmes avertissements de longueur avant et après
synchronisation, et aucune erreur normative signalée. Cette limite historique
reste visible et n'est pas présentée comme une validation stricte globale.

Premières tentatives et corrections observées :

- Le premier delta strict a signalé trois exigences trop longues ; elles ont
  été découpées avant toute écriture de code ou de test.
- Une collecte interne de contenu pour le contrôle de périmètre a été
  tronquée ; elle a été remplacée par une empreinte SHA-256 ciblée, sans
  modification de fichier.
- L'écriture groupée des versions par Python a réussi sur quatre fichiers
  puis rencontré la protection en lecture seule de `.codex/commands/cab.md`.
  Les autres versions ont été appliquées par l'outil d'édition natif autorisé,
  sans écraser les quatre écritures prouvées.
- Le lanceur Node isolé dans le sandbox ne montrait qu'un résultat par fichier ;
  l'exécution directe puis sans isolation a exposé les 11 assertions ciblées.
  La suite complète dans le sandbox a ensuite donné 17 succès et 16 erreurs
  techniques `listen EPERM` sur les serveurs simulés loopback. La suite finale
  hors sandbox a exécuté et réussi les 33 tests, sans modification des tests
  pour contourner cette restriction.
- La première suite Python a donné 35 succès et deux échecs : deux tests
  d'initialisation MCP attendaient encore la version historique `0.86.6`.
  Seules ces deux attentes ont été alignées sur `0.86.8`, puis les 37 tests
  ont réussi. Les scénarios et verrous restent inchangés.
- Une inspection Git lancée par erreur pendant l'exploration initiale a été
  refusée pour propriété du dépôt, avant lecture complète du prompt SCM.
  Aucun nouvel appel Git ni modification de configuration Git n'a suivi.

Ces échecs techniques ne sont pas assimilés à des refus CAB. Un test réussi
ne prouve pas une approbation manuelle d'outil. Le développeur a validé le
périmètre ; SCM n'utilise pas de mandats CAB pour ses éditions directes.

Tokens, cache, coût, quota Codex, TTMT, débit et durée complète de session :
N/A — collecte de télémétrie non activée en SCM. Le premier relevé d'empreintes
date de 2026-10-10T05:22:15.576139+00:00. Le contrôle après archivage date de
2026-10-10T05:31:25.346181+00:00. Ces bornes de contrôle ne mesurent ni toute la session
ni le temps de génération du modèle ; aucune durée totale n'est reconstruite.

## 2. Types de messages et d'outils

Lectures ciblées, recherches, éditions locales, vérifications de syntaxe,
suites Node/Python et CLI OpenSpec exécutées directement. Aucun skill de
pilotage, benchmark PLLM réel ou sonde SCMP invoqué. Mandats CAB et décisions
MCP de production : 0, non applicables à SCM. Répartition exhaustive des
messages et appels d'outils : N/A — pas de journal statistique normalisé.

Les commandes ont été examinées séparément. L'exécution hors sandbox de la
suite Node a servi uniquement aux fixtures HTTP/SSE sur loopback ; aucun
service installé n'a été démarré ou reconfiguré.

## 3. Fichiers modifiés

Vingt fichiers existants modifiés, contrôlés par empreintes dans le périmètre :

- `/home/devops/datas/cab/AGENTS.md`
- `/home/devops/datas/cab/PROJECT.md`
- `/home/devops/datas/cab/TECHNICAL.md`
- `/home/devops/datas/cab/BUILD.md`
- `/home/devops/datas/cab/README.md`
- `/home/devops/datas/cab/CHANGELOG.md`
- `/home/devops/datas/cab/pyproject.toml`
- `/home/devops/datas/cab/.codex/commands/cab.md`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md`
- `/home/devops/datas/cab/src/cgpt_approval_bridge_server.py`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs`
- `/home/devops/datas/cab/tests/controller-service-distribution.test.mjs`
- `/home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md`
- `/home/devops/datas/cab/openspec/specs/persistent-job-supervision/spec.md`
- `/home/devops/datas/cab/openspec/specs/archive-session-statistics/spec.md`
- `/home/devops/datas/cab/tests/test_crash_recovery.py`
- `/home/devops/datas/cab/tests/test_session_reset.py`

Six artefacts de change créés puis déplacés une seule fois par l'archivage :

- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-update-cab-orchestration-cadences/proposal.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-update-cab-orchestration-cadences/design.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-update-cab-orchestration-cadences/tasks.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-update-cab-orchestration-cadences/specs/persistent-job-supervision/spec.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-update-cab-orchestration-cadences/specs/archive-session-statistics/spec.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-update-cab-orchestration-cadences/specs/codex-integration-distribution/spec.md`

Ce rapport ajoute `STATISTIQUES.md` à la même archive. Total final :
**27 chemins = 17 sources/documentation/tests + 3 références OpenSpec +
7 fichiers d'archive**, sans compter deux fois les chemins déplacés.

Répartition : fichiers existants modifiés 20/27 (74,1 %), fichiers d'archive
créés 7/27 (25,9 %), total 27/27 (100 %). Aucun fichier fonctionnel supprimé.
Les fichiers runtime broker/contrôleur/superviseur ne changent que de version,
preuve par restauration de la chaîne de version et comparaison des empreintes.
Même contrôle pour les deux seules attentes de version des tests Python.
`DEVOPS.md`, le catalogue marketplace, les quatre autres spécifications et
les artefacts des trois changes actifs historiques conservent leurs empreintes.

Les artefacts régénérables des validations ont été dirigés dans
`/home/devops/datas/cab/tmp/cab-cadence-validation` et sont nettoyés après
validation. Le contrôle de périmètre est ciblé, sans inspection Git ; il ne
constitue pas un inventaire exhaustif de modifications externes concurrentes.

## 4. Commandes

| Commande finale ou contrôle | Résultat observé |
|---|---|
| `env TMPDIR=… node --test tests/*.test.mjs` hors sandbox | 33 tests réussis |
| `env TMPDIR=… python3 -B -m unittest discover -s tests -p 'test_*.py'` | 37 tests réussis |
| `python3 -m py_compile` avec cache dans le projet | 3 fichiers Python valides |
| `node --check` par fichier JavaScript modifié | 3 fichiers valides |
| `openspec validate update-cab-orchestration-cadences --strict` | Réussi avant archivage |
| `openspec archive update-cab-orchestration-cadences --json --yes` | Réussi une seule fois ; 8 exigences ajoutées, 1 modifiée |
| `openspec validate --specs` | 7/7 valides, avertissements historiques |
| `openspec validate --specs --strict` avant/après | Échec sur 13 avertissements identiques, zéro erreur normative |
| Contrôle des versions, JSON et UTF-8/LF | Réussi |
| Empreintes du périmètre et égalité delta/référence après synchronisation | Réussi |

OpenSpec a utilisé le chemin explicite de DEVOPS :
`/home/devops/.local/npm/bin/openspec`. Node a annoncé `v24.21.0`.
Python a utilisé `python3` de l'environnement exécutant, sans dépendance
tierce ; aucun relèvement de version minimale n'est introduit.
Aucun drapeau de désactivation de validation OpenSpec n'a été utilisé.
Les sommes des suites finales excluent les essais précédents pour ne pas
compter deux fois les mêmes scénarios.

## 5. Accès web

Accès web externe de développement : 0. Les tests HTTP/SSE utilisent des
services locaux simulés, distincts du serveur OpenCode installé. Aucun appel
fournisseur de benchmark, authentification, téléchargement, installation,
publication ou accès à des données de production n'a été effectué.
Aucun secret lu ou ajouté dans cette évolution.

## 6. Synthèse globale

Évolution source et protocole CAB `0.86.8` achevée et archivée sous
`2026-10-10-update-cab-orchestration-cadences`. Benchmark PLLM retenté
indéfiniment toutes les trente minutes jusqu'à reprise sûre du même RUN ou
arrêt explicite ; SSE en temps réel et contrôle CAB toutes les trois secondes ;
pauses de sept secondes fixes pour les vérifications de progression pendant
analyse/rédaction ; sondes statistiques toutes les trente minutes sans arrêt
du travail pour attendre le créneau.

L'archive native a déclaré `specsUpdated: true`, 8 exigences ajoutées,
1 modifiée, 0 supprimée et 0 renommée. L'absence du chemin actif, la présence
de l'archive et l'égalité des exigences ajoutées avec les références ont été
contrôlées. Les 70 tests finaux passent. Les limites strictes historiques sont
identiques avant/après ; aucune correction hors périmètre n'a été engagée.

| Élément | Revue de cohérence |
|---|---|
| AGENTS.md | Cadences et attente PLLM ajoutées au protocole |
| PROJECT.md | Responsabilité de l'orchestrateur et cadences précisées |
| TECHNICAL.md | Cadences, checkpoint et limites d'automatisation documentés |
| BUILD.md | Version de distribution alignée sur 0.86.8 |
| DEVOPS.md | Inchangé ; pas de nouvelle dépendance ou infrastructure |
| README.md | Cadences et portée du protocole rendues publiques |
| CHANGELOG.md | Entrée Unreleased ajoutée pour cette évolution |
| OpenSpec | Trois références synchronisées, seul change ciblé archivé |
| Distribution | Broker, contrôleur, superviseur, plugin, projet et commande à 0.86.8 |

Les tests documentaires vérifient que les obligations sont distribuées ; ils
ne prouvent pas leur cadence dans un RUN réel. Aucun ordonnanceur autonome de
benchmark PLLM n'a été ajouté au broker, au contrôleur ou au superviseur.
Déploiement dans le profil, publication, activation de service et test réel
`/cab start` / `/cab test` : non exécutés, hors périmètre validé.
Le présent SCM n'attend pas trente minutes et ne déclenche pas de sondes
réservées aux sessions SCMP.

Rapport préparé après preuve de l'archive ; sa présence, ses six sections,
UTF-8/LF et les totaux sont contrôlés avant restitution terminale.

