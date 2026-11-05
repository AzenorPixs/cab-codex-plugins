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
Durée observée de la suite Node séquentielle réussie : 124,2 s.

Vérifications : suite Node complète, 775 réussis, 31 ignorés, 0 échec ; tests
Python 87/87 ; cas ciblés de réconciliation et NO_EFFECT 5/5 ; distribution
CAB/CABU 33/33 ; OpenSpec strict valide ; validation des archives strictes
143/143 ; syntaxe JavaScript et compilation Python réussies.

## 2. Types de messages et d’outils

Répartition des messages OpenCode et outils natifs : `N/A`, aucun agent de
codage OpenCode n’a été piloté dans ce SCM. Les commandes de validation ont été
lancées directement par Codex.

## 3. Fichiers modifiés

Le changement couvre les routes de prévol/réconciliation du contrôleur, le
registre des baux, les tests positifs et négatifs, les spécifications
OpenSpec, la documentation du protocole et l’alignement de version 2.1.78.
Les comptes d’écritures approuvées, refusées et en erreur ne sont pas fournis
par cette session SCM : `N/A`. L’archive est
`2026-11-02-reconcile-restored-test-reservation`.

## 4. Commandes

| Famille | Résultat observé |
|---|---|
| Suite Node | 775 réussis, 31 ignorés, 0 échec |
| Tests Python | 87 réussis |
| Tests ciblés réconciliation | 5 réussis |
| Distribution CAB/CABU | 33 réussis |
| OpenSpec strict | Valide |
| Vérification syntaxique | Réussie |

Refus de permissions et erreurs d’autorisation : `N/A`, aucun événement de
permission n’a été enregistré pour ce SCM direct.

## 5. Accès web

Pages officielles consultées pour le contrat de shells OpenCode V2 et les
commandes OpenSpec :

- [API OpenCode V2](https://dev.opencode.ai/v2/docs/api)
- [CLI OpenSpec](https://openspec.dev/docs/cli)
- [Installation OpenSpec](https://openspec.dev/docs/installation)

Aucun accès refusé n’a été relevé.

## 6. Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — horodatage initial non capturé |
| Fin — après archivage | 2026-11-02, heure non capturée |
| Durée globale (pauses et attentes incluses) | N/A — borne initiale absente |

Les relevés de quotas Codex au début et à la fin sont `N/A` : aucun relevé n’a
été effectué. Totaux vérifiés : Node 775 réussis, 31 ignorés, 0 échec ; Python
87 réussis ; cas ciblés 5 réussis ; distribution 33 réussis. Le change est
archivé et son rapport contient six sections de niveau 2 en UTF-8/LF. La
publication SCM, CABU et les versions de runtime restent à vérifier après ce
rapport. Aucun token de bail ni autre secret n’est inscrit dans ce fichier.
