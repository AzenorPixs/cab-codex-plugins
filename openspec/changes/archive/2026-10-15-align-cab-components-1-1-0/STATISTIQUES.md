# Statistiques — alignement CAB 1.1.0

Session directe SCM : alignement explicitement demandé par le développeur.
Aucun skill statistique, benchmark LLM ni pilotage des RUN n'est invoqué.

### Agents de codage

Codex ; modèle exact, version, raisonnement, TTMT, débit et temps de service :
N/A — métriques de l'agent non collectées. Fournisseur : OpenAI.

### Agents orchestrateurs

Aucun agent de pilotage distinct ; SCM direct.

## 1. Statistiques générales et décisions

Résultat source : 14 modules versionnés, projet, manifeste avec cachebuster neuf,
commande /cab et deux unités systemd alignés sur **1.1.0**. Aucun comportement,
schéma, protocole MCP ou dépendance modifié. Quatre clauses canoniques de version
sont synchronisées ; les origines historiques 1.0.0/1.0.1/1.0.2 sont conservées.

197 tests réussis, 0 échec final, 0 ignoré : 50 Python (25,4 %) et 147 Node
(74,6 %), dont une intégration OpenCode native isolée (0,5 % du total).
Total : 197, 100,0 %. Messages, appels d'outils, tokens, cache, coût et compactions
exhaustifs : N/A — aucune collecte de pilotage SCM. Les répétitions ne sont pas
additionnées et les tests ne sont pas des mandats CAB de production.

## 2. Types de messages et d'outils

Syntaxe Python vérifiée pour les six modules et deux tests modifiés ; syntaxe
Node vérifiée pour huit modules. Douze suites exécutées directement : 50 tests
Python, 146 tests Node locaux/simulés et un test natif OpenCode avec trois sessions
et un seul broker 1.1.0, sans modèle ni opération métier. Les assertions de version
sont actualisées ; aucune assertion de sécurité ni aucun test affaibli.

Détail des commandes et sorties : output/version-1.1.0/verifications.json.
Rôles des messages et compteurs exhaustifs des outils agent : N/A.

## 3. Fichiers modifiés

29 fichiers de version, tests et cadrage modifiés dans ce complément ; ces nombres
ne sont pas des tentatives d'écriture ou un état Git. Les artefacts OpenSpec
et preuves output sont comptés séparément. Aucun fichier source supprimé ni renommé.

| Chemin absolu complet |
|---|
| /home/devops/datas/cab/pyproject.toml |
| /home/devops/datas/cab/src/cgpt_approval_bridge_journal.py |
| /home/devops/datas/cab/src/cgpt_approval_bridge_router.py |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json |
| /home/devops/datas/cab/tests/test_session_reset.py |
| /home/devops/datas/cab/tests/test_crash_recovery.py |
| /home/devops/datas/cab/tests/concurrent-controller.test.mjs |
| /home/devops/datas/cab/tests/native-opencode.test.mjs |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs |
| /home/devops/datas/cab/PROJECT.md |
| /home/devops/datas/cab/TECHNICAL.md |
| /home/devops/datas/cab/BUILD.md |
| /home/devops/datas/cab/README.md |
| /home/devops/datas/cab/CHANGELOG.md |
| /home/devops/datas/cab/.codex/commands/cab.md |

Le canon openspec/specs/codex-integration-distribution/spec.md est synchronisé.
Trois artefacts du change sont déplacés par l'archive ; ce rapport est ajouté
ensuite. Les anciennes archives et leurs preuves ne sont pas réécrites.

## 4. Commandes

Compilation, douze suites, contrôle des versions et UTF-8/LF réussis. OpenSpec
strict avant archive : 10/10 ; après archive : **9/9, exit 0 sans avertissement**.
Archive unique réussie : quatre exigences modifiées, aucune ajoutée, supprimée
ou renommée. Les quatre deltas sont vérifiés identiques au canon.

La revue automatique a initialement refusé le frontmatter .codex/commands/cab.md
sur une règle attribuée à AGENTS. La lecture a établi que la règle vise
.opencode/commands/, tandis que TECHNICAL identifie la commande Codex versionnée.
La même action, resoumise avec ces preuves et l'autorisation de version du
développeur, a été acceptée. Aucun contournement ; vérification par empreinte que
seule la ligne version du frontmatter a changé. Aucun blocage restant.

## 5. Accès web

Aucune recherche web, installation, publication, opération Git ou intervention
sur les services actifs. Les seuls accès réseau de validation concernent les
services loopback et l'instance OpenCode temporaires des tests. Aucun secret
consulté ou ajouté ; les données des tests sont synthétiques.

## 6. Synthèse globale

| Intervalle de travail vérifiable | Valeur |
|---|---|
| Baseline avant écritures de version | 2026-10-15T06:41:05+02:00 |
| Fin après archive et strict, avant rapport | 2026-10-15T06:52:28+02:00 |
| Durée observée, attentes incluses | 00 h 11 min 22 s |
| Début effectif / durée complète | N/A — exploration précédant la baseline |

Quota Codex 7 jours avant/après/différence, consommation de l'agent, TTMT et
débit : N/A — non relevés en SCM, aucune mesure reconstituée. Le quota de compte
est partagé. Contrôles : 197/197 tests et 9/9 spécifications strictes réussis,
UTF-8/LF et six sections vérifiés.

| Document | Vérification |
|---|---|
| PROJECT.md | Version de référence 1.1.0 ; collecte et profil optimisé présents |
| TECHNICAL.md | Version 1.1.0 ; module, routes, métriques et schémas documentés |
| BUILD.md | Version courante 1.1.0 et distribution du collecteur vérifiées |
| README.md | Version 1.1.0 ; exports et clôture optimisée présents |
| CHANGELOG.md | Préparation source 1.1.0 du 15/10, sans publication annoncée |
| ORCHESTRATED_CODING.md | Retouché au correctif précédent, empreinte et clauses vérifiées ; aucun changement nécessaire pour cette métadonnée de version |
| AGENTS.md | Inchangé : règles générales, permissions et gates conservés |
| DEVOPS.md | Inchangé : inventaire daté, aucune modification système ou de dépendance |


Les empreintes de baseline correspondent aux preuves du correctif précédent
pour les six documents retouchés : la vérification ne repose pas sur leur seule
présence. AGENTS et DEVOPS conservent leurs versions documentaires indépendantes.
Les métadonnées de version sont prêtes dans les sources ; installation active,
caches installés et projets consommateurs ne sont pas mis à jour. Aucun Git
inspecté, commit, push, branche ou tag. Registre schéma 2 antérieur inchangé.
