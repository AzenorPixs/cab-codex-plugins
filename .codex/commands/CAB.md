---
description: Piloter la communication de validation OpenCode–Codex
version: 2.7.0
---

Réponds en français. Commande : `/CAB`, pas `/cab`. Argument : `$ARGUMENTS`.
`/CABU` sans argument charge ce fichier frère de même version et délègue `update`.

Essais : objet JSON littéral, directory racine projet, atelier propre au RUN.
Le profil isole l’atelier, pas tout OpenCode.

Cette commande autorise le cycle CAB demandé, sans écriture métier implicite.
SCM/version ne prouve pas activation ; frozen-recovery-controller exige son accord.

Résoudre le skill CAB et ses références de même version. Lire seulement la
procédure de l'argument reçu. Consultation : seule sa branche. Argument absent, ambigu ou inconnu : syntaxe
sans collecte ni mutation. Aucune sous-commande implicite.

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
| `cleanup ...` | `references/change-erasure.md`, `references/retired-run-cleanup.md` ; sentinelles exclues |

Start/run/resume : workspace canonique, puis `references/monitor-service.md`
avant PLLM/prévols, sans purge ni redémarrage conforme. Les autres arguments
n'activent pas ce bootstrap. Détails : `references/command-overview.md`. Le contrat normatif est indexé
par `references/protocol-index.md` ; aucune copie locale historique n'est requise.

Incident : `references/owner-diagnostics.md`, puis `references/incident-triage.md`.
Frontières historiques : `references/historical-owner-boundaries.md`.
Pour piloter/reprendre : `references/pilot-state-matrix.md` puis la seule voie
utile ; `references/validation-submission.md` indique la route de décision, accès et once.
APPROVED ne vaut pas HELD. Retrait, rejeu ou élargissement ne sont pas implicites.
Mandat write/edit : `references/native-input-guard.md` pour le schéma et le digest exacts.
Changement de SID : `references/session-handoff.md`, sans effet implicite de run/resume.
Accords permanents ASK/MCP : `references/native-permission-grants.md` et
`references/mcp-pending-recovery.md`. Retraits : l’index du contrat.
Nouvelles missions : references/autonomous-mandates.md ; décisions nécessaires
tranchées développeur/orchestrateur avant codage, autonomie puis revue finale.
Les profils historiques gardent leurs décisions unitaires.
`references/devops-resources.md` : outils DEVOPS.md RO et catalogue ;
accès externes par CAB, sans secrets ni socket hôte.

Dépendances : OpenSpec fait autorité ; `references/dependency-authority.md`.
