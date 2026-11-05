# Statistiques SCM — fix-manual-controller-reminders

## Statistiques générales et décisions

Projet : /home/devops/datas/cab. Codex exécute directement SCM, sans agent
OpenCode ni décision CAB. Le développeur a validé le périmètre par « Je valide » :
correctif, version 0.86.6, change dédié malgré les trois changes actifs,
synchronisation, archivage et présent rapport.

Collecte partielle : le premier horodatage conservé suit l'exploration initiale.
La durée observée inclut l'attente de validation ; le début réel et la durée
totale de SCM restent N/A. Le registre des commandes couvre 22 exécutions
identifiées après validation ; il exclut les lectures et aides non enregistrées
ainsi que la rédaction de ce rapport. Aucun total complet de conversation
n'est déduit de ce registre.

| Mesure observée | Nombre | Part |
|---|---:|---:|
| Commandes du registre exécutées et réussies | 18 | 81.82 % des 22 |
| Commandes avec sortie non nulle | 4 | 18.18 % des 22 |
| Éditions directes de fichiers dans le périmètre | 24 | 100 % des 24 |
| Éditions refusées / en erreur | 0 / 0 | 0 % / 0 % des 24 |
| Tests Node de la suite finale | 23 réussis | 100 % |
| Tests Python de la suite finale | 37 réussis | 100 % |
| Tâches du change prouvées et cochées | 8 | 100 % |
| Changes ciblés archivés | 1 | 100 % du périmètre |
| Changes préexistants modifiés / archivés | 0 / 0 | 0 % des 3 |

Les quatre sorties non nulles sont distinctes : delta initial refusé pour deux
titres de scénarios omis, corrigé avant le code ; validation globale stricte
sur avertissements de longueur préexistants ; test de régression volontairement
exécuté sur l'ancien code, puis corrigé ; archivage JSON exigeant confirmation
des deux synchronisations, suivi d'une exécution confirmée et réussie.
Aucune de ces sorties n'est présentée comme un refus de permission CAB.

| Agent de codage | Exécution | Modèle/version, tokens, cache, coût, débit |
|---|---|---|
| Codex, session courante | Directe ; 60 tests de suites réussis | N/A — télémétrie native non exposée |
| OpenCode | Non utilisé dans ce SCM | Non applicable |

| Pilotage et quotas | Valeur |
|---|---|
| Orchestrateur | Même instance Codex ; aucune duplication des totaux |
| Validation humaine du périmètre | 1 observée |
| Décisions CAB / permissions natives CAB | Non applicable : SCM direct |
| Compactions natives observées | 0 ; comptage exhaustif non disponible |
| Sondes de performance | N/A — non activées ; aucun sondage de l'orchestrateur |
| Quota Codex avant/après | N/A — outil natif get_usage_limits absent |

## Types de messages et d'outils

Les messages, parties, terminaisons, tokens et appels d'outils complets de la
session ne sont pas exposés par une API native : N/A, sans estimation.
Les éditions ont utilisé apply_patch ; leurs 24 cibles de fichier ne sont
pas assimilées à 24 appels d'outil ou approbations CAB. Les commandes du
registre sont réparties comme suit.

| Famille de commandes | Exécutions | Part des 22 | Exit 0 | Exit non nul |
|---|---:|---:|---:|---:|
| OpenSpec | 8 | 36.36 % | 5 | 3 |
| Node, syntaxe et tests | 7 | 31.82 % | 6 | 1 |
| Python, syntaxe, tests et audit | 5 | 22.73 % | 5 | 0 |
| mkdir / rmdir de l'espace temporaire | 2 | 9.09 % | 2 | 0 |
| Total | 22 | 100 % | 18 | 4 |

La borne de collecte et le registre sont limités ; ils ne représentent pas
l'ensemble des lectures, aides CLI ou vérifications finales de SCM.

## Fichiers modifiés

Les nombres ci-dessous sont des tentatives d'édition directe observées avant
le rapport, toutes dans le périmètre approuvé. Une validation de périmètre SCM
ne constitue pas une série d'approbations CAB unitaires.

| Chemin absolu actuel | Éditions | Part des 24 | Refusées | En erreur |
|---|---:|---:|---:|---:|
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | 2 | 8.33 % | 0 | 0 |
| /home/devops/datas/cab/tests/controller-configuration.test.mjs | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/tests/test_crash_recovery.py | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/tests/test_session_reset.py | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/.codex/commands/cab.md | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/pyproject.toml | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/README.md | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/TECHNICAL.md | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/BUILD.md | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/CHANGELOG.md | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-06-fix-manual-controller-reminders/.openspec.yaml | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-06-fix-manual-controller-reminders/proposal.md | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-06-fix-manual-controller-reminders/design.md | 1 | 4.17 % | 0 | 0 |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-06-fix-manual-controller-reminders/tasks.md | 3 | 12.50 % | 0 | 0 |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-06-fix-manual-controller-reminders/specs/controller-transport/spec.md | 2 | 8.33 % | 0 | 0 |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-06-fix-manual-controller-reminders/specs/codex-integration-distribution/spec.md | 1 | 4.17 % | 0 | 0 |
| Total | 24 | 100 % | 0 | 0 |

Les six artefacts du change ont été déplacés ensemble par l'archivage autorisé.
Celui-ci a également modifié deux contrats canoniques, effets distincts des
24 éditions directes : /home/devops/datas/cab/openspec/specs/controller-transport/spec.md
et /home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md.
Le présent rapport est /home/devops/datas/cab/openspec/changes/archive/2026-10-06-fix-manual-controller-reminders/STATISTIQUES.md ;
sa rédaction est hors fenêtre des comptes de production ci-dessus.
Aucun fichier source supprimé. L'espace temporaire de tests créé dans CAB
a été nettoyé après constat qu'il était vide. Les artefacts py_compile sont
régénérables et ne sont pas utilisés comme sources.

## Commandes

Chaque ligne du registre correspond à une exécution ; les libellés de commande
sont bornés à 100 caractères, troncature comprise. Les quatre sorties non
nulles et leur cause restent visibles.

| Commande, au plus 100 caractères | Occurrences et part des 22 | Exit | Objet |
|---|---:|---:|---|
| `/home/devops/.local/npm/bin/openspec validate fix-manual-controller-reminders --strict` | 1 (4.55 %) | 1 | OpenSpec avant code change |
| `/home/devops/.local/npm/bin/openspec validate fix-manual-controller-reminders --strict` | 1 (4.55 %) | 0 | OpenSpec avant code change corrigé |
| `/home/devops/.local/npm/bin/openspec validate --specs --strict` | 1 (4.55 %) | 1 | OpenSpec avant code specs |
| `/home/devops/.local/npm/bin/openspec validate --specs --json` | 1 (4.55 %) | 0 | OpenSpec canonical précode diagnostic non strict |
| `mkdir -m 700 .scm-test-tmp-20261006-manual` | 1 (4.55 %) | 0 | Créer espace temporaire de tests |
| `/usr/bin/env TMPDIR=/home/devops/datas/cab/.scm-test-tmp-20261006-manual PATH=/home/devops/node/cur…` | 1 (4.55 %) | 1 | Régression attendue avant correctif |
| `/usr/bin/env TMPDIR=/home/devops/datas/cab/.scm-test-tmp-20261006-manual PATH=/home/devops/node/cur…` | 1 (4.55 %) | 0 | Régression après correctif |
| `/home/devops/python/current/bin/python3 -m py_compile src/cgpt_approval_bridge_server.py` | 1 (4.55 %) | 0 | Syntaxe Python src/cgpt_approval_bridge_server.py |
| `/home/devops/python/current/bin/python3 -m py_compile tests/test_crash_recovery.py` | 1 (4.55 %) | 0 | Syntaxe Python tests/test_crash_recovery.py |
| `/home/devops/python/current/bin/python3 -m py_compile tests/test_session_reset.py` | 1 (4.55 %) | 0 | Syntaxe Python tests/test_session_reset.py |
| `/home/devops/node/current/bin/node --check plugins/cab-approval-bridge/scripts/cgpt-approval-bridge…` | 1 (4.55 %) | 0 | Syntaxe Node plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs |
| `/home/devops/node/current/bin/node --check plugins/cab-approval-bridge/scripts/cgpt-approval-bridge…` | 1 (4.55 %) | 0 | Syntaxe Node plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs |
| `/home/devops/node/current/bin/node --check tests/controller-configuration.test.mjs` | 1 (4.55 %) | 0 | Syntaxe Node tests/controller-configuration.test.mjs |
| `/home/devops/node/current/bin/node --check tests/controller-service-distribution.test.mjs` | 1 (4.55 %) | 0 | Syntaxe Node tests/controller-service-distribution.test.mjs |
| `/usr/bin/env TMPDIR=/home/devops/datas/cab/.scm-test-tmp-20261006-manual PATH=/home/devops/node/cur…` | 1 (4.55 %) | 0 | Suite complète Node |
| `/usr/bin/env TMPDIR=/home/devops/datas/cab/.scm-test-tmp-20261006-manual /home/devops/python/curren…` | 1 (4.55 %) | 0 | Suite complète Python |
| `/home/devops/python/current/bin/python3 - <<'PY' import pathlib,json,hashlib,tomllib,re baseline={"…` | 1 (4.55 %) | 0 | Audit fichiers versions et encodage |
| `/home/devops/.local/npm/bin/openspec validate fix-manual-controller-reminders --strict` | 1 (4.55 %) | 0 | OpenSpec change après code |
| `rmdir .scm-test-tmp-20261006-manual` | 1 (4.55 %) | 0 | Nettoyer espace temporaire vide de tests |
| `/home/devops/.local/npm/bin/openspec archive fix-manual-controller-reminders --json` | 1 (4.55 %) | 1 | Archivage autorisé avec synchronisation |
| `/home/devops/.local/npm/bin/openspec archive fix-manual-controller-reminders --json --yes` | 1 (4.55 %) | 0 | Archivage et synchronisation confirmés dans le périmètre validé |
| `/home/devops/.local/npm/bin/openspec validate --specs --json` | 1 (4.55 %) | 0 | OpenSpec canonical après synchronisation |

Commande refusée par contrôle CLI : l'archivage sans --yes, une occurrence
(4.55 % des 22), sans archive créée. La validation humaine antérieure couvrait
déjà ces deux synchronisations ; l'exécution confirmée a réussi avec
--json --yes, sans --no-validate ni --skip-specs. Aucun refus CAB observé.
Le test rouge initial est une preuve de régression, pas une réussite.

## Accès web

| Domaine | Accès directement déclenchés observés | Approbations | Refus | Erreurs |
|---|---:|---:|---:|---:|
| Web externe / outils web | 0 | 0 | 0 | 0 |
| Part dans les 46 opérations de domaine mesurées | 0 % | N/A | N/A | N/A |

Aucune URL externe visitée ou refusée à rapporter. Les échanges HTTP loopback
des fixtures de tests sont contrôlés et ne constituent pas des accès web
externes. Leur nombre exhaustif et le trafic interne des outils sont N/A.
Aucune publication, installation utilisateur ou opération de services réels.

## Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début réel SCM | N/A — exploration initiale non horodatée dans la collecte |
| Début du suivi traçable | 2026-10-06 07:47:57 UTC |
| Fin du suivi — après archivage, avant rapport | 2026-10-06 08:11:18 UTC |
| Durée globale réelle | N/A — début réel non disponible |
| Durée observée, pauses et attente incluses | 0 h 23 min 21 s |

| Quota Codex sur 7 jours | Horodatage | Utilisé | Réinitialisation |
|---|---|---|---|
| Avant | N/A | N/A | N/A |
| Après archivage | 2026-10-06 08:11:18 UTC : constat d'indisponibilité | N/A | N/A |
| Différence en points | N/A — outil natif absent | N/A | N/A |

Aucun quota fournisseur OpenCode ni ancienne mesure Pixs n'est substitué au
quota Codex. Les quotas seraient partagés par le compte ; aucune consommation
exclusive de cette session n'est déduite.

| Domaine mesuré, unités explicites | Nombre | Part des 46 | Réussite | Refus de permission | Erreur / sortie non nulle |
|---|---:|---:|---:|---:|---:|
| Cibles d'édition directe | 24 | 52.17 % | 24 (100 %) | 0 (0 %) | 0 (0 %) |
| Commandes du registre | 22 | 47.83 % | 18 (81.82 %) | N/A : SCM direct | 4 (18.18 %) |
| Web externe observé | 0 | 0 % | N/A | N/A | N/A |
| Autres outils | N/A — registre non exhaustif | N/A | N/A | N/A | N/A |
| Total des unités de domaine mesurées | 46 | 100 % | 42 (91.30 %) | N/A | 4 (8.70 %) |

Ce total additionne des cibles de fichier et des exécutions de commande,
pas des appels d'outils natifs. Il n'inclut pas le rapport, les lectures
non enregistrées ou les effets de synchronisation et déplacement.

Résultat : correction minimale des rappels manuels et six déclarations de
version en 0.86.6. Mode automatique et contrats HTTP préservés.
Suites : 23 tests Node et 37 Python réussis ; sept contrôles syntaxiques
réussis ; UTF-8/LF, JSON/TOML, versions et empreintes vérifiés.
Change : validé en mode strict avant/après code, huit tâches achevées,
archive réelle et deux contrats synchronisés. Sept spécifications canoniques
valides en mode standard ; 13 avertissements de longueur préexistants dans
six specs empêchent la réussite stricte globale, limite conservée.

Revue documentaire : README, TECHNICAL (§§ 3, 9, 15), BUILD (§ 7) et
CHANGELOG (Unreleased) mis à jour ; AGENTS, PROJECT et DEVOPS inchangés avec
justifications dans tasks.md. Les deux spécifications ciblées sont synchronisées.
Les trois changes préexistants restent inchangés et hors périmètre.
Git n'a pas été inspecté ou modifié. Aucun secret lu ou ajouté ; aucun
déploiement, publication, cache Codex ou service utilisateur mis à jour.
