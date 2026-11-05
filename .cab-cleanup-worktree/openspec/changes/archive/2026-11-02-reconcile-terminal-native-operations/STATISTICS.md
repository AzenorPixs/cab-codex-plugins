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
| Node.js — suite complète | 759 total : 728 réussis, 31 ignorés, 0 échec | 95,9 % réussis ; 4,1 % ignorés |
| Node.js — scénarios de récupération native | 4 réussis / 4 | Permission pendante, succès terminal durable, journal absent, journal indisponible |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| Compilation Python | Réussie | `compileall` sur broker, src et scripts |
| OpenSpec strict avant archivage | 17 réussis / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussis / 16 | 100 % ; 0 échec |
| Validation stricte des archives après archivage | 128 réussies / 128 | 100 % ; 0 échec |
| Versions CAB/CABU/plugins/commandes | 2.1.64 communes | Cachebuster commun : `codex.20261102024706` |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons ou
décisions. Aucun volume n’est extrapolé à partir de sorties partielles.

## 3. Fichiers modifiés

Les changements source couvrent le client OpenCode V2, le contrôleur, le
contexte de job, le registre de coordination, les tests unitaires et
d’intégration, les spécifications OpenSpec concernées, les commandes/plugins
versionnés, les cadrages et le journal de version. Le relevé Git des chemins
sera joint au contrôle de commit ; aucun contenu non pertinent n’est inclus.

| Famille de fichiers | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| Sources et tests du correctif | N/A | 0 observé | 0 observé après validations |
| OpenSpec et documentation | N/A | 0 observé | 0 observé avant archivage |
| Autres fichiers hors périmètre | 0 attendu | N/A | N/A |

## 4. Commandes

| Commande | Résultat |
|---|---|
| `node --test --test-reporter=tap tests/*.test.mjs` | 759 tests ; 728 réussis, 31 ignorés, 0 échec |
| `node --test tests/concurrent-controller.test.mjs` dans la suite complète | 177 réussis / 177 |
| `node --test --test-name-pattern='fin durable exacte|journal durable indisponible' tests/concurrent-controller.test.mjs` | 2 réussis / 2 |
| `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` | 87 réussis / 87 |
| `/home/devops/python/current/bin/python3 -m compileall -q plugins/cab-approval-bridge/broker src plugins/cab-approval-bridge/scripts` | Réussie |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 17 réussis / 17 avant archivage |
| `/home/devops/.local/npm/bin/openspec validate --archived --strict --no-interactive` | 128 réussies / 128 après archivage |

## 5. Accès web

Aucun accès web n’a été effectué pendant cette qualification SCM. Les
contrats de journal durable V2 consultés précédemment restent attribués à la
documentation officielle d’OpenCode.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Quota Codex avant / après | N/A — relevés absents |
| Change | `reconcile-terminal-native-operations`, code de lot non attribué par ACL |
| État | Archivé, 7/7 tâches ; maintenance des cartes et publication SCM effectuées séparément |
| Version source | 2.1.64 |
| Résultat | Un succès natif durable exactement corrélé clôt l’opération sans rejeu. Une erreur, une absence, un journal inaccessible ou une preuve incomplète conserve UNKNOWN avec accès protégé. Les accès complets compatibles non recouvrants du même RUN coexistent. |
| Activation runtime | Non revendiquée dans ce rapport ; CABU 2.1.64 reste à effectuer après publication SCM |
