# STATISTIQUES — fix-crash-recovery-journal-scans

Session Codex : `01a10161-1cd3-7ee0-be17-18afd12fded1`.
Archive : `/home/devops/datas/cab/openspec/changes/archive/2026-10-03-fix-crash-recovery-journal-scans`.

Périmètre mesuré : tour de codage commencé après validation OpenSpec/pyproject,
jusqu'au relevé final après archivage. Les tours antérieurs d'analyse et de
proposition, ainsi que la rédaction et les vérifications du présent rapport,
ne sont pas inclus. Source : instantané natif `read_thread`, sans sorties de
commandes, complété par les preuves d'exécution réellement observées.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex, agent courant | N/A | OpenAI | N/A | N/A | N/A | N/A |

Un seul agent a modifié les sources. Configuration exacte, version du modèle,
tokens et temps de génération non exposés par la source : N/A. Sondes
périodiques non activées ; aucune sonde rétroactive ni attribution de la durée
calendaire au service du modèle.

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent orchestrateur distinct | N/A | N/A | N/A | N/A | N/A | N/A |

Les validations de périmètre ont été données par le développeur. Aucun agent
OpenCode ni sous-agent n'a réalisé ce correctif. Temps de service cumulé et
chevauchements : N/A, faute de télémétrie mesurable.

## 1. Statistiques générales et décisions

Durée calendaire vérifiable : **0 h 20 min 39 s**, attentes, tests et archivage
compris. Version CAB livrée dans les sources : **0.86.3**.

| Vérification fonctionnelle finale | Réussis | Part des 40 tests | Échecs restants | Taux de réussite |
|---|---:|---:|---:|---:|
| Python, dont 11 tests de récupération | 17 | 42,5 % | 0 | 100,0 % |
| Node : distribution, contrôleur, superviseur | 23 | 57,5 % | 0 | 100,0 % |
| Total | 40 | 100 % | 0 | 100,0 % |

Les échecs intermédiaires sont conservés dans le bilan des actions : une
invocation Node globale initiale échouée, une invocation révélant la règle
absente d'AGENTS.md, une invocation bloquée par `listen EPERM` dans le sandbox,
et un patch refusé techniquement pour un contexte introuvable dans design.md.
Aucun changement de ce patch échoué n'avait été appliqué ; le correctif a été
repris avec le bon contexte. Les tests réseau ont ensuite réussi hors sandbox
et les tests documentaires après l'ajout autorisé dans les deux AGENTS.md.

Les 71 actions natives de l'instantané sont complétées par ce patch échoué,
observé mais absent de la liste native `fileChange`, soit 72 actions auditables.
Les wrappers d'orchestration, lectures d'horloge et demandes UI ne sont pas
comptés dans ce dénominateur ; leur total exhaustif n'est pas exposé (N/A).
Un appel réussi signifie « autorisé et exécuté » dans le périmètre validé ;
il ne prouve pas une approbation humaine individuelle de cet appel. Un refus
de permission est distingué d'un échec technique ou d'un test échoué.

| Résultat des actions auditables | Nombre | Part |
|---|---:|---:|
| Autorisées et exécutées avec succès | 68 | 94,4 % |
| Refus de permission explicitement observés | 0 | 0,0 % |
| Erreurs techniques / tests échoués | 4 | 5,6 % |
| Total | 72 | 100 % |

Tokens, tokens de cache, coût, compactions et terminaisons du modèle :
**N/A**, absents de l'interface de lecture utilisée.

## 2. Types de messages et d'outils

| Type d'élément natif de l'instantané | Nombre | Part des 121 éléments |
|---|---:|---:|
| Messages développeur | 3 | 2,5 % |
| Messages de l'agent | 10 | 8,3 % |
| Exécutions de commandes | 59 | 48,8 % |
| Résumés de raisonnement (métadonnées) | 37 | 30,6 % |
| Appels MCP | 3 | 2,5 % |
| Appels d'édition réussis | 9 | 7,4 % |
| Total | 121 | 100 % |

Les pourcentages sont arrondis indépendamment. Ces éléments ne correspondent
pas tous à des messages conversationnels. Aucun contenu de raisonnement ou
longue sortie n'est reproduit.

| Actions par type | Total | Part des 72 | Succès (taux) | Refus | Erreurs (taux) |
|---|---:|---:|---:|---:|---:|
| Commandes | 59 | 81,9 % | 56 (94,9 %) | 0 (0,0 %) | 3 (5,1 %) |
| Appels d'édition directs | 10 | 13,9 % | 9 (90,0 %) | 0 (0,0 %) | 1 (10,0 %) |
| MCP : deux quotas et lecture d'historique | 3 | 4,2 % | 3 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| Total | 72 | 100 % | 68 (94,4 %) | 0 (0,0 %) | 4 (5,6 %) |

## 3. Fichiers modifiés

Vingt chemins finaux concernés avant rédaction du rapport. Les cinq fichiers
du change ont été déplacés par OpenSpec dans l'archive ; les interventions sur
leurs chemins actifs et archivés sont regroupées ici. Le rapport constitue
ensuite un vingt-et-unième fichier. Les nombres suivants comptent des
interventions par cible de fichier, pas des appels : un patch multifichier
concerne plusieurs cibles. L'ajout template par commande et la synchronisation
de la spécification par archive sont inclus, sans être recomptés comme appels
d'édition dans la synthèse des actions.

| Chemin absolu final | Succès (% ligne) | Refus (% ligne) | Erreurs (% ligne) | Total | Part des 31 cibles |
|---|---:|---:|---:|---:|---:|
| /home/devops/datas/cab/.codex/commands/cab.md | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/AGENTS.md | 1 (50,0 %) | 0 (0,0 %) | 1 (50,0 %) | 2 | 6,5 % |
| /home/devops/datas/cab/BUILD.md | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/CHANGELOG.md | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-03-fix-crash-recovery-journal-scans/.openspec.yaml | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-03-fix-crash-recovery-journal-scans/design.md | 2 (66,7 %) | 0 (0,0 %) | 1 (33,3 %) | 3 | 9,7 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-03-fix-crash-recovery-journal-scans/proposal.md | 2 (66,7 %) | 0 (0,0 %) | 1 (33,3 %) | 3 | 9,7 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-03-fix-crash-recovery-journal-scans/specs/approval-persistence/spec.md | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-03-fix-crash-recovery-journal-scans/tasks.md | 6 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 6 | 19,4 % |
| /home/devops/datas/cab/openspec/specs/approval-persistence/spec.md | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/pyproject.toml | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/README.md | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py | 2 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 2 | 6,5 % |
| /home/devops/datas/cab/TECHNICAL.md | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/cab/tests/test_crash_recovery.py | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| /home/devops/datas/template/AGENTS.md | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) | 1 | 3,2 % |
| Total | 28 (90,3 %) | 0 (0,0 %) | 3 (9,7 %) | 31 | 100 % |

Les trois cibles en erreur appartiennent au même patch techniquement échoué.
Aucun déplacement hors archivage, suppression de source ou changement d'un
autre fichier template n'a été effectué. Les caches et dossiers temporaires
de validation ont été créés dans CAB puis retirés. Empreintes vérifiées pour
les deux AGENTS.md : le retrait du seul paragraphe ajouté reconstitue exactement
les documents antérieurs.

## 4. Commandes

| Famille | Total | Part des 59 | Succès (taux) | Refus | Erreurs (taux) |
|---|---:|---:|---:|---:|---:|
| Lectures shell ciblées | 35 | 59,3 % | 35 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| OpenSpec | 7 | 11,9 % | 7 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| Python (lectures, tests, contrôles) | 9 | 15,3 % | 9 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| Node (syntaxe et tests) | 8 | 13,6 % | 5 (62,5 %) | 0 (0,0 %) | 3 (37,5 %) |
| Total | 59 | 100 % | 56 (94,9 %) | 0 (0,0 %) | 3 (5,1 %) |

Commandes refusées : aucune observée (0/59, 0,0 %). Les trois commandes échouées
ne sont pas des refus ; chacune a une occurrence (1/59, 1,7 %).

| Commande échouée (libellé tronqué à 100 caractères) | Occurrences | Code |
|---|---:|---:|
| /usr/bin/zsh -lc 'TMPDIR=/home/devops/datas/cab/.cab-validation-tmp /home/devops/node/current/bin... | 1 (1,7 %) | 1 |
| /usr/bin/zsh -lc 'TMPDIR=/home/devops/datas/cab/.cab-validation-tmp /home/devops/node/current/bin... | 1 (1,7 %) | 1 |
| /usr/bin/zsh -lc 'TMPDIR=/home/devops/datas/cab/.cab-validation-tmp /home/devops/node/current/bin... | 1 (1,7 %) | 1 |

Validations effectivement réussies : `python3 -m py_compile` sur les deux
fichiers Python modifiés ; `python3 -B -m unittest discover -s tests -p 'test_*.py' -v` ;
`node --check` sur contrôleur, superviseur et test de distribution ;
`node --test --test-isolation=none` sur les trois fichiers Node applicables ;
OpenSpec strict avant implémentation et avant archivage ; validation stricte de
`approval-persistence` après synchronisation. L'outil signale une information
non bloquante sur la longueur de l'exigence ajoutée. Les commandes utilisent
les runtimes explicites de DEVOPS.md ; les arguments complets restent dans
l'historique natif. Le sandbox a imposé l'isolement Node sans processus de test
et une exécution hors sandbox pour les serveurs factices loopback.

## 5. Accès web

| Accès web externes observés | Nombre | Part / taux |
|---|---:|---:|
| Approuvés et exécutés | 0 | N/A |
| Refusés | 0 | N/A |
| Erreurs | 0 | N/A |
| Total | 0 | N/A |

Aucun navigateur ni recherche web n'a été utilisé. Dénominateur nul : N/A.
Les tests Node ont employé des services HTTP factices locaux sur loopback,
sans appels au contrôleur utilisateur ni installation de service. Les quotas
et l'historique ont été lus via les trois appels MCP natifs du tableau des
outils. Le détail exhaustif des requêtes réseau internes à ces connecteurs et
aux tests n'est pas exposé : N/A. Aucune URL externe visitée à publier.

## 6. Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début | 03/10/2026 12:56:21 Europe/Paris (UTC+02:00) |
| Fin — après archivage | 03/10/2026 13:17:00 Europe/Paris (UTC+02:00) |
| Durée globale (pauses et attentes incluses) | 0 h 20 min 39 s |

Le début provient du tour de codage dans l'historique natif ; la collecte de
quota a commencé ensuite, avant les premières écritures du change. La fin
est le relevé d'horloge après la lecture du quota final et l'archivage.

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de collecte, avant les écritures | 03/10/2026 12:57:06 Europe/Paris (UTC+02:00) | 10 % | 09/10/2026 23:13:59 Europe/Paris (UTC+02:00) |
| Après — après archivage de la spécification | 03/10/2026 13:17:00 Europe/Paris (UTC+02:00) | 11 % | 09/10/2026 23:13:59 Europe/Paris (UTC+02:00) |
| Différence après − avant | — | 1 point de pourcentage | — |

Source : `get_usage_limits`, identité `codex`, fenêtre `10080` minutes,
`usedPercent` et `resetsAt` natifs. Même compte et même réinitialisation
vérifiés ; aucun identifiant de compte n'est reproduit. Les quotas sont
partagés par le compte : cette variation peut inclure d'autres tâches et
n'est pas attribuée exclusivement à ce change. Elle ne couvre pas la
rédaction ultérieure de ce rapport.

| Domaine des actions | Total | Part globale | Succès (taux) | Refus (taux) | Erreurs (taux) |
|---|---:|---:|---:|---:|---:|
| Fichiers : appels d'édition directs | 10 | 13,9 % | 9 (90,0 %) | 0 (0,0 %) | 1 (10,0 %) |
| Commandes, dont écritures template/archive | 59 | 81,9 % | 56 (94,9 %) | 0 (0,0 %) | 3 (5,1 %) |
| Web externe | 0 | 0,0 % | 0 (N/A) | 0 (N/A) | 0 (N/A) |
| Autres outils MCP | 3 | 4,2 % | 3 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| Total global mesuré | 72 | 100 % | 68 (94,4 %) | 0 (0,0 %) | 4 (5,6 %) |

Totaux croisés : 59 + 10 + 3 = 72 actions ; 56 + 9 + 3 = 68 succès ;
3 + 1 = 4 erreurs. Les cibles de fichiers constituent une autre mesure :
28 succès + 3 erreurs = 31 interventions sur 20 chemins finaux.

Le correctif A utilise un index local à la boucle initiale, mis à jour après
append durable. Aucun cache global, thread de récupération, changement de
schéma ou de protocole, ni migration n'a été introduit. Les règles
`HUMAN_REQUIRED` et les erreurs restent couvertes par les tests.

Mesure synthétique : 694 approbations, 16 774 événements initiaux,
7 521 590 octets ; récupération **0,612 s**, **5 lectures** totales (une pour
l'index, deux contrôles de cohérence, deux écritures techniques) ; processus
MCP isolé, initialize et arrêt propre **1,714 s**. Mesures indicatives, sans
comparaison chronométrée du journal utilisateur ni preuve de démarrage dans
l'instance OpenCode utilisateur. Les schedulers externes du sous-processus
de test sont neutralisés, main/récupération/stdin restent réels.

Archivage réussi : `2026-10-03-fix-crash-recovery-journal-scans`, spécification
synchronisée (une exigence ajoutée) et validée. Les autres changes restent
actifs et inchangés. Versions CAB courantes et pyproject alignés sur `0.86.3`.
Règle post-archivage identique dans CAB et template. Les tests finaux réussissent
(40/40, 100 %) et les artefacts temporaires sont retirés.

Git n'a été ni inspecté ni modifié ; aucun commit, branche, tag ou push.
Aucun secret ni fichier source exclu n'a été ouvert. La lecture explicite de
PROMPTS/SCM.md répondait à l'invocation du développeur et son contenu n'a pas
été modifié. La copie globale `/home/devops/.opencode/broker` et le redémarrage
OpenCode restent hors du périmètre de livraison. L'unique écriture hors CAB
est l'ajout explicitement validé dans `/home/devops/datas/template/AGENTS.md`.
