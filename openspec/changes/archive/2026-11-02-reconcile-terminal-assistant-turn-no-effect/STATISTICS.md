### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent identifiable | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex, session SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

La télémétrie détaillée de messages, décisions, tokens, cache, coût et
compactions n’a pas été collectée pour ce SCM direct. Ces mesures sont `N/A`.
Durée d’exécution observée du dernier lancement Node : 72,8 s.

Vérifications : suite Node complète, 770 réussis, 31 ignorés et 1 échec de
démarrage du contrôleur dans un scénario de fixture ; la même fixture a réussi
isolément. Tests Python : 87/87. Tests CAB ciblés NO_EFFECT : 4/4. Distribution
CAB/CABU : 33/33. OpenSpec strict : valide ; validation des archives strictes :
142/142. Syntaxe JavaScript et compilation Python : réussies.

## 2. Types de messages et d’outils

Répartition des messages OpenCode et outils natifs : `N/A`, aucun agent de
codage OpenCode n’a été piloté dans ce SCM. Les commandes de vérification ont
été lancées directement par Codex.

## 3. Fichiers modifiés

Le changement couvre les sources du contrôleur et du registre, les tests
positifs/négatifs, les marqueurs de version 2.1.76, la documentation CAB et les
spécifications OpenSpec. Les compteurs d’écritures par approbation, refus ou
erreur ne sont pas fournis par cette session SCM : `N/A`. Le changement a été
archivé sous `2026-11-02-reconcile-terminal-assistant-turn-no-effect`.

## 4. Commandes

| Famille | Résultat observé |
|---|---|
| Suite Node | 770 réussis, 31 ignorés, 1 échec transitoire de démarrage ; relance isolée réussie |
| Tests Python | 87 réussis |
| Tests CAB ciblés | 4 réussis |
| Distribution CAB/CABU | 33 réussis |
| OpenSpec strict | Valide |
| Vérification syntaxique | Réussie |

Les commandes refusées et erreurs d’autorisation : `N/A`, aucun événement de
permission n’a été enregistré pour ce SCM direct.

## 5. Accès web

Deux pages officielles OpenSpec ont été consultées pour vérifier la commande
de validation et son installation temporaire :

- https://openspec.dev/docs/cli
- https://openspec.dev/docs/installation

Aucun accès refusé ou URL non visitée n’a été relevé.

## 6. Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — horodatage initial non capturé |
| Fin — après archivage | 2026-11-02, heure non capturée |
| Durée globale (pauses et attentes incluses) | N/A — borne initiale absente |

Les relevés de quotas Codex au début et à la fin sont `N/A` : aucun relevé n’a
été effectué. Totaux de tests observés : Node 770 réussis, 31 ignorés, 1 échec
de démarrage transitoire reproduit avec succès isolément ; Python 87 réussis ;
tests ciblés 4 réussis ; distribution 33 réussis. Le change OpenSpec est
archivé et le rapport contient six sections de niveau 2 en UTF-8/LF. La
publication SCM, CABU et les versions de runtime restent à vérifier après ce
rapport. Aucun secret n’a été consulté ou inscrit dans ce fichier.
