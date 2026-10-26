# Rapport d'archivage — allow-cab-reset-after-failed-recovery

Session SCM directe dans `/home/devops/datas/cab`. Le développeur a validé le
périmètre et l'interprétation des deux espaces runtime le 10 octobre 2026.
Aucun RUN OpenCode de production, purge réelle ou skill de statistiques SCMP
n'a été lancé. Le rapport est produit après preuve de l'archive.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Raisonnement | TTMT moyen | Tokens/s moyens | Temps de service |
|---|---|---|---|---|---|---|
| Codex | N/A — version exacte non exposée | OpenAI | N/A — télémétrie absente | N/A | N/A | N/A |

### Agents orchestrateurs

Aucun agent distinct : SCM exécuté directement, sans sous-agent ni agent
OpenCode de production. Les sondes et la collecte SCMP sont non applicables
selon le prompt SCM.

## 1. Statistiques générales et décisions

| Suites finales | Réussis | Échecs | Total | Part des tests | Réussite |
|---|---:|---:|---:|---:|---:|
| Node | 35 | 0 | 35 | 47,9 % | 100 % |
| Python | 38 | 0 | 38 | 52,1 % | 100 % |
| Total | 73 | 0 | 73 | 100 % | 100 % |

Trois nouveaux tests sont inclus dans ces totaux : refus HTTP du prévol
`true` avec change divergent sans transfert ou gate valide ; distribution
des gardes de l'exception ; purge de deux espaces fictifs conservant checkpoint
externe, preuves et empreinte/date de modification d'une écriture validée.

La première validation du delta a refusé deux noms de scénarios modifiés ;
leurs noms historiques ont été rétablis, puis le delta strict a réussi.
Le premier essai Python dans le sandbox a donné 37 succès et un échec : le
sous-processus MCP s'est arrêté par signal 11 sans diagnostic. Sa cause exacte
n'est pas déterminée. La suite avec l'interpréteur DEVOPS hors sandbox a
réussi 38/38, sans modification du code ou affaiblissement des tests après
cet échec. Les essais précédents ne sont pas additionnés aux suites finales.

Syntaxe : 3 fichiers Python et 4 fichiers JavaScript modifiés valides.
JSON, versions et UTF-8/LF contrôlés. Delta strict valide avant archivage.
Référentiel standard après synchronisation : 7/7 spécifications valides avec
avertissements. Strict global : code 1, une spécification valide et six en
échec uniquement sur 13 avertissements de longueur. Les couples
spécification/index/message sont identiques avant et après synchronisation ;
zéro erreur normative signalée. Le strict global n'est pas déclaré réussi.

Un appel réussi ne prouve pas une approbation manuelle. Aucun refus CAB de
production n'a eu lieu ; les refus attendus des fixtures sont des tests.
Messages, tokens, cache, coût, quota hebdomadaire, TTMT, débit et durée complète
de session : N/A — collecte de télémétrie non activée en SCM. Premier relevé
d'empreintes : 2026-10-10T06:05:54.317924+00:00. Contrôle après archivage :
2026-10-10T06:11:41.583887+00:00. Ces bornes partielles ne mesurent ni toute la session
ni le temps de génération du modèle.

## 2. Types de messages et d'outils

Lectures et recherches ciblées, éditions locales, compilation, tests CAB et
CLI OpenSpec exécutés directement. Mandats CAB de production : 0, non
applicables à SCM. Répartition exhaustive des messages et appels : N/A,
absence de journal statistique normalisé. Aucun secret ni état technique de
production n'a été lu ; les états supprimés par les tests sont synthétiques.
Les commandes ont été examinées séparément. Les suites hors sandbox utilisent
des fixtures et serveurs loopback, pas les services CAB installés.

## 3. Fichiers modifiés

Vingt fichiers existants modifiés :

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
- `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/session-reset.md`
- `/home/devops/datas/cab/src/cgpt_approval_bridge_server.py`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs`
- `/home/devops/datas/cab/tests/controller-service-distribution.test.mjs`
- `/home/devops/datas/cab/tests/controller-session-recovery.test.mjs`
- `/home/devops/datas/cab/tests/test_session_reset.py`
- `/home/devops/datas/cab/tests/test_crash_recovery.py`
- `/home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md`
- `/home/devops/datas/cab/openspec/specs/persistent-job-supervision/spec.md`

Cinq artefacts créés puis archivés une seule fois :

- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-allow-cab-reset-after-failed-recovery/proposal.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-allow-cab-reset-after-failed-recovery/design.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-allow-cab-reset-after-failed-recovery/tasks.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-allow-cab-reset-after-failed-recovery/specs/codex-integration-distribution/spec.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-allow-cab-reset-after-failed-recovery/specs/persistent-job-supervision/spec.md`

Ce rapport ajoute `STATISTIQUES.md` à l'archive. Total final :
**26 chemins = 18 sources/documentation/tests + 2 références OpenSpec +
6 fichiers d'archive**, sans compter deux fois les chemins déplacés.
Fichiers existants modifiés : 20/26 (76,9 %) ; fichiers d'archive créés :
6/26 (23,1 %) ; total 26/26 (100 %). Aucun fichier fonctionnel supprimé.

Le broker, le contrôleur et le superviseur changent seulement de version,
prouvé par remplacement inverse de la chaîne de version et empreinte SHA-256.
Le script de purge conserve exactement son empreinte. DEVOPS, marketplace,
les cinq autres références OpenSpec et les trois changes historiques actifs
restent inchangés dans le contrôle ciblé. Les artefacts temporaires des tests
sont dirigés dans la racine CAB et nettoyés avant restitution.
Aucune inspection Git ni inventaire exhaustif de modifications concurrentes
externes n'est présenté comme preuve.

## 4. Commandes

| Commande ou contrôle final | Résultat observé |
|---|---|
| `env TMPDIR=… node --test tests/*.test.mjs` hors sandbox | 35 tests réussis |
| `env TMPDIR=… /home/devops/python/current/bin/python3 -B -m unittest discover -s tests -p 'test_*.py'` hors sandbox | 38 tests réussis |
| `python3 -m py_compile` avec interpréteur DEVOPS et cache dans le projet | 3 fichiers valides |
| `node --check` par fichier modifié | 4 fichiers valides |
| `openspec validate allow-cab-reset-after-failed-recovery --strict` | Réussi avant archivage |
| `openspec archive allow-cab-reset-after-failed-recovery --json --yes` | Réussi une seule fois ; 5 exigences ajoutées, 4 modifiées |
| `openspec validate --specs` | 7/7 valides avec avertissements |
| `openspec validate --specs --strict` avant/après | Échec sur les mêmes 13 avertissements historiques |
| Versions, manifestes JSON et UTF-8/LF | Réussis |
| Empreintes de périmètre et égalité deltas/références après archive | Réussies |

OpenSpec utilise `/home/devops/.local/npm/bin/openspec`, conformément à DEVOPS.
Aucun drapeau de désactivation de validation OpenSpec, commande Git, installation
ou activation de service n'a été utilisé dans cette session.

## 5. Accès web

Accès web externe de développement : 0. Les serveurs HTTP/SSE des tests sont
simulés sur loopback. Aucune authentification fournisseur, connexion à un
compte, donnée de production, publication ou opération PostgreSQL réelle.
Aucun secret ajouté ou transmis au modèle.

## 6. Synthèse globale

Protocole source CAB `0.86.9` livré et archivé sous
`2026-10-10-allow-cab-reset-after-failed-recovery`. Après feu vert, le double
écart prouvé `true` au lieu de `/usr/bin/true` et `change_id` divergent
autorise une nouvelle session CAB sans nouvelle confirmation, seulement après
neutralisation, inactivité technique et sauvegarde des preuves métier hors
cibles. Les anciennes demandes restent refusées et le gate n'est pas inventé.

L'outil existant purge les deux espaces runtime résolus du home OpenCode et
du projet avec ses mêmes gardes. Nouvelle session, nouveau job technique et
identifiants neufs sont requis. Le prévol de ce redémarrage exige exactement
`/usr/bin/true`, le bon change, une décision explicite, consommation native
unique, exit 0 et readiness finale READY sans permission parasite. La reprise
s'appuie sur les fichiers et preuves conservées, au premier jalon non prouvé,
sans rejouer les écritures validées. Effets inconnus, preuves manquantes,
propriété incertaine et espaces partagés restent des motifs de refus.
Les autres récupérations restent sans purge et OpenCode reste ouvert.

L'archive native a déclaré `specsUpdated: true`, 5 exigences ajoutées,
4 modifiées, 0 supprimée, 0 renommée. L'absence du chemin actif et l'égalité
des blocs de delta avec les références ont été vérifiées après archivage.
73 tests finaux réussis ; avertissements stricts historiques inchangés.

| Élément | Bilan documentaire |
|---|---|
| AGENTS.md | Exception, neutralisation, prévol exact et absence de rejeu ajoutés |
| PROJECT.md | Responsabilités et reprise ordinaire/exceptionnelle distinguées |
| TECHNICAL.md | Runtime, checkpoint externe, prévol et limites d'API précisés |
| BUILD.md | Version 0.86.9 et contrôles d'intégration de l'exception ajoutés |
| DEVOPS.md | Inchangé : mêmes outils, dépendances et environnement |
| README.md | Exception et limites expliquées sans annoncer une reprise réelle |
| CHANGELOG.md | Entrée Unreleased pour le comportement livré et la version |
| OpenSpec | Deux références synchronisées, seul change ciblé archivé |
| Commande/skill/référence | Autorisation durable, conditions et procédure distribuées |

Le protocole relève de l'orchestrateur ; aucun automate de purge, endpoint ou
assouplissement de `/job/recover` n'a été ajouté. Les tests de purge prouvent
la conservation des fichiers témoins ; ils ne prouvent pas une reprise métier
de production. Purge réelle, installation du profil, redémarrage de service,
déploiement et `/cab start` / `/cab test` réels : non exécutés, hors périmètre.
La suppression future du runtime est irréversible et impose les preuves
externes préalables. La présence, les six sections, l'encodage et les totaux
de ce rapport sont contrôlés avant restitution terminale.

