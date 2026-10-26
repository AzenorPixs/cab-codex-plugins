# Statistiques SCM — add-cab-status-run-summary

Session SCM directe autorisée : /cab status, filtre exact --run, cycle OpenSpec complet et cible 1.2.1 après réexamen de 1.2.0. Chat 01a140fb-8c90-7893-8f4b-24f0be723020 déplacé dans le projet CAB par outil natif, résultat confirmé. Aucun agent de codage piloté ni skill statistique invoqué. Les preuves proviennent des sorties réellement observées et empreintes locales, sans reconstruction de mesures absentes.

## 1. Statistiques générales et décisions

| Mesure | Valeur |
| --- | --- |
| Version des briques source | 1.2.1 |
| Version plugin | 1.2.1+codex.20261016062355 |
| Modules exécutables alignés | 14 |
| Fichiers existants modifiés, canon compris | 30 |
| Fichiers neufs de cette archive, rapport compris | 7 |
| Tests / suites réussis | 225/225 et 12/12 (100 %) |
| Tests échoués / ignorés / annulés | 0 / 0 / 0 |
| Syntaxe Python / Node | 8 / 11 fichiers, exit 0 |
| Delta | 5 exigences modifiées, 7 ajoutées, 0 supprimée |
| Exigences antérieures préservées | 22/22, empreintes des corps identiques |
| Strict global avant / après archive | 10/10 puis 9/9, exit 0 |
| Déploiements / décisions CAB de production / messages aux RUN | 0 / 0 / 0 |
| Déplacement de chat autorisé | 1, projet CAB confirmé |
| Tokens, coût, quotas et temps de service modèle | N/A — télémétrie pilotée non applicable à SCM |

Un contrôle automatique a refusé avant exécution une écriture groupée pour risque supposé de remplacement du canon par un sous-ensemble. Les fichiers neufs ont ensuite été créés séparément, avec empreinte du canon inchangé vérifiée. La synchronisation finale préserve les 22 exigences non concernées ; aucun blocage résiduel. Une permission technique acceptée ne vaut pas décision CAB.

## 2. Types de messages et d’outils

Messages et appels d’outils exhaustifs, taux d’approbation : N/A — absence de collecteur en SCM. Outils employés pour lecture, écriture locale autorisée, validation, tests, archivage et déplacement du chat. Aucun suivi de quotas ni sonde de pilotage. Répartition des 225 tests, arrondie à une décimale :

| Suite | Réussis | Part | Exit | Ignorés |
| --- | ---: | ---: | ---: | ---: |
| controller-service-distribution | 19 | 8.4 % | 0 | 0 |
| Python unittest discovery | 52 | 23.1 % | 0 | 0 |
| controller-configuration | 13 | 5.8 % | 0 | 0 |
| controller-healthcheck-compatibility | 6 | 2.7 % | 0 | 0 |
| controller-job-restoration | 27 | 12.0 % | 0 | 0 |
| controller-session-recovery | 41 | 18.2 % | 0 | 0 |
| persistent-job-supervisor | 11 | 4.9 % | 0 | 0 |
| concurrent-run-registry | 22 | 9.8 % | 0 | 0 |
| concurrent-controller | 22 | 9.8 % | 0 | 0 |
| concurrent-supervisor | 1 | 0.4 % | 0 | 0 |
| native-statistics | 10 | 4.4 % | 0 | 0 |
| native-opencode isolated | 1 | 0.4 % | 0 | 0 |
| Total | 225 | 100 % | 0 | 0 |

Les 19 tests de distribution incluent 2 nouveaux contrôles de status ; les 223 cas précédents restent réussis. Les arrondis peuvent ne pas sommer exactement à 100 %. Les refus/once synthétiques des fixtures ne sont pas des décisions de production.

## 3. Fichiers modifiés

Périmètre contrôlé sans Git à partir de 53 empreintes initiales. Pour 21 fichiers, l’inversion des seuls remplacements 1.2.1 → 1.2.0 restitue exactement l’empreinte initiale. Les autres changements concernent commande, cadrages, changelog, manifeste/cachebuster, contrôles de distribution et canon synchronisé.

| Chemin absolu | Modification | SHA256 final |
| --- | --- | --- |
| /home/devops/datas/cab/.codex/commands/cab.md | Status / documentation / distribution | f9f72bbb8e1c9ddc6b45d4aac189319371b1cbca01aceb8367135bf80551edaf |
| /home/devops/datas/cab/BUILD.md | Status / documentation / distribution | 10c4c796de70a0fe019fa6c012bb8c297158a03cbfb0cb515d7bdf0c5757429f |
| /home/devops/datas/cab/CHANGELOG.md | Status / documentation / distribution | b296cc1938b6f0030a23bebdb529dd07e2cb073cf478cdd6d19531d708fba6a3 |
| /home/devops/datas/cab/PROJECT.md | Status / documentation / distribution | 84df6a67fcd8b4cf9f27721b520d9c445f334f7ed1b0892c28eeb583b77ca754 |
| /home/devops/datas/cab/README.md | Status / documentation / distribution | c228b89d32f0c00e18f4c0a8b3535338561064a673f7663f8339ae98d8b7ae60 |
| /home/devops/datas/cab/TECHNICAL.md | Status / documentation / distribution | d9e3fd69ec025033baae1b512e9fe6bc07c1f87f4912462bf574ff1d7a8a2a25 |
| /home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md | Synchronisation : 5 modifiées, 7 ajoutées | b97b6bf634955a3384c24e2fe1cce2459f13e1f702032b906bf2eae552730fb8 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | Status / documentation / distribution | f65fcb7ecb4d152f20b116281387e3a23f724c7df336e863004b77cec0e4bb80 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | Version seule | afd59cc3d7389f9e8188e9a16ee25cdaed07b3ecca7cd9281f078976c283b7cf |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs | Version seule | c4bd51841ad9d9352997ec71d723455b4b15c32d6c3dfcc6d8da95644192ccf1 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs | Version seule | d2e5124f53359b1ab52e8e2ab38d304e9ace6b5de710c7386599a77e3eb87944 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs | Version seule | 63dc88222127292b017de0a015d4ea72bb57abe84520ce633a6f0781a4c2fa5a |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py | Version seule | 1f365d317def15d43fcde2a5e7184976375e5c70e6bd9934817ccfb1e4b7aad7 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py | Version seule | 74ff6d2b0f123db786ce7f7b6dbde38d03015fcddba27f40f8692be616f680c8 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py | Version seule | f8949a47578138e0e46b9dfdbeb71710178df2ca26bd77dfbe89bb252d9ed4d8 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs | Version seule | 50876485fa7fc9d76c533684f21c123fe975101b6a152cd364272cec478507bb |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs | Version seule | 79119c72cba53224c8504cc0ad8098e26ba9f9d9d16eddc40e01d0ac2fbbf609 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs | Version seule | 4869edc01bc46f4000f4903a0fe5f3e51f47082bd011318185c6c7f0df85e3b5 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | Version seule | e052121402093fcdb92e7016b7a5f8bbb7e57a047fb3229039c98d2a770cde40 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service | Version seule | 0dcd9d2510c43cd9308512c1c5935017218c5aca55e782f7f8c1020ceeb97bd8 |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service | Version seule | d8be12bfc867088bd72e4e32fc077fb756a71cc31461ce3edd2a89675e2c5b4d |
| /home/devops/datas/cab/pyproject.toml | Version seule | 5ba969618b81e485e535b9419d13432884a0aa03e864d50bf49e3640c974e7c4 |
| /home/devops/datas/cab/src/cgpt_approval_bridge_journal.py | Version seule | 6a86db17f6e651b883a59d452ba3b39e2ae472c3d935dc273624b4a6baf9f4bb |
| /home/devops/datas/cab/src/cgpt_approval_bridge_router.py | Version seule | 5b706b9e06d7e6f42384f9ddc88247a58e1816ca84905706d57bee1d5434219a |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py | Version seule | 3b47cca6ade56e1b50395226f46b55db4e7e2ae6391d9d426434163e634c349a |
| /home/devops/datas/cab/tests/concurrent-controller.test.mjs | Version seule | 3c0a685b4e835acd5091be19465702886a50ca1b12e7838e3ed7b2635315710d |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | Status / documentation / distribution | a8560b1fb96e6d2aa84c516f2f2ff046b322a2d3ad1553b9f2dd255fe88c4c7f |
| /home/devops/datas/cab/tests/native-opencode.test.mjs | Version seule | 104c2fbbe7eaafd9e779db42986c11888e54af6af1fee70b16ceeba440c55caa |
| /home/devops/datas/cab/tests/test_crash_recovery.py | Version seule | cad84f3f916b053d90f24ef63afc7813c2c808861829a21a8166abbc75c777e9 |
| /home/devops/datas/cab/tests/test_session_reset.py | Version seule | 80c16496f2155e45e42e2f0629d8d7fbefcb369ba7c591a7e02545f84c60da2e |

Créations dans cette archive : .openspec.yaml, README.md, design.md, proposal.md, specs/codex-integration-distribution/spec.md, tasks.md, puis STATISTIQUES.md. Les six artefacts ont été déplacés uniquement par OpenSpec ; aucun code supprimé. Aucun fichier Pixs modifié.

Bilan documentaire final :

| Document | État / preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte identique ; règles de sécurité et portée préservées. |
| PROJECT.md | Mis à jour, §1 version 1.2.1, §5.5 status. |
| TECHNICAL.md | Mis à jour, §3 version, §16 provenance/statuts/lecture seule. |
| BUILD.md | Mis à jour, §6 même commande sans dépendance ajoutée ; §7 et distribution concurrente 1.2.1. |
| DEVOPS.md | Inchangé, empreinte identique ; inventaire DIU du 16/10/2026, outils déclarés utilisés. |
| README.md | Syntaxe status/filtre, tableau et règles de preuves ; version source 1.2.1. |
| CHANGELOG.md | Entrée 1.2.1 de préparation source ; historique 1.2.0 préservé. |
| openspec/specs/ | Synchronisé par archive : 34 exigences, dont 22 anciennes inchangées ; strict global 9/9. |
| openspec/config.yaml | Inchangé, schéma spec-driven conservé. |

## 4. Commandes

Commandes réellement exécutées, séquentiellement, chaque suite Node séparée :

- /home/devops/.local/npm/bin/openspec new change add-cab-status-run-summary --description <description du change> : réussite.
- /home/devops/python/current/bin/python3 -B -m unittest discover -s tests -p 'test_*.py' : 52 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/controller-service-distribution.test.mjs : 19 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/controller-configuration.test.mjs : 13 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/controller-healthcheck-compatibility.test.mjs : 6 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/controller-job-restoration.test.mjs : 27 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/controller-session-recovery.test.mjs : 41 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/persistent-job-supervisor.test.mjs : 11 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/concurrent-run-registry.test.mjs : 22 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/concurrent-controller.test.mjs : 22 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/concurrent-supervisor.test.mjs : 1 tests, exit 0.
- /home/devops/node/current/bin/node --test tests/native-statistics.test.mjs : 10 tests, exit 0.
- CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode /home/devops/node/current/bin/node --test tests/native-opencode.test.mjs : 1 tests, exit 0.

- /home/devops/python/current/bin/python3 -m py_compile sur les 8 fichiers Python modifiés : exit 0.
- /home/devops/node/current/bin/node --check <fichier> : exit 0 pour chacun des 11 fichiers suivants : plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs, plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs, plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs, plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs, plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs, plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs, plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs, plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs, tests/concurrent-controller.test.mjs, tests/controller-service-distribution.test.mjs, tests/native-opencode.test.mjs.
- /home/devops/.local/npm/bin/openspec validate add-cab-status-run-summary --strict : première exécution exit 1, 3 avertissements de longueur ; exigences atomisées puis exit 0 avant code et après coches.
- /home/devops/.local/npm/bin/openspec validate --all --strict avant archive : 10/10, exit 0.
- /home/devops/.local/npm/bin/openspec archive add-cab-status-run-summary --yes --json : exit 0, specsUpdated=true, added=7, modified=5, removed=0, renamed=0.
- /home/devops/.local/npm/bin/openspec validate --all --strict après archive : 9/9, exit 0.
- Contrôles Python de lecture seule : JSON manifeste/marketplace, UTF-8/LF, empreintes et équivalence exacte des 34 exigences à la fusion attendue. Le premier contrôle auxiliaire de fusion avait une expression régulière incorrecte ; après correction, les 34 exigences sont prouvées sans écriture canonique auxiliaire.

La suite Python a émis ResourceWarning: Implicitly cleaning up <HTTPError 409: Conflict> ; elle a terminé OK avec 52 tests. Avertissement de fixture consigné sans correction hors périmètre. Aucune suite finale en échec.

Revue du contrat status : Codex actif/codeur idle ; exclusion actuelle d’un pair malgré des lectures ; ancienne attente levée ; attente interne ; autre preuve actuelle lorsqu’une source est indisponible ; contradiction non réconciliée ; RUN exact inconnu ; candidat préparatoire ; archive sans rapport ; sous-job livré/parent en sélection. Cette revue et les tests de distribution ne sont pas des réponses LLM simulées présentées comme qualification de production. Le smoke natif qualifie 1.2.1 dans une instance isolée, pas une installation active de /cab status.

## 5. Accès web

Aucune navigation web, publication distante ou transmission du projet à un fournisseur. Les suites utilisent leurs fixtures loopback. Le smoke natif emploie une instance distincte, ports éphémères, XDG séparés, sans modèle, configuration utilisateur ou téléchargements. Aucun processus CISMP existant n’a été arrêté, redémarré ou modifié. Les outils natifs de gestion de chat ont servi au déplacement demandé. Taux/volumes réseau : N/A — absence de collecteur et aucune navigation distante.

## 6. Synthèse globale

| Mesure | Résultat |
| --- | --- |
| Objectif | /cab status et --run ; tableau et activité/attentes explicites sur preuves actuelles |
| Sources | 1.2.1 |
| Python / Node | 52/225 (23,1 %) / 173/225 (76,9 %) réussis |
| Total | 225/225, sans test ignoré |
| Syntaxe / encodage / JSON | Validés |
| Archive | 2026-10-16-add-cab-status-run-summary, synchronisée |
| Canon SHA256 | b97b6bf634955a3384c24e2fe1cce2459f13e1f702032b906bf2eae552730fb8 |
| Cohérence documentaire | Consignée ; aucun écart résiduel dans le périmètre |
| Fin des contrôles postarchive, avant rédaction | 16/10/2026 08:32:13 CEST / 06:32:13 UTC |
| Début / durée | N/A — absence de relevé initial, aucune reconstruction |
| Quotas / coûts / télémétrie pilotée | N/A — non applicable à SCM |
| Version installée/vivante | N/A — non modifiée, non déduite de la source |
| Git / publication / déploiement | Aucune opération |
| Chat | Projet CAB, résultat natif confirmé |

Clôture SCM conditionnée à la vérification de ce rapport. /cab reste une commande déclarative exécutée par Codex ; sans preuve actuelle, le statut doit rester INDÉTERMINÉ. Installation de profil et mise en service restent distinctes de cette préparation source. Reprendre uniquement le rapport en cas d’échec de sa vérification, sans réarchiver.
