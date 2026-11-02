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
| Node.js — suite complète | 778 tests : 747 réussis, 31 ignorés, 0 échec | 96,0 % réussis ; 4,0 % ignorés |
| Reprise CABU et restauration d’accès | 5 réussis / 5 | Reçu exact, parent déconnecté, refus d’identifiant et leases conflictuelles |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| Compilation Python | Réussie | `compileall` sur broker, src, scripts et tests |
| OpenSpec strict avant archivage | 17 réussis / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussis / 16 | 100 % ; 0 échec |
| Validation stricte des archives | À vérifier après production du rapport | Contrôle final d’archive |
| Versions CAB/CABU/plugins/commandes | 2.1.70 communes | Cachebuster commun : `codex.20261102054112` |
| Publication et activation runtime | En cours après archivage | Vérifiées séparément dans le rapport SCM/CABU |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons ou décisions. Les appels synthétiques des tests ne sont pas attribués à une session de production.

## 3. Fichiers modifiés

Le changement relie les reçus CABU après déconnexion confirmée, conserve les brokers source déjà publiés, restaure les leases actives en conflit sans les libérer, et met à jour les tests, spécifications et documents CAB.

| Famille | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| Reprise avant CABU | N/A | Reload global refusé hors mandat | 0 après tests ciblés |
| Registre et accès restaurés | N/A | `once` refusé ; conflit attendu en `WAITING` | 0 après tests ciblés |
| Tests positifs et négatifs | N/A | Cas négatifs refusés comme prévu | 0 après suite complète |
| OpenSpec et documentation | N/A | 0 observé | 0 après validation stricte |
| Fichiers hors périmètre | 0 attendu | N/A | N/A |

## 4. Commandes

| Commande | Résultat |
|---|---|
| `node --test --test-name-pattern='rollback CABU : reprise avant liée|reprise avant CABU : un identifiant|reprise avant CABU : broker déjà déconnecté' tests/active-component-update.test.mjs` | 3 réussis / 3 |
| `node --test --test-name-pattern='restauration conserve les accès actifs conflictuels' tests/resource-coordination.test.mjs` | 1 réussi / 1 |
| `node --test --test-name-pattern='rejet natif : les reçus 2.1.67' tests/resource-coordination.test.mjs` | 1 réussi / 1 |
| `node --test tests/*.test.mjs` | 778 tests : 747 réussis, 31 ignorés, 0 échec |
| `python3 -B -m unittest discover -s tests` | 87 réussis / 87 |
| `python3 -B -m compileall -q plugins/cab-approval-bridge/broker src plugins/cab-approval-bridge/scripts tests` | Réussie |
| `node --check` updater, registre et tests concernés | Réussie |
| `git diff --check` | Réussie avant finalisation |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 17 réussis / 17 avant archivage |
| `/home/devops/.local/npm/bin/openspec archive --yes continue-cabu-forward-recovery-after-disconnect` | Archivage et synchronisation de deux exigences réussis |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 16 réussis / 16 après archivage |

## 5. Accès web

GitHub a été utilisé via le connecteur pour vérifier le dépôt distant ; la publication 2.1.70 n’était pas encore effectuée à la production de ce rapport. Aucune recherche Web ni navigation de contenu n’a été effectuée pour ce change.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Change | `continue-cabu-forward-recovery-after-disconnect`, code de lot non attribué |
| État | Archivé, 6/6 tâches ; source qualifiée en 2.1.70 |
| Résultat | La reprise du reçu enfant `ROLLBACK_FAILED` peut se poursuivre depuis un parent superseded dont la déconnexion est confirmée. Les brokers source égaux au paquet courant sont admis ; un registre à leases actives conflictuelles se restaure en préservant protections, attente des conflits et accès disjoints. |
| Publication et activation runtime | CABU est distinct de la qualification SCM ; l’activation 2.1.70 reste à vérifier |
