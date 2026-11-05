# STATISTIQUES — prevent-native-permission-bypass

Archive : `2026-10-14-prevent-native-permission-bypass`  
Projet : `/home/devops/datas/cab` ; chat : `01a13893-8782-7531-a646-cdbd55a81c85`  
Mode : SCM direct Codex, sans pilotage OpenCode ni sondes statistiques.  
Autorisation : proposition de périmètre CAB 1.0.1 validée par « Je valide ».  
Intervalle observé : 2026-10-14T06:53:27+02:00 → 2026-10-14T07:13:17+02:00 (Europe/Paris).

La borne initiale est le relevé d'empreintes des fichiers ciblés après validation
humaine ; elle exclut l'analyse et la proposition antérieures. La fin suit
l'archivage et sa validation stricte corrigée, avant rédaction du rapport.
Les durées calendaires ne mesurent pas le temps de génération du modèle.

### Agents de codage

| Modèle | Version exacte | Fournisseur | Raisonnement | TTMT | Tokens/s | Temps de service |
| --- | --- | --- | --- | --- | --- | --- |
| Codex | N/A — non exposée | OpenAI | N/A — non mesuré | N/A | N/A | N/A |

### Agents orchestrateurs

Aucun agent orchestrateur distinct ni sous-agent utilisé : SCM est direct.
Aucune télémétrie de pilotage, sonde PLLM ou compétence statistique pilotée
n'a été déclenchée. Les valeurs absentes ne sont pas reconstruites.

## 1. Statistiques générales et décisions

- Préconditions d'implémentation : **8 tâches sur 8 achevées** avant archivage.
- Version de base : **1.0.1** ; plugin : **1.0.1+codex.20261014050004**.
- Archivage : **1 commande réussie**, aucune répétition ; **3 exigences ajoutées,
  1 modifiée, 0 supprimée, 0 renommée**, dans deux capacités.
- OpenSpec final : **8 spécifications valides sur 8**, mode strict, zéro échec.
- Permissions réelles de RUN : **aucune action engagée** dans ce SCM.
- Décisions/permissions techniques du client : **N/A** pour un décompte exhaustif,
  journal statistique non collecté ; les tests HTTP ont été autorisés hors sandbox.
- Tokens, coût, cache, quotas, compactages et surcharge de télémétrie : **N/A**,
  collecte absente et aucune estimation effectuée.

| Suite finale | Recensés | Réussis | Échecs | Non exécutés |
| --- | ---: | ---: | ---: | ---: |
| Python | 48 | 48 | 0 | 0 |
| JavaScript | 123 | 122 | 0 | 1 |
| **Total** | **171** | **170** | **0** | **1** |

Taux de réussite des tests exécutés : **170/170, soit 100 %**. Le test OpenCode
natif reste non exécuté : `CAB_TEST_OPENCODE` est explicitement retiré de la
commande finale pour préserver les processus et services actifs. Les tests
intermédiaires répétés ne sont pas additionnés aux effectifs finaux.

## 2. Types de messages et d'outils

Messages utilisateur/agent, appels de commandes, opérations de fichiers et
métadonnées de raisonnement : **N/A — inventaire exhaustif non instrumenté**.
Les preuves utilisées sont les résultats natifs des commandes de ce chat,
les tests, les artefacts OpenSpec et les empreintes des fichiers ciblés.
Aucun contenu de raisonnement interne n'est reproduit. Les assertions de
permission dans les tests sont synthétiques ; elles ne sont pas assimilées
à des décisions opérationnelles sur les RUN.

## 3. Fichiers modifiés

Comparaison SHA-256 de **54 fichiers ciblés** : **33 fichiers existants modifiés**
après synchronisation OpenSpec, dont 31 avant archivage et 2 spécifications
canoniques lors de l'archivage. Les fichiers de sources contrôlés après les
tests ne montrent aucune dérive inattendue. Les modifications déjà présentes
de la remédiation CISMP3 ont été conservées.

| Chemin relatif au projet | État |
| --- | --- |
| `TECHNICAL.md` | Modifié dans ce SCM |
| `BUILD.md` | Modifié dans ce SCM |
| `ORCHESTRATED_CODING.md` | Modifié dans ce SCM |
| `README.md` | Modifié dans ce SCM |
| `CHANGELOG.md` | Modifié dans ce SCM |
| `pyproject.toml` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/.codex-plugin/plugin.json` | Modifié dans ce SCM |
| `.codex/commands/cab.md` | Modifié dans ce SCM |
| `src/cgpt_approval_bridge_router.py` | Modifié dans ce SCM |
| `src/cgpt_approval_bridge_journal.py` | Modifié dans ce SCM |
| `src/cgpt_approval_bridge_server.py` | Modifié dans ce SCM |
| `tests/test_crash_recovery.py` | Modifié dans ce SCM |
| `tests/test_session_reset.py` | Modifié dans ce SCM |
| `tests/controller-configuration.test.mjs` | Modifié dans ce SCM |
| `tests/controller-session-recovery.test.mjs` | Modifié dans ce SCM |
| `tests/controller-service-distribution.test.mjs` | Modifié dans ce SCM |
| `tests/concurrent-controller.test.mjs` | Modifié dans ce SCM |
| `tests/native-opencode.test.mjs` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | Modifié dans ce SCM |
| `openspec/specs/codex-integration-distribution/spec.md` | Modifié dans ce SCM |
| `openspec/specs/controller-transport/spec.md` | Modifié dans ce SCM |
| `plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | Modifié dans ce SCM |

| Artefact relatif à cette archive | État |
| --- | --- |
| `design.md` | Créé puis déplacé par archivage |
| `proposal.md` | Créé puis déplacé par archivage |
| `specs/codex-integration-distribution/spec.md` | Créé puis déplacé par archivage |
| `specs/controller-transport/spec.md` | Créé puis déplacé par archivage |
| `tasks.md` | Créé puis déplacé par archivage |
| `STATISTIQUES.md` | Rapport créé après archivage |

Total des chemins livrés dans ce périmètre : **39**, soit **33 modifiés +
5 artefacts archivés + 1 rapport**. Aucun fichier source supprimé ; cinq
artefacts du change ont été déplacés vers cette seule archive. Les artefacts
régénérables de compilation et les temporaires de tests ne sont pas inclus.
Le bilan documentaire détaillé par fichier est dans `design.md`, section
« Bilan documentaire ». AGENTS.md, PROJECT.md et DEVOPS.md restent identiques
au relevé initial de cette phase validée.

## 4. Commandes

| Contrôle final | Commande ou mécanisme | Résultat |
| --- | --- | --- |
| Syntaxe Python | `python3 -m py_compile src/*.py plugins/cab-approval-bridge/scripts/*.py tests/test_session_reset.py tests/test_crash_recovery.py` | Réussi, 8 fichiers |
| Syntaxe JavaScript | `/home/devops/node/current/bin/node --check` sur 12 fichiers concernés | Réussi ; la suite finale reparcourt les tests |
| Tests Python | `python3 -m unittest discover -s tests -p 'test_*.py'` | Réussi, 48 tests, 3,398 s |
| Tests JavaScript | `env -u CAB_TEST_OPENCODE /home/devops/node/current/bin/node --test --test-concurrency=1 tests/*.test.mjs` | Réussi, 122 tests, 1 non exécuté, 23,359 s |
| Versions | Tests de distribution de la suite JavaScript | Réussi, base 1.0.1 cohérente |
| OpenSpec avant archivage | `/home/devops/.local/npm/bin/openspec validate --all --strict` | Réussi, 9 éléments |
| Archivage | `/home/devops/.local/npm/bin/openspec archive prevent-native-permission-bypass --yes --json` | Réussi, specsUpdated true |
| OpenSpec après archivage | `/home/devops/.local/npm/bin/openspec validate --all --strict` | Réussi, 8 spécifications |
| Texte préparé | Décodage UTF-8, absence de CR, terminaison LF et revue des écritures | Réussi, 36 fichiers avant archivage ; contrôle final étendu au rapport |

Les durées des deux suites sont leurs durées natives respectives, pas une
mesure de temps de service de l'agent. Les premières commandes HTTP ont
échoué sous sandbox avec `listen EPERM`. L'écriture source de la commande
`.codex/commands/cab.md` a nécessité l'autorisation technique hors sandbox.
Une tentative d'alignement de route n'a rien écrit car la commande était déjà
alignée. Les fixtures de répertoire et de décision automatique, les attentes
de version et l'attente du seul refus transitoire `validation-in-flight` ont
été corrigées. Les tests sont finalement séquentiels pour éviter les collisions
de ports éphémères. Aucun test n'a été désactivé pour masquer ces erreurs.

Après archivage, le premier contrôle strict a signalé une exigence de plus
500 caractères. Sa formulation a été raccourcie dans le canon et le delta
archivé sans modifier les obligations ; le contrôle strict suivant réussit.
Aucun réarchivage. Décompte exhaustif des commandes et des autorisations :
**N/A — aucune instrumentation dédiée**. Les sorties non nulles intermédiaires
ne sont pas présentées comme des réussites ni comme des refus du développeur.

## 5. Accès web

**0 accès web externe dans cette phase SCM validée.** La recherche officielle
de la phase d'analyse antérieure est hors intervalle. Les serveurs loopback
simulés et l'API native de l'application ne constituent pas des visites web.
Aucun appel aux API des services CAB/OpenCode actifs n'a été nécessaire ici.

## 6. Synthèse globale

Durée de l'intervalle observé : **1190 secondes**,
analyses, corrections et validations incluses. Durée complète du chat,
TTMT, débit, coût et consommation exclusive de quotas : **N/A — non mesurés**.

Le correctif refuse les règles natives non prouvées avant admission,
approbation et transmission once des jobs armés, contrôle la candidate et
distribue la séquence noReply/PATCH ask/lecture/génération. La neutralité CAB,
les décisions consommées, le retry ordinaire strict et l'isolation des RUN sont
préservés. Les usages sans job armé conservent leur compatibilité.

Le contrôleur exige une règle finale globale ask pour le type natif concerné.
Il ne rend pas une modification externe des règles atomique avec l'exécution
native : leur stabilité pendant le mandat reste nécessaire. Pas de dépendance
ajoutée, migration, installation, publication ou modification d'état des RUN
actifs. Les caches installés et services restent inchangés par ce SCM.
Git non inspecté pendant cette phase validée ; aucun commit, push ou branche.

État : **source CAB 1.0.1 validée, change archivé, rapport publié**.
Intégration OpenCode native et mise en service coordonnée : **non exécutées,
hors périmètre validé**. Les contrôles de présence, six sections, totaux et
UTF-8/LF sont exécutés après l'écriture de ce rapport avant la restitution.
