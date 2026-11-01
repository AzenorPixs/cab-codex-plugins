### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent de codage identifiable — session SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex (rôle observé ; version télémétrique absente) | N/A | OpenAI | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

Session SCM directe du change `normalize-literal-request-validation-codemode`. Durée calendaire : N/A, horodatage de début absent. Aucun agent de codage OpenCode ni RUN piloté n'a été identifié. Les sondes de performance n'étaient pas activées ; TTMT, débit, tokens de production, cache et coût sont N/A.

| Validation | Réussite | Échec | Ignoré | Total | Part réussite |
|---|---:|---:|---:|---:|---:|
| Client Code Mode et client V2 | 53 | 0 | 1 | 54 | 98,1 % |
| Contrôleur concurrent (copie isolée sans le change de redaction) | 148 | 0 | 0 | 148 | 100 % |
| Distribution CAB (copie isolée) | 32 | 0 | 0 | 32 | 100 % |
| Arrêt des services CAB (checkout du projet) | 6 | 0 | 0 | 6 | 100 % |
| Tests Python | 83 | 0 | 0 | 83 | 100 % |
| OpenSpec strict (copie isolée sans le change de redaction) | 17 | 0 | 0 | 17 | 100 % |
| OpenSpec archivé strict après clôture | 111 | 0 | 0 | 111 | 100 % |
| Suite JavaScript complète dans le checkout réel | 669 | 0 | 31 | 700 | 95,6 % |

La suite JavaScript complète dans le checkout réel est passée : 669 réussites, 0 échec et 31 tests ignorés (700 total). Le test de fermeture des services passe 6/6 dans le checkout ; son échec précédent sous `/tmp` a également été reproduit sur HEAD 2.1.38 dans ce même contexte temporaire. Le contrôleur concurrent passe 148/148 en exécution isolée.

Aucune approbation ou permission native n'a été demandée dans cette session SCM. Le change a d'abord été archivé à 4/8 ; après tests complets, publication GitHub et CABU, ses 8 tâches sont cochées. `openspec validate --archived --strict` passe 111/111 archives, dont ce change.

## 2. Types de messages et d'outils

La télémétrie de messages, parties, terminaisons, appels d'outils, approbations et refus n'est pas exposée pour cette session SCM directe. Effectifs et pourcentages : N/A. Les résultats de commandes de test et de validation sont recensés en section 4 ; ils ne sont pas assimilés à des décisions humaines.

## 3. Fichiers modifiés

Les statistiques d'écriture et les décomptes d'approbations/refus/erreurs par fichier ne sont pas disponibles ; N/A. Fichiers principaux du change :

- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs`
- `/home/devops/datas/cab/tests/opencode-v2-client.test.mjs`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/native-coding-recovery.md`
- `/home/devops/datas/cab/openspec/specs/controller-transport/spec.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-11-01-normalize-literal-request-validation-codemode/`

Les versions communes CAB/CABU et les assertions associées ont été mises à jour en 2.1.39. Aucun déplacement métier n'a été effectué hors de l'archivage OpenSpec indiqué ci-dessus.

## 4. Commandes

| Famille de commandes | Réussies | Échouées | Ignorées | Total | Part réussite |
|---|---:|---:|---:|---:|---:|
| Tests Node ciblés | 148 | 0 | 1 | 149 | 99,3 % |
| Tests Node complets dans le checkout | 669 | 0 | 31 | 700 | 95,6 % |
| Tests Python | 83 | 0 | 0 | 83 | 100 % |
| OpenSpec strict isolé | 17 | 0 | 0 | 17 | 100 % |
| OpenSpec strict des archives après clôture | 111 | 0 | 0 | 111 | 100 % |
| Compilation Python des modules versionnés | N/A | 0 | 0 | N/A | N/A |
| Contrôle `git diff --check` | 1 | 0 | 0 | 1 | 100 % |

La suite Node complète et les tests de distribution (32/32) sont passés dans le checkout. Les lignes de commande intégrales et durées par commande ne sont pas conservées dans une télémétrie exploitable ; N/A.

## 5. Accès web

Aucune navigation web ni recherche web n'a été effectuée. L'API GitHub a servi à lire la branche/manifests et publier deux commits ; aucun compteur d'appels par opération n'est conservé par le connecteur. URL de pages visitées dans un navigateur : 0.

## 6. Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — horodatage initial absent |
| Fin — après archivage | 2026-11-01 16:03:50 Europe/Paris |
| Durée globale (pauses et attentes incluses) | N/A — borne de début absente |

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — relevé initial absent | N/A | N/A |
| Après — après archivage de la spécification | 2026-11-01 15:42:45 Europe/Paris | 15 % | 2026-11-07 11:36:34 Europe/Paris |
| Différence après − avant | — | N/A — relevé initial absent | — |

Le quota est partagé par le compte ; la valeur observée après archivage peut inclure d'autres tâches et n'est pas attribuée à ce change.

Bilan : suite JavaScript 669/700 (0 échec, 31 ignorés), Python 83/83, OpenSpec specs 16/16 et archives strictes 111/111. Les deux changes sont archivés et leurs 8/8 tâches sont cochées. Commits locaux `a63ede8` et `16ce0d2` ; commits GitHub `53e49a8` et `f7af64d`, arbre distant identique au checkout. CABU `update-c5c3bef3-fc09-46a8-b272-bb6a643ab6de` terminé ; contrôleur, superviseur, moniteur et broker READY en 2.1.39 ; CAB/CABU globales 2.1.39. Aucun secret n'a été lu ou rapporté.
