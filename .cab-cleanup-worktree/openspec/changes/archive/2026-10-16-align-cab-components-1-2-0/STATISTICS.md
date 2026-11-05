# Statistiques SCM — align-cab-components-1-2-0

Demande du développeur : aligner les briques CAB sur 1.2.0. Session SCM directe,
sans compétence statistique de pilotage, sonde ni relevé de quota. Les données
proviennent de baseline.json, review.json, validation.json et des sorties locales
conservées dans /home/devops/datas/cab/output/scm/align-cab-components-1-2-0. Les archives antérieures sont préservées.

## 1. Statistiques générales et décisions

| Mesure | Valeur |
|---|---:|
| Modules exécutables alignés | 14 |
| Version de base | 1.2.0 |
| Version du plugin | 1.2.0+codex.20261016060508 |
| Fichiers existants modifiés, canonique inclus | 30 |
| Syntaxe Node / Python vérifiée | 11 / 8 fichiers |
| Tests réussis | 223/223 (100 %) |
| Échecs, tests ignorés ou annulés | 0 (0 %) |
| Suites finales réussies | 12/12 (100 %) |
| Décisions de production / RUN actifs contactés | 0 / 0 |
| Tokens, coût, cache et temps de service du modèle | N/A — télémétrie non activée en SCM |

Une réussite d'outil ne prouve pas une approbation humaine distincte. Les décisions
et réponses once synthétiques des tests ne sont pas des décisions de production.

## 2. Types de messages et d'outils

Les pourcentages ci-dessous portent sur les 223 cas de test, avec arrondi à une
décimale ; les messages et outils exhaustifs de l'agent ne sont pas collectés.

| Suite | Tests | Part | Exit |
|---|---:|---:|---:|
| python | 52 | 23.3 % | 0 |
| concurrent-controller.test | 22 | 9.9 % | 0 |
| concurrent-run-registry.test | 22 | 9.9 % | 0 |
| concurrent-supervisor.test | 1 | 0.4 % | 0 |
| controller-configuration.test | 13 | 5.8 % | 0 |
| controller-healthcheck-compatibility.test | 6 | 2.7 % | 0 |
| controller-job-restoration.test | 27 | 12.1 % | 0 |
| controller-service-distribution.test | 17 | 7.6 % | 0 |
| controller-session-recovery.test | 41 | 18.4 % | 0 |
| native-opencode.test | 1 | 0.4 % | 0 |
| native-statistics.test | 10 | 4.5 % | 0 |
| persistent-job-supervisor.test | 11 | 4.9 % | 0 |
| Total | 223 | 100 % | 0 |

## 3. Fichiers modifiés

| Chemin absolu | État |
|---|---|
| /home/devops/datas/cab/.codex/commands/cab.md | Aligné et vérifié |
| /home/devops/datas/cab/BUILD.md | Aligné et vérifié |
| /home/devops/datas/cab/CHANGELOG.md | Aligné et vérifié |
| /home/devops/datas/cab/PROJECT.md | Aligné et vérifié |
| /home/devops/datas/cab/README.md | Aligné et vérifié |
| /home/devops/datas/cab/TECHNICAL.md | Aligné et vérifié |
| /home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service | Aligné et vérifié |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service | Aligné et vérifié |
| /home/devops/datas/cab/pyproject.toml | Aligné et vérifié |
| /home/devops/datas/cab/src/cgpt_approval_bridge_journal.py | Aligné et vérifié |
| /home/devops/datas/cab/src/cgpt_approval_bridge_router.py | Aligné et vérifié |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py | Aligné et vérifié |
| /home/devops/datas/cab/tests/concurrent-controller.test.mjs | Aligné et vérifié |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | Aligné et vérifié |
| /home/devops/datas/cab/tests/native-opencode.test.mjs | Aligné et vérifié |
| /home/devops/datas/cab/tests/test_crash_recovery.py | Aligné et vérifié |
| /home/devops/datas/cab/tests/test_session_reset.py | Aligné et vérifié |

28 fichiers ont uniquement des annonces de version et attentes correspondantes
modifiées : leurs remplacements inverses restituent exactement les hashes initiaux.
CHANGELOG.md prépare 1.2.0 et y rattache le premier lot sans réécrire l'historique
1.1.0. La spécification canonique aligne quatre exigences sur 1.2.0.
Les quatre artefacts du change sont déplacés par OpenSpec vers cette archive ;
le présent rapport est créé après archive. Aucune suppression de code.
Les tentatives d'écriture et leurs taux sont N/A — absence de collecteur exhaustif.
Les preuves régénérables output/scm ne sont pas destinées à Git.

## 4. Commandes

Commande de vérification séquentielle :
`python3 -B output/scm/align-cab-components-1-2-0/validate.py`.
Elle exécute unittest discover puis chaque suite Node séparément, avec
--test-isolation=none et rapport TAP. Les commandes exactes sont dans validation.json.
Les 12 suites ont réussi (100 %). La syntaxe est vérifiée par node --check et
py_compile, avec compilations dirigées vers output.

OpenSpec ciblé : exit 0 ; global préarchive : 10/10, exit 0 ; archive ciblée avec
--yes --json : exit 0, specsUpdated=true, quatre exigences modifiées ; global
post-archive : 9/9, exit 0. Aucun échec de validation ni refus automatique observé.
Aucune commande Git, installation ou intervention sur service actif.

## 5. Accès web

Aucune navigation web, publication distante ou transmission de projet à un
fournisseur. Les échanges de tests utilisent seulement leurs fixtures loopback.
Le smoke OpenCode natif a réussi dans une instance distincte à ports éphémères,
avec XDG isolé, sans modèle ni configuration utilisateur. Aucune instance active
n'a été contactée. Les taux web sont N/A — dénominateur nul.

## 6. Synthèse globale

| Mesure | Valeur |
|---|---|
| Début mesuré | 16/10/2026 08:03:34 CEST |
| Fin après archive et strict, avant rédaction | 16/10/2026 08:10:02 CEST |
| Durée calendaire, validations incluses | 00 h 06 min 27 s |
| Quota avant/après et différence | N/A — suivi de quota sans objet en SCM |
| Python | 52/223 (23,3 %) réussis |
| Node | 171/223 (76,7 %) réussis |
| Total | 223/223 (100 %) réussis |
| Archive | Réalisée et synchronisée |
| Sources / installation active | 1.2.0 / non modifiée ni qualifiée par cette session |
| Git et déploiement | Aucune opération |
| Sources sensibles | Aucune ouverte ni ajoutée |

Les schémas broker et protocole MCP sont inchangés. Le registre 1/2/3 et les
contrats du premier lot sont conservés. Aucun nouveau comportement hors annonce
de version, aucune migration ni dépendance. Les instantanés immuables restent
à valider séparément. Aucune version active n'est déduite de la version source.
