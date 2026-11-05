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
| Node.js — suite complète | 772 tests : 741 réussis, 31 ignorés, 0 échec | 96,0 % réussis ; 4,0 % ignorés |
| Contrôleur — nouveaux scénarios ciblés | 2 réussis / 2 | Reprise après redémarrage et refus des preuves divergentes |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| Compilation Python | Réussie | `compileall` sur broker, src, scripts et tests |
| OpenSpec strict avant archivage | 17 réussis / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussis / 16 | 100 % ; 0 échec |
| Validation stricte des archives | 131 réussies / 131 | 100 % ; 0 échec |
| Versions CAB/CABU/plugins/commandes | 2.1.67 communes | Cachebuster commun : `codex.20261102043420` |
| Publication et activation runtime | En cours après archivage | Vérifiées séparément dans le rapport SCM/CABU |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons ou décisions. Les appels synthétiques des tests ne sont pas attribués à une session de production.

## 3. Fichiers modifiés

Les changements portent sur la preuve de rejet natif du contrôleur, la décision terminale durable du job-context et du registre, leurs tests positifs et négatifs, les spécifications de transport et de coordination, la documentation CAB, les commandes distribuées et la version commune.

| Famille | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| Contrôleur et restauration de décision | N/A | N/A | 0 après validation complète |
| Registre des opérations terminales | N/A | 0 effet natif créé | 0 après validation complète |
| Tests positifs et négatifs | N/A | 14 variantes négatives attendues | 0 après validation complète |
| OpenSpec et documentation | N/A | 0 observé | 0 après validation stricte |
| Fichiers hors périmètre | 0 attendu | N/A | N/A |

## 4. Commandes

| Commande | Résultat |
|---|---|
| `node --test --test-name-pattern='rejet natif|restaure une approbation|une fin durable|un journal durable' tests/concurrent-controller.test.mjs` | 5 réussis / 5 |
| `node --test tests/controller-service-distribution.test.mjs` | 33 réussis / 33 |
| `node --test tests/*.test.mjs` | 772 tests : 741 réussis, 31 ignorés, 0 échec |
| `python3 -B -m unittest discover -s tests` | 87 réussis / 87 |
| `python3 -B -m compileall -q plugins/cab-approval-bridge/broker src plugins/cab-approval-bridge/scripts tests` | Réussie |
| `node --check` sur controller, job-context et resource-coordination | Réussie pour les trois fichiers |
| `git diff --check` | Réussie |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 17 réussis / 17 avant archivage |
| `/home/devops/.local/npm/bin/openspec archive --yes reconcile-persisted-native-rejections` | Archivage et synchronisation des trois exigences réussis ; avertissement de sections de proposition corrigé ensuite |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 16 réussis / 16 après archivage |
| `/home/devops/.local/npm/bin/openspec validate --archived --strict --no-interactive` | 131 réussis / 131 |

Une première exécution complète a révélé des attentes de test de distribution restées à 2.1.66 ; elles ont été alignées sur 2.1.67. La suite sérielle finale a terminé sans échec.

## 5. Accès web

La branche GitHub `main` et les manifestes CAB/CABU ont été consultés en HTTPS pour vérifier la version de référence 2.1.66 avant le changement. Aucune autre recherche Web n’a été effectuée.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Change | `reconcile-persisted-native-rejections`, code de lot non attribué |
| État | Archivé, 6/6 tâches ; source qualifiée en 2.1.67 |
| Résultat | Après deux lectures identiques du transcript exact et quiescent, le rejet `CGPT` terminal est persisté atomiquement avec son empreinte et `CANCELLED`. Les identités divergentes, états non terminaux, outils additionnels, sessions actives et permissions empêchent la clôture. Le même reçu se restaure après redémarrage sans appel natif, accès ni `once`. |
| Publication et activation runtime | CABU est distinct de la qualification SCM ; résultat consigné après activation vérifiée |
