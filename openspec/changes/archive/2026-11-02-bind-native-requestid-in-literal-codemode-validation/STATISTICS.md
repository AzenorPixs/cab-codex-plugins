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
| Node.js — suite complète sérielle | 770 tests : 739 réussis, 31 ignorés, 0 échec | 95,7 % réussis ; 4,0 % ignorés |
| Client OpenCode V2 — liaison du requestId natif | 2 réussis / 2 | Liaison unique et variantes négatives |
| Contrôleur — admission corrélée et bail HELD disjoint | 2 réussis / 2 | Admission exacte et identité divergente refusée |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| Compilation Python | Réussie | `compileall` sur broker, src, scripts et tests |
| OpenSpec strict avant archivage | 17 réussis / 17 | 100 % ; 0 échec |
| OpenSpec strict après archivage | 16 réussis / 16 | 100 % ; 0 échec |
| Validation stricte des archives | 130 réussies / 130 | 100 % ; 0 échec après finalisation de la checklist |
| Versions CAB/CABU/plugins/commandes | 2.1.66 communes | Cachebuster commun : `codex.20261102035640` |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, appels, terminaisons ou décisions. Les appels synthétiques des tests ne sont pas attribués à une session de production.

## 3. Fichiers modifiés

Les changements portent sur le parseur borné du client OpenCode V2, la comparaison structurelle de l’identité native du contrôleur, leurs tests positifs et négatifs, les spécifications de transport, le versionnement commun et les cadrages CAB concernés.

| Famille | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| Client Code Mode et contrôleur | N/A | N/A | 0 après validation ciblée |
| Tests de normalisation et d’admission | N/A | 7 variantes négatives attendues | 0 après validation finale |
| OpenSpec et documentation | N/A | 0 observé | 0 après validation stricte |
| Fichiers hors périmètre | 0 attendu | N/A | N/A |

## 4. Commandes

| Commande | Résultat |
|---|---|
| `node --check plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs` | Réussie |
| `node --check plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | Réussie |
| `node --test --test-name-pattern='requestId variable lié|requestId lié refuse' tests/opencode-v2-client.test.mjs` | 2 réussis / 2 |
| `node --test --test-name-pattern='request_validation Code Mode lie le requestId' tests/concurrent-controller.test.mjs` | 2 réussis / 2 |
| `node --test --test-reporter=tap tests/controller-service-distribution.test.mjs` | 33 réussis / 33 |
| `node --test --test-concurrency=1 --test-reporter=tap tests/*.test.mjs` | 770 tests : 739 réussis, 31 ignorés, 0 échec |
| `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` | 87 réussis / 87 |
| `/home/devops/python/current/bin/python3 -m compileall -q plugins/cab-approval-bridge/broker src plugins/cab-approval-bridge/scripts tests` | Réussie |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 17 réussis / 17 avant archivage |
| `/home/devops/.local/npm/bin/openspec archive --yes bind-native-requestid-in-literal-codemode-validation` | Archivage réussi et deux spécifications synchronisées ; avertissement initial sur les titres de proposition corrigé avant le contrôle final |
| Première validation OpenSpec archivée stricte | 129 réussies / 130 | Une checklist contenait des étapes post-archivage SCM ; ces étapes ont été retirées du périmètre des tâches du change |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 16 réussis / 16 après archivage |
| `/home/devops/.local/npm/bin/openspec validate --archived --strict --no-interactive` | 130 réussies / 130 |

Une première exécution Node après l’incrément a révélé cinq attentes de version de test restées à 2.1.65 ; elles ont été alignées sur 2.1.66. Deux exécutions complètes parallèles ont ensuite dépassé des délais de démarrage de contrôleurs ; les cas concernés ont réussi isolément, puis la suite entière sérielle a terminé sans échec.

## 5. Accès web

Aucun accès web n’a été effectué pendant cette qualification SCM.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date de qualification | 2 novembre 2026, Europe/Paris |
| Durée globale | N/A — heure de début non relevée |
| Change | `bind-native-requestid-in-literal-codemode-validation`, code de lot non attribué |
| État | Archivé, 9/9 tâches ; source qualifiée en 2.1.66 |
| Résultat | Un identifiant nu uniquement au champ racine `requestId` est lié à la valeur du call natif unique. L’identité complète tolère le réordonnancement des clés d’objets mais garde les valeurs et tableaux exacts. Les autres expressions, divergences, appels supplémentaires et troncatures restent bloqués. Le bail `HELD` disjoint reste protégé et aucune décision, permission ou `once` n’est créée par l’admission. |
| Activation runtime | CABU est une étape distincte de la qualification SCM ; son résultat est rapporté séparément. |
