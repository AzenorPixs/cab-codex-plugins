---
description: Piloter la communication de validation OpenCode–Codex
version: 2.4.12
---

Réponds en français. Commande canonique : `/CAB` ; `/cab` n'est pas
pris en charge. Argument reçu : `$ARGUMENTS`. `/CABU` sans argument charge ce
fichier frère de même version et lui délègue exactement `update` dans le même
tour ; aucune logique de maintenance parallèle.

Essais : objet JSON littéral, directory racine projet, atelier propre au RUN.
Le profil isole l’atelier, pas tout OpenCode.

Cette commande ne modifie pas les sources, spécifications ou configuration
métier. Les vérifications et le cycle de vie CAB demandés sont autorisés ;
mandats métier et permissions techniques restent distincts. SCM/version ne
prouve pas activation. frozen-recovery-controller exige son accord spécifique.

Résoudre le skill CAB installé et ses références de même version.
Lire seulement la procédure de l'argument reçu ci-dessous. Une consultation ne
charge pas les branches de pilotage, prévol, mise à jour ou statistiques LLM.
Un argument manquant, ambigu ou inconnu affiche la syntaxe sans collecte ni
mutation. Jamais de sous-commande implicite.

| Arguments | Référence dans le skill CAB installé |
|---|---|
| `status` ou `status --run <run_id>` | `references/command-status.md` ; consultation et fin du rapport |
| `stats`, `statslast`, `stats24`, `stats7`, `stats30`, cible optionnelle `--run <run_id>` | `references/command-stats.md` |
| `source ...` | `references/command-source.md` |
| `start ...` | `references/command-start.md`, puis skill CAB de pilotage |
| `run ...` | `references/command-run.md`, puis skill CAB de pilotage |
| `test ...` | `references/command-test.md` et seuls prérequis du test |
| `pause`, `resume`, `stop` avec `--run <run_id>` ou `--all` | `references/command-pause.md` ; respecter la portée exacte |
| `stop` sans portée | `references/command-stop.md` ; ne jamais déduire `--all` |
| `update ...` | `references/command-update.md` et `references/component-update.md` |
| `cleanup ...` | `references/change-erasure.md`, `references/retired-run-cleanup.md` ; portée explicite |

Pour start, run ou resume, résoudre le workspace canonique puis appliquer
`references/monitor-service.md` avant PLLM et les prévols, sans purge, reset ou
redémarrage d'une instance conforme. Revenir ensuite à la seule sous-commande
demandée. Status, source, stats, pause, stop, test et update n'activent pas ce
bootstrap. Pour le détail des arguments et du transport, consulter seulement
si nécessaire `references/command-overview.md`. Le contrat normatif est indexé
par `references/protocol-index.md` ; `ORCHESTRATED_CODING.md` local n'est pas requis.

Incident : `references/owner-diagnostics.md`, puis `references/incident-triage.md`.
Frontières historiques : `references/historical-owner-boundaries.md`.
Pour piloter/reprendre : `references/pilot-state-matrix.md` puis la seule voie
utile ; `references/validation-submission.md` distingue décision, accès et once.
APPROVED ne vaut pas HELD. Retrait, rejeu ou élargissement ne sont pas implicites.
Changement de SID : `references/session-handoff.md`, sans effet implicite de run/resume.
Accords permanents ASK/MCP : `references/native-permission-grants.md` et
`references/mcp-pending-recovery.md`. Retraits : l’index du contrat.
Atelier prioritaire ; codeur justifie LXC/Docker, orchestrateur tranche.
`references/devops-resources.md` : outils DEVOPS.md RO et catalogue ;
accès externes par CAB, sans secrets ni socket hôte.

Dépendances : OpenSpec fait autorité ; `references/dependency-authority.md`.
