### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent de codage identifiable — session SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex (rôle observé ; version télémétrique absente) | N/A | OpenAI | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

Session SCM directe, change `formalize-idempotent-test-reservation-recovery`, release CAB 2.1.40. Durée calendaire : N/A, horodatage de début absent. Aucun agent de codage OpenCode ni RUN piloté n'a été identifié pour l'implémentation. Les sondes de performance n'étaient pas activées ; TTMT, débit, tokens de production, cache et coût sont N/A.

| Validation | Réussite | Échec | Ignoré | Total | Part réussite |
|---|---:|---:|---:|---:|---:|
| Suite JavaScript complète dans le checkout réel | 674 | 0 | 31 | 705 | 95,6 % |
| Coordination des ressources de test | 42 | 0 | 0 | 42 | 100 % |
| Contrôleur concurrent | 150 | 0 | 0 | 150 | 100 % |
| Distribution CAB | 32 | 0 | 0 | 32 | 100 % |
| Tests Python | 83 | 0 | 0 | 83 | 100 % |
| OpenSpec strict avant archivage | 17 | 0 | 0 | 17 | 100 % |

Les 31 tests ignorés sont les cas natifs conditionnels prévus par la suite ; aucun test n'a échoué. Aucun POST de reprise, aucune réconciliation de bail et aucune commande LXC n'ont été exécutés pendant la qualification du code.

L'archive OpenSpec a été créée alors que 4/8 tâches étaient cochées. Le rapport est produit après l'archivage ; il ne prouve pas les étapes SCM restantes. Aucune permission ou décision native n'a été demandée par cette session SCM.

## 2. Types de messages et d'outils

La télémétrie de messages, parties, terminaisons, appels d'outils, approbations et refus n'est pas exposée pour cette session SCM directe. Effectifs et pourcentages : N/A. Les résultats des tests et validations sont recensés en section 4 ; ils ne sont pas assimilés à des décisions humaines.

## 3. Fichiers modifiés

Les statistiques d'écriture et les décomptes d'approbations/refus/erreurs par fichier ne sont pas disponibles ; N/A. Fichiers principaux de ce change :

- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md`
- `/home/devops/datas/cab/tests/resource-coordination.test.mjs`
- `/home/devops/datas/cab/tests/concurrent-controller.test.mjs`
- `/home/devops/datas/cab/openspec/specs/concurrent-run-coordination/spec.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-11-01-formalize-idempotent-test-reservation-recovery/`

Le change formalise la récupération par réacquisition POST exacte et ajoute une restitution tokenless à effet nul, seulement pour un bail restauré rattaché au même change armé et après preuve native complète. Les GET restent sans jeton.

## 4. Commandes

| Famille de commandes | Réussies | Échouées | Ignorées | Total | Part réussite |
|---|---:|---:|---:|---:|---:|
| Suite Node complète | 674 | 0 | 31 | 705 | 95,6 % |
| Tests Python | 83 | 0 | 0 | 83 | 100 % |
| OpenSpec strict avant archivage | 17 | 0 | 0 | 17 | 100 % |
| Compilation Python des modules versionnés | N/A | 0 | 0 | N/A | N/A |
| Contrôle `git diff --check` | N/A | 0 | 0 | N/A | N/A |

La suite complète, les tests ciblés de coordination (42/42), contrôleur (150/150) et distribution (32/32) passent dans le checkout réel. Aucun test avec un environnement LXC réel n'a été lancé.

## 5. Accès web

Aucune navigation web ni recherche web n'a été effectuée. L'API GitHub a servi aux lectures de branche/manifests et publications SCM ; le connecteur ne fournit pas de comptage d'appels ventilé. Aucune URL de page visitée dans un navigateur n'est à rapporter.

## 6. Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — horodatage initial absent |
| Fin — après archivage | 2026-11-01 16:51:21 Europe/Paris |
| Durée globale (pauses et attentes incluses) | N/A — borne de début absente |

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — relevé initial absent | N/A | N/A |
| Après — après archivage de la spécification | 2026-11-01 16:51:21 Europe/Paris | 16 % | 2026-11-07 11:36:34 Europe/Paris |
| Différence après − avant | — | N/A — relevé initial absent | — |

Le quota est partagé par le compte ; la valeur observée après archivage peut inclure d'autres tâches et n'est pas attribuée à ce change.

Bilan : 674/705 tests Node passent (31 ignorés, aucun échec), Python passe 83/83, et le change OpenSpec est présent avec son rapport post-archivage. Au relevé, commit/publication SCM et CABU 2.1.40 restent à exécuter. Aucun secret n'a été lu ou rapporté.
