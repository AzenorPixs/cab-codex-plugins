---
description: Piloter la communication de validation OpenCode–Codex
version: 2.2.0
---

Réponds en français. Commande canonique et unique : `/CAB` ; `/cab` n'est pas
pris en charge. Argument reçu : `$ARGUMENTS`. `/CABU` sans argument charge ce
fichier frère de même version et lui délègue exactement `update` dans le même
tour ; aucune logique de maintenance parallèle.

Cette commande globale ne modifie pas les sources métier, spécifications ou
configuration du projet suivi. Le développeur accorde l'autorisation permanente
des vérifications et du cycle de vie CAB demandés ; les permissions techniques
de l'environnement et les mandats métier restent distincts. Un mandat SCM ou
un changement de version ne vaut pas activation. Le profil spécial
frozen-recovery-controller exige son accord de maintenance spécifique.

Résoudre le skill CAB du plugin installé et ses références à la même version.
Lire seulement la procédure de l'argument reçu ci-dessous. Une consultation ne
charge pas les branches de pilotage, prévol, mise à jour ou statistiques LLM.
Un argument manquant, ambigu ou inconnu affiche la syntaxe sans collecte ni
mutation. Une commande ne lance jamais une autre sous-commande implicitement.

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

Pour start, run ou resume, résoudre le workspace canonique puis appliquer
`references/monitor-service.md` avant PLLM et les prévols, sans purge, reset ou
redémarrage d'une instance conforme. Revenir ensuite à la seule sous-commande
demandée. Status, source, stats, pause, stop, test et update n'activent pas ce
bootstrap. Pour le détail des arguments et du transport, consulter seulement
si nécessaire `references/command-overview.md`. Le contrat normatif est indexé
par `references/protocol-index.md` ; `ORCHESTRATED_CODING.md` local n'est pas requis.
