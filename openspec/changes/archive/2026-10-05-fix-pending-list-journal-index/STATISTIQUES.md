# STATISTIQUES — Correctif CAB 0.86.4

Change : `fix-pending-list-journal-index`.
Archive : `2026-10-05-fix-pending-list-journal-index`.
Périmètre : index local à `do_list`, tests, release corrective, documentation et cycle OpenSpec.
Session : orchestration native Codex, reprise après validation du développeur.
Le développeur a demandé à Codex de réaliser directement ce correctif ; aucun agent OpenCode n'a codé ce change.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex — identité exacte du modèle non exposée | N/A | OpenAI | N/A — télémétrie absente | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex — même instance que l'agent de codage | N/A | OpenAI | N/A — télémétrie absente | N/A | N/A | N/A |

Aucune télémétrie native de génération Codex n'est exposée : durée active,
version exacte, tokens, coût, débit et TTMT sont N/A. Les rôles de la même
instance ne sont pas additionnés. Aucun dénominateur de temps de service
vérifiable ; la durée calendaire n'est pas assimilée à la génération.

## 1. Statistiques générales et décisions

Les compteurs ci-dessous décrivent un **registre partiel vérifiable** :
écritures des fichiers du lot, validations et accès HTTP locaux observés.
Ils ne prétendent pas dénombrer tous les appels de lecture, messages internes
ou commandes de préparation de Codex. Ces totaux complets sont N/A, faute
d'export natif. Les pourcentages portent uniquement sur le registre décrit.

Convention : « autorisé et exécuté » signifie opération terminée avec succès
dans le périmètre explicitement approuvé. Cela ne prouve pas une approbation
manuelle distincte par opération. Aucun mandat CAB n'a été soumis pour le
codage natif demandé par le développeur. Un refus exige une preuve de refus ;
l'échec attendu du test de reproduction est classé comme erreur de validation,
sans refus et sans blocage résiduel.

| Mesure du registre | Valeur |
|---|---:|
| Opérations recensées | 48 (100 %) |
| Autorisées et réussies | 47 (97,9 %) |
| Refusées | 0 (0,0 %) |
| Erreurs de validation | 1 (2,1 %) |
| Fichiers opérationnels finaux | 18 (100 % des fichiers du lot avant rapport) |
| Écritures réussies | 21 (100 % des tentatives recensées) |
| Commandes de validation/archivage | 15 (100 % du registre de commandes) |
| Accès HTTP locaux de préparation | 12 (100 % des accès recensés) |
| Tokens/coût/cache Codex | N/A — télémétrie native absente |
| Messages et compactions Codex | N/A — historique interne non exportable |

Résultats : 10 tests ciblés, puis 27 tests Python et 23 tests Node réussis.
Les 10 tests ciblés sont inclus dans les 27 ; les suites ne sont pas
additionnées comme tests distincts. Syntaxe Python/JavaScript, versions,
UTF-8/LF et OpenSpec strict réussis. L'ancien parcours échouait au test
déterministe avec 12 lectures au lieu d'une.

Fixture représentative : 694 approbations, 16 774 événements, journal
synthétique de 7 706 222 octets ; une lecture initiale, 0,126 seconde dans
la suite ciblée et 0,123 seconde dans la suite complète. Ces durées ne
prouvent pas une baisse CPU en production. L'index ne change pas les
formats persistants ni les décisions.

Une sonde de préparation Qwen a précédé la demande de codage natif :
session `ses_ef50d1970ffe8j5GD9xsVl6U00`, message
`msg_10af2e76b001T01g9Z4j5pcpC3`, Qwen3.8 FLASH / opencode-go / xhigh,
2026-10-05T07:24:13.378547+00:00, zéro outil, sortie fixe conforme.
TTMT 3,646 s, débit 82,811 tokens/s, durée 9,308 s, sortie 458 tokens,
entrée 6, cache écrit 11 392, cache lu 0, total déclaré 11 856, coût N/A.
Il s'agit uniquement d'une surcharge de préparation : ces mesures ne sont
pas attribuées à Codex ni à la production du correctif. La session de sonde
a été archivée. Les sondes de Codex sont N/A — interface de sonde dédiée
indisponible ; aucune mesure rétroactive ou sonde d'orchestrateur.

## 2. Types de messages et d'outils

| Domaine recensé | Nombre | Part |
|---|---:|---:|
| Éditions natives / synchronisation OpenSpec | 21 | 43,8 % |
| Commandes de validation/archivage | 15 | 31,3 % |
| HTTP local de préparation | 12 | 25,0 % |
| Total du registre partiel | 48 | 100 % |

Les arrondis des parts peuvent dépasser 100 % de 0,1 point. Les types de
messages Codex, terminaisons, autres lectures et appels internes sont N/A.
Dans la seule sonde OpenCode : 1 réponse assistant terminée `stop`,
0 erreur, 0 partie outil. Aucun agent OpenCode n'a exécuté d'édition ou
de commande de codage CAB. Aucun refus observé dans le registre.

## 3. Fichiers modifiés

Il s'agit de tentatives d'écriture réussies, pas du nombre de lignes ni
du nombre de décisions CAB. Dénominateur : 21 écritures sur 18 fichiers
avant rédaction du rapport. Les chemins des artefacts OpenSpec désignent
leur destination après archivage.

| Chemin absolu complet | Écritures autorisées et réussies | Refusées | En erreur |
|---|---:|---:|---:|
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py | 2 (9.5 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/tests/test_crash_recovery.py | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/.codex/commands/cab.md | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/pyproject.toml | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/TECHNICAL.md | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/BUILD.md | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/README.md | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/CHANGELOG.md | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/tests/test_pending_listing.py | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-05-fix-pending-list-journal-index/proposal.md | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-05-fix-pending-list-journal-index/design.md | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-05-fix-pending-list-journal-index/tasks.md | 3 (14.3 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-05-fix-pending-list-journal-index/specs/approval-persistence/spec.md | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| /home/devops/datas/cab/openspec/specs/approval-persistence/spec.md | 1 (4.8 %) | 0 (0,0 %) | 0 (0,0 %) |
| Total | 21 (100 %) | 0 (0,0 %) | 0 (0,0 %) |

Le répertoire du seul change ciblé a été déplacé par la commande d'archivage.
La spécification de référence a reçu un requirement supplémentaire.
Les trois autres changes actifs ont été conservés. Les artefacts temporaires
des tests et de compilation sont régénérables et exclus de ce compte source.

Le présent fichier
`/home/devops/datas/cab/openspec/changes/archive/2026-10-05-fix-pending-list-journal-index/STATISTIQUES.md`
est produit après la borne finale ; sa première écriture est hors des
21 tentatives de l'intervalle, puis fait l'objet d'un contrôle de publication.

## 4. Commandes

Les libellés sont limités à 100 caractères. Registre limité aux validations
et à l'archivage ; les lectures exploratoires et commandes de préparation
ne disposent pas d'un compteur natif complet et sont N/A.

| Famille / libellé | Occurrences et part | Réussies et taux | Refusées et taux | Erreurs et taux |
|---|---:|---:|---:|---:|
| OpenSpec — validation ciblée stricte | 2 (13.3 %) | 2 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| OpenSpec — validation des spécifications stricte | 2 (13.3 %) | 2 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Python — test de reproduction avant correction | 1 (6.7 %) | 0 (0.0 %) | 0 (0,0 %) | 1 (100.0 %) |
| Python — suite ciblée test_pending_listing.py | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Python — unittest discover tests/test_*.py | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Python — compilation py_compile des trois fichiers modifiés | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Node — --check contrôleur | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Node — --check superviseur | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Node — --check test de distribution | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Node — --test des trois fichiers tests/*.test.mjs (liste explicite) | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Python — contrôle UTF-8/LF, JSON et versions | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| OpenSpec — archive fix-pending-list-journal-index --yes | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Python — contrôle archive, tâches et synchronisation | 1 (6.7 %) | 1 (100.0 %) | 0 (0,0 %) | 0 (0.0 %) |
| Total | 15 (100 %) | 14 (93,3 %) | 0 (0,0 %) | 1 (6,7 %) |

Commandes refusées : aucune observée. L'unique erreur est le test de
reproduction exécuté avant correction ; le même test réussit ensuite.
Interpréteurs : Python du projet `/home/devops/python/current/bin/python3`,
Node du projet `/home/devops/node/current/bin/node`, OpenSpec
`/home/devops/.local/npm/bin/openspec`. Aucune installation de dépendance.

## 5. Accès web

Le registre contient 12 requêtes à l'API locale OpenCode, toutes observées
dans la préparation : 12 réussies (100 %), 0 refus (0,0 %), 0 erreur
(0,0 %). Aucun accès Internet par l'agent de codage dans ce lot. Le transport
du fournisseur de la sonde est géré par OpenCode ; ses requêtes internes
ne sont pas exposées et ne sont pas inventées.

Les URL ci-dessous sont celles réellement appelées, limitées à 100 caractères
avec « … » si nécessaire. La création utilise la collection `/session` ;
l'envoi du message et l'archivage utilisent l'identifiant de la sonde.

| URL observée | Statut | Occurrences et part |
|---|---|---:|
| http://127.0.0.1:4096/global/health | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/mcp?directory=%2Fhome%2Fdevops%2Fdatas%2Fpixs | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/session/status?directory=%2Fhome%2Fdevops%2Fdatas%2Fpixs | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/doc | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/agent?directory=%2Fhome%2Fdevops%2Fdatas%2Fpixs | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/mcp/cgpt-validation/disconnect?directory=%2Fhome%2Fdevops%2Fdatas%2Fpixs | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/mcp?directory=%2Fhome%2Fdevops%2Fdatas%2Fcab | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/provider?directory=%2Fhome%2Fdevops%2Fdatas%2Fcab | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/session?directory=%2Fhome%2Fdevops%2Fdatas%2Fcab | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/session/ses_ef50d1970ffe8j5GD9xsVl6U00/message?directory=%2Fhome%2Fdevops%2Fd… | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/session/ses_ef50d1970ffe8j5GD9xsVl6U00?directory=%2Fhome%2Fdevops%2Fdatas%2Fc… | Autorisé, observé | 1 (8,3 %) |
| http://127.0.0.1:4096/event?directory=%2Fhome%2Fdevops%2Fdatas%2Fcab | Autorisé, observé | 1 (8,3 %) |
| Total | 12 autorisées et observées | 12 (100 %) |

URL refusées : aucune observée. Le flux SSE local de sonde a été ouvert
sans outil du modèle. Aucun secret ne figure dans ces URL ou dans le rapport.

## 6. Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début de la collecte / reprise après validation | 2026-10-05 07:23:11 UTC |
| Fin — après archivage et contrôle des spécifications | 2026-10-05 07:36:24 UTC |
| Durée globale (pauses et attentes incluses) | 00 h 13 min 13 s |

La durée couvre cette reprise validée et ses préparatifs, sans reconstituer
la durée de l'exploration antérieure. La rédaction et la vérification de ce
rapport sont postérieures à la borne finale.

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | 2026-10-05 07:23:11 UTC | N/A | N/A |
| Après — après archivage de la spécification | 2026-10-05 07:36:24 UTC | N/A | N/A |
| Différence après − avant | — | N/A | — |

L'outil natif `mcp__codex_app__get_usage_limits` n'est pas exposé dans cette
session, aux deux bornes. Aucune valeur historique ou d'un autre fournisseur
ne le remplace. Les quotas étant partagés par compte, une variation mesurée
pourrait inclure d'autres tâches ; aucune consommation exclusive n'est déduite.

| Domaine du registre partiel | Total et part | Réussies et taux | Refusées et taux | Erreurs et taux |
|---|---:|---:|---:|---:|
| Fichiers | 21 (43,8 %) | 21 (100 %) | 0 (0,0 %) | 0 (0,0 %) |
| Commandes de validation/archivage | 15 (31,3 %) | 14 (93,3 %) | 0 (0,0 %) | 1 (6,7 %) |
| HTTP local de préparation | 12 (25,0 %) | 12 (100 %) | 0 (0,0 %) | 0 (0,0 %) |
| Total du registre partiel | 48 (100 %) | 47 (97,9 %) | 0 (0,0 %) | 1 (2,1 %) |
| Autres outils/messages internes | N/A | N/A | N/A | N/A |

Archive réussie avec 7 tâches terminées, un requirement synchronisé et
7 spécifications strictes valides. Informations de longueur de requirements
non bloquantes. Versions source/distribution alignées sur 0.86.4.
Aucune inspection Git, préparation de commit, commit, push, publication ou
déploiement de cette release. Aucun secret lu ou injecté pendant ce correctif.
Pixs reste en pause à la clôture de ce lot ; le contrôleur utilisateur a été
arrêté après les préparatifs. Le broker actif n'a pas encore été rechargé
avec cette version et la réduction CPU réelle reste non mesurée.
