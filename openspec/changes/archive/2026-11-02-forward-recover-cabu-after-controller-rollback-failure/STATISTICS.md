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
| Node.js — suite complète | 775 tests : 744 réussis, 31 ignorés, 0 échec | 96,0 % réussis ; 4,0 % ignorés |
| Reprise CABU et migration du registre — tests ciblés | 2 réussis / 2 | Reçu `ROLLBACK_FAILED` lié et normalisation du reçu 2.1.67 |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| Compilation Python | Réussie | `compileall` sur broker, src, scripts et tests |
| OpenSpec strict avant archivage | 17 réussis / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussis / 16 | 100 % ; 0 échec |
| Validation stricte des archives | 132 réussies / 132 | 100 % ; 0 échec |
| Versions CAB/CABU/plugins/commandes | 2.1.68 communes | Cachebuster commun : `codex.20261102051701` |
| Publication et activation runtime | En cours après archivage | Vérifiées séparément dans le rapport SCM/CABU |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons ou décisions. Les appels synthétiques des tests ne sont pas attribués à une session de production.

## 3. Fichiers modifiés

Les changements portent sur la reprise avant d’un reçu CABU après échec du contrôleur, la normalisation des empreintes de rejet vers le schéma compatible, les tests de registre et de mise à jour, OpenSpec, la documentation CAB, les commandes distribuées et les versions communes.

| Famille | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| Updater CABU et reprise du reçu | N/A | N/A | 0 après tests ciblés |
| Registre et migration d’empreinte | N/A | 0 effet natif créé | 0 après tests ciblés |
| Tests positifs et négatifs | N/A | N/A | 0 après validation complète |
| OpenSpec et documentation | N/A | 0 observé | 0 après validation stricte |
| Fichiers hors périmètre | 0 attendu | N/A | N/A |

## 4. Commandes

| Commande | Résultat |
|---|---|
| `node --test --test-name-pattern='rollback CABU : reprise avant liée' tests/active-component-update.test.mjs` | 1 réussi / 1 |
| `node --test --test-name-pattern='rejet natif : les reçus 2.1.68' tests/resource-coordination.test.mjs` | 1 réussi / 1 |
| `node --test tests/*.test.mjs` | 775 tests : 744 réussis, 31 ignorés, 0 échec |
| `python3 -B -m unittest discover -s tests` | 87 réussis / 87 |
| `python3 -B -m compileall -q plugins/cab-approval-bridge/broker src plugins/cab-approval-bridge/scripts tests` | Réussie |
| `node --check` updater et registre | Réussie |
| `git diff --check` | Réussie avant finalisation |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 17 réussis / 17 avant archivage |
| `/home/devops/.local/npm/bin/openspec archive --yes forward-recover-cabu-after-controller-rollback-failure` | Archivage et synchronisation des trois exigences réussis |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 16 réussis / 16 après archivage |
| `/home/devops/.local/npm/bin/openspec validate --archived --strict --no-interactive` | 132 réussis / 132 |

## 5. Accès web

GitHub a été utilisé via le connecteur pour vérifier le dépôt distant ; la publication 2.1.68 n’était pas encore effectuée à la production de ce rapport. Aucune recherche Web ni navigation de contenu n’a été effectuée pour ce change.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Change | `forward-recover-cabu-after-controller-rollback-failure`, code de lot non attribué |
| État | Archivé, 8/8 tâches ; source qualifiée en 2.1.68 |
| Résultat | Le reçu exact `ROLLBACK_FAILED` peut être vérifié, conservé comme `SUPERSEDED`, puis lié à une nouvelle mise à jour publiée. Les reçus de rejet 2.1.67 sont normalisés vers `completionDigest`, un champ compatible antérieur. Aucun rechargement global OpenCode ni effet sur les RUN n’est produit par cette reprise. |
| Publication et activation runtime | Non observées à l’archivage | Distinctes de la qualification source ; bilan SCM/CABU ultérieur |
