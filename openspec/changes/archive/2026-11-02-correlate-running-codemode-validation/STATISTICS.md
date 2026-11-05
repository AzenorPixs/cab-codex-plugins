### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| N/A | N/A | N/A | N/A | N/A | N/A | N/A — SCM direct, aucune télémétrie d’agent de codage |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex direct | N/A — version exacte non relevée | N/A | N/A | N/A | N/A | N/A — télémétrie non collectée pour SCM |

## 1. Statistiques générales et décisions

| Mesure | Valeur | Part / cause |
|---|---:|---|
| Durée calendaire complète | N/A | Heure de début SCM non relevée |
| Messages, appels d’outils et décisions | N/A | Export exhaustif absent |
| Node.js — suite complète | 766 total : 735 réussis, 31 ignorés, 0 échec | 95,8 % réussis ; 4,0 % ignorés |
| Node.js — corrélation active Code Mode et bail disjoint | 7 réussis / 7 | Appel exact admis ; 5 variantes négatives refusées |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| Compilation Python | Réussie | `compileall` sur broker, src et scripts |
| OpenSpec strict avant archivage | 17 réussis / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussis / 16 | 100 % ; 0 échec |
| Validation stricte des archives après archivage | 129 réussies / 129 | 100 % ; 0 échec |
| Versions CAB/CABU/plugins/commandes | 2.1.65 communes | Cachebuster commun : `codex.20261102032941` |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons ou
décisions. Aucun volume n’est extrapolé à partir de sorties partielles.

## 3. Fichiers modifiés

Les changements couvrent le contrôleur, son intégration native V2, les tests
du contrôleur concurrent et les spécifications de transport/version ainsi que
les cadrages CAB. Les comptes d’accès/fichiers individuels ne sont pas mesurés.

| Famille | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| Corrélation et garde d’admission | N/A | 0 observé | 0 après validation ciblée |
| Tests d’intégration et régressions | 7 scénarios ciblés réussis | 5 variantes refusées selon attendu | 0 |
| OpenSpec et documentation | N/A | 0 observé | 0 avant archivage |
| Fichiers hors périmètre | 0 attendu | N/A | N/A |

## 4. Commandes

| Commande | Résultat |
|---|---|
| `node --test --test-reporter=tap tests/*.test.mjs` | 766 tests ; 735 réussis, 31 ignorés, 0 échec |
| `node --test --test-name-pattern='request_validation Code Mode en cours' tests/concurrent-controller.test.mjs` | 7 réussis / 7 |
| `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` | 87 réussis / 87 |
| `/home/devops/python/current/bin/python3 -m compileall -q plugins/cab-approval-bridge/broker src plugins/cab-approval-bridge/scripts` | Réussie |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 17 réussis / 17 avant archivage |
| `/home/devops/.local/npm/bin/openspec validate --archived --strict --no-interactive` | 129 réussies / 129 après archivage |
| Première validation stricte après archivage | 15 réussies / 16 | La description courante de distribution dépassait 500 caractères ; correction textuelle ciblée sans changement du comportement, puis validation finale 16/16 |
| `/home/devops/.local/npm/bin/openspec validate codex-integration-distribution --type spec --strict --no-interactive` | Réussie après correction ciblée |
| Première validation OpenSpec stricte après archive | 15 réussies / 16 | Le texte courant de distribution dépassait 500 caractères ; il a été raccourci en conservant les exigences, puis la validation finale a réussi à 16/16 |
| `/home/devops/.local/npm/bin/openspec validate codex-integration-distribution --type spec --strict --no-interactive` | Réussie après correction ciblée du texte de la spécification |

## 5. Accès web

Aucun accès web n’a été effectué pendant cette qualification SCM.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Quota Codex avant / après | N/A — relevés absents |
| Change | `correlate-running-codemode-validation`, code de lot non attribué par ACL |
| État | Archivé, 6/6 tâches ; source qualifiée, publication et activation restent distinctes |
| Version source | 2.1.65 |
| Résultat | Un appel natif `request_validation` unique en cours peut être corrélé aux identités exactes, même si le wrapper Code Mode attend encore sa réponse. Un bail restauré disjoint reste protégé et aucune permission ou once n’est créé par l’admission. Les wrappers incomplets ou divergents restent refusés. |
| Activation runtime | CABU 2.1.65 reste à effectuer après publication SCM ; activation non revendiquée dans ce rapport |
