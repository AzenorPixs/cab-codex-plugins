### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent de codage identifiable — session SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex (rôle observé ; version télémétrique absente) | N/A | OpenAI | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

Session SCM directe, change `redact-test-reservation-tokens-from-reads`, release source 2.1.39 commune avec le change Code Mode. Durée calendaire : N/A, horodatage de début absent. Aucun agent de codage OpenCode ni RUN piloté n'a été identifié. Les sondes de performance n'étaient pas activées ; TTMT, débit, tokens de production, cache et coût sont N/A.

| Validation | Réussite | Échec | Ignoré | Total | Part réussite |
|---|---:|---:|---:|---:|---:|
| Suite JavaScript complète dans le checkout réel | 669 | 0 | 31 | 700 | 95,6 % |
| Tests Python | 83 | 0 | 0 | 83 | 100 % |
| OpenSpec strict avant archivage | 17 | 0 | 0 | 17 | 100 % |

La suite JavaScript complète inclut les assertions GET qui vérifient l'absence du champ bearer `token` dans les projections publiques et l'absence de sa valeur dans les réponses. Les réponses POST d'acquisition restent testées. Aucun jeton réel n'a été lu ou recopié. Au premier statut post-archivage, ce change comptait 4/8 tâches : l'archive est présente mais la livraison SCM n'est pas attestée.

Aucune approbation ou permission native n'a été demandée dans cette session SCM. L'archivage OpenSpec a été exécuté le 1er novembre 2026 ; ce rapport est le suivi post-archive et ne vaut pas commit, publication ou activation.

## 2. Types de messages et d'outils

La télémétrie de messages, parties, terminaisons, appels d'outils, approbations et refus n'est pas exposée pour cette session SCM directe. Effectifs et pourcentages : N/A. Les résultats de commandes de test et validation sont recensés en section 4 ; ils ne sont pas assimilés à des décisions humaines.

## 3. Fichiers modifiés

Les statistiques d'écriture et les décomptes d'approbations/refus/erreurs par fichier ne sont pas disponibles ; N/A. Fichiers principaux de ce change :

- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `/home/devops/datas/cab/tests/concurrent-controller.test.mjs`
- `/home/devops/datas/cab/openspec/specs/concurrent-run-coordination/spec.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-11-01-redact-test-reservation-tokens-from-reads/`

Les projections GET omettent le jeton des réservations de test, sans changer l'état interne ni les gardes. Les réponses POST d'acquisition conservent le jeton destiné au demandeur autorisé.

## 4. Commandes

| Famille de commandes | Réussies | Échouées | Ignorées | Total | Part réussite |
|---|---:|---:|---:|---:|---:|
| Suite Node complète | 669 | 0 | 31 | 700 | 95,6 % |
| Tests Python | 83 | 0 | 0 | 83 | 100 % |
| OpenSpec strict | 17 | 0 | 0 | 17 | 100 % |
| Compilation Python des modules versionnés | N/A | 0 | 0 | N/A | N/A |
| Contrôle `git diff --check` | 1 | 0 | 0 | 1 | 100 % |

Aucun échec technique observé dans la suite complète du checkout réel. Les commandes intégrales et durées par commande ne sont pas conservées dans une télémétrie exploitable ; N/A.

## 5. Accès web

Aucun accès web n'a été effectué. Requêtes, approbations, refus, erreurs et URL visitées : 0. Aucune URL refusée ou visitée n'est à rapporter.

## 6. Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — horodatage initial absent |
| Fin — après archivage | 2026-11-01 15:49:50 Europe/Paris |
| Durée globale (pauses et attentes incluses) | N/A — borne de début absente |

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — relevé initial absent | N/A | N/A |
| Après — après archivage de la spécification | 2026-11-01 15:49:50 Europe/Paris | 15 % | 2026-11-07 11:36:34 Europe/Paris |
| Différence après − avant | — | N/A — relevé initial absent | — |

Le quota est partagé par le compte ; la valeur observée après archivage peut inclure d'autres tâches et n'est pas attribuée à ce change.

Bilan : les suites exécutées passent ; le change est archivé avec ses tâches de livraison encore en cours. Rapport vérifié en UTF-8/LF avec six sections. Commit/publication SCM et CABU restent à exécuter. Aucun secret n'a été lu ou rapporté.
