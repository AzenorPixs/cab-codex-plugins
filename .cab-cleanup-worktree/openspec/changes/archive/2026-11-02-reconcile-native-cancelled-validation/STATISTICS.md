### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent OpenCode identifié | N/A | N/A | N/A | N/A | N/A | N/A — correctif SCM direct |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex direct | N/A — version exacte non relevée | OpenAI | N/A | N/A | N/A | N/A — télémétrie d’agent non collectée |

## 1. Statistiques générales et décisions

| Mesure | Valeur | Part / cause |
|---|---:|---|
| Durée calendaire | N/A | Heure de début SCM non instrumentée |
| Messages, appels, décisions, tokens, cache et coût | N/A | Export exhaustif de session absent |
| Tests Node ciblés contrôleur + moniteur | 215 réussis / 215 | 100 % ; aucun échec |
| Tests Python | 87 réussis / 87 | 100 % ; aucun échec |
| Tests distribution de service | 33 réussis / 33 | 100 % ; aucun échec |
| OpenSpec strict après archivage | 19 réussis / 19 | 100 % ; aucun échec |
| Suite Node globale | 759 réussis, 2 échecs, 31 ignorés / 792 | Les deux échecs étaient des expirations d’attente du démarrage de tests existants ; les tests ciblés passent |
| Syntaxe Python et diff | Réussis | `py_compile` sur les six modules Python modifiés et `git diff --check` |
| Décisions humaines CAB / refus de permission | N/A | SCM direct, sans télémétrie de décision |

## 2. Types de messages et d’outils

N/A — aucun export exhaustif des rôles, parties, terminaisons, appels ou décisions. Les nombres ne sont pas extrapolés depuis les sorties de test.

## 3. Fichiers modifiés

Les écritures sont partagées avec l’alignement de la version 2.1.72. Le journal exhaustif des tentatives par fichier n’est pas disponible ; les nombres d’écritures, refus et erreurs sont donc N/A.

| Chemin absolu lié à cette archive | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/tests/concurrent-controller.test.mjs` | N/A | N/A | N/A |
| `/home/devops/datas/cab/openspec/specs/opencode-v2-transport/spec.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-native-cancelled-validation/proposal.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-native-cancelled-validation/design.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-native-cancelled-validation/tasks.md` | N/A | N/A | N/A |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-native-cancelled-validation/specs/opencode-v2-transport/spec.md` | N/A | N/A | N/A |

## 4. Commandes

| Commande de vérification | Résultat |
|---|---|
| `node --test --test-concurrency=1 tests/concurrent-controller.test.mjs tests/web-monitor.test.mjs` | 215/215 réussis |
| `node --test tests/controller-service-distribution.test.mjs` | 33/33 réussis |
| `python3 -m pytest -q tests` | 87/87 réussis |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive` | 19/19 réussis |
| `python3 -m py_compile` sur les modules broker source et distribués | Réussi |
| `git diff --check` | Réussi |
| `node --test --test-concurrency=1 tests/*.test.mjs` | 759 réussis, 2 échecs d’attente de démarrage, 31 ignorés |

Les décomptes de commandes par famille et les tentatives de commandes métier sont N/A : cette intervention était un SCM direct sans export exhaustif. Aucun effet métier ni RUN n’a été exécuté par ces commandes de validation.

## 5. Accès web

0 accès web approuvés, 0 refusés, 0 en erreur. Aucune URL visitée.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Date | 2 novembre 2026, Europe/Paris |
| Durée globale de session | N/A — heure de début SCM non relevée |
| Quota Codex avant / après | N/A — collecte non applicable au SCM direct |
| Version commune préparée | 2.1.72 |
| Archive OpenSpec | `2026-11-02-reconcile-native-cancelled-validation` |
| Résultat du change | Une annulation native `CANCELLED/cancelled_by=OC` peut clore la même opération préparée après double lecture stable, session inactive et absence d’accès/permission/once ; aucune décision n’est créée. |
| Tests ciblés | 215/215 Node, 87/87 Python, 33/33 distribution, 19/19 OpenSpec strict |
| Suite Node globale | 759/792 réussis, 2 expirations d’attente au démarrage, 31 ignorés |
| GitHub et CABU | Non exécutés à l’horodatage de ce rapport ; restent les étapes SCM et activation du lot |
| RUN, permissions, once et services métier | Aucun n’a été modifié par le correctif source ou l’archivage |
| Secrets | Aucun secret lu, inclus ou exposé |

Les résultats globaux Node sont rapportés sans assimiler les expirations de tests de démarrage à un refus de permission ni à un échec fonctionnel du correctif. Les tests ciblés concernés ont tous réussi.
