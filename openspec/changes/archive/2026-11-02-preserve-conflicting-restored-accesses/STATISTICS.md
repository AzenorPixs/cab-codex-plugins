### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | N/A | N/A — Codex direct, télémétrie d’agent absente |

### Agents orchestrateurs

N/A — session SCM directe, aucun agent orchestrateur distinct.

## 1. Statistiques générales et décisions

| Mesure | Valeur | Part / cause |
|---|---:|---|
| Durée calendaire complète | N/A | Heure de début SCM non relevée |
| Messages, appels d’outils et décisions | N/A | Export exhaustif absent |
| Node.js — suite complète | 777 tests : 746 réussis, 31 ignorés, 0 échec | 96,0 % réussis ; 4,0 % ignorés |
| Restauration d’accès conflictuels | 1 réussi / 1 | Leases conservées, `once` refusé, conflit en attente et ressource disjointe admise |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| Compilation Python | Réussie | `compileall` sur broker, src, scripts et tests |
| OpenSpec strict avant archivage | 17 réussis / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussis / 16 | 100 % ; 0 échec |
| Validation stricte des archives | À vérifier après production du rapport | Contrôle final d’archive |
| Versions CAB/CABU/plugins/commandes | 2.1.69 communes | Cachebuster commun : `codex.20261102053553` |
| Publication et activation runtime | En cours après archivage | Vérifiées séparément dans le rapport SCM/CABU |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons ou décisions. Les appels synthétiques des tests ne sont pas attribués à une session de production.

## 3. Fichiers modifiés

Le changement retire le refus global de restauration pour des accès actifs superposés. Le registre conserve chaque accès et les marques restaurées bloquent toute réutilisation de `once`; les nouvelles opérations en conflit restent en attente. Les tests couvrent aussi une opération disjointe.

| Famille | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| Restauration du registre | N/A | 0 accès supprimé ou fusionné | 0 après validation ciblée |
| Tests de contention et restauration | N/A | `once` refusé et conflit en attente comme prévu | 0 après validation complète |
| OpenSpec et documentation | N/A | 0 observé | 0 après validation stricte |
| Fichiers hors périmètre | 0 attendu | N/A | N/A |

## 4. Commandes

| Commande | Résultat |
|---|---|
| `node --test --test-name-pattern='restauration conserve les accès actifs conflictuels' tests/resource-coordination.test.mjs` | 1 réussi / 1 |
| `node --test tests/*.test.mjs` | 777 tests : 746 réussis, 31 ignorés, 0 échec |
| `python3 -B -m unittest discover -s tests` | 87 réussis / 87 |
| `python3 -B -m compileall -q plugins/cab-approval-bridge/broker src plugins/cab-approval-bridge/scripts tests` | Réussie |
| `node --check` registre et tests concernés | Réussie |
| `git diff --check` | Réussie avant finalisation |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 17 réussis / 17 avant archivage |
| `/home/devops/.local/npm/bin/openspec archive --yes preserve-conflicting-restored-accesses` | Archivage et synchronisation de la spécification réussis |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 16 réussis / 16 après archivage |

## 5. Accès web

Aucune recherche Web ou navigation de contenu n’a été effectuée pour ce change.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Change | `preserve-conflicting-restored-accesses`, code de lot non attribué |
| État | Archivé, 6/6 tâches ; source qualifiée en 2.1.69 |
| Résultat | La restauration accepte plusieurs accès actifs qui se recouvrent sans les modifier. Chaque lease restaurée demeure protégée contre `once`; les nouveaux conflits restent `WAITING` et les ressources disjointes avancent. |
| Publication et activation runtime | CABU reste distinct de la qualification SCM ; l’activation 2.1.69 est en cours |
