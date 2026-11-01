### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent de codage identifiable — session SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex (rôle observé ; version télémétrique absente) | N/A | OpenAI | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

Session SCM directe, change `reconcile-rejected-operations-for-unused-test-leases`, release CAB 2.1.41. Aucune session de codage OpenCode n’a été utilisée pour l’implémentation. Les décisions CAB du broker ne sont pas des décisions de développeur dans cette session.

| Borne | Valeur |
|---|---|
| Début | N/A — horodatage initial absent |
| Fin après archivage | 2026-11-01 17:41 Europe/Paris |
| Durée globale | N/A — borne de début absente |
| Approbations/refus | N/A — aucun outil de mesure applicable à cette session SCM |

## 2. Types de messages et d’outils

| Mesure | Valeur |
|---|---:|
| Messages utilisateur / assistant ventilés par phase | N/A — agrégat natif de session indisponible |
| Appels d’outils par famille | N/A — agrégat natif de session indisponible |
| Appels de commandes | N/A — agrégat natif de session indisponible |

Les résultats de commandes de validation sont consignés dans la section 4 ; ils ne sont pas déduits du nombre d’appels d’outils.

## 3. Fichiers modifiés

Le changement aligne les versions courantes CAB/CABU en 2.1.41, ajoute la preuve stricte des opérations de validation rejetées sans permission native, borne les wrappers d’observation Code Mode et rend la preview de récupération diagnostique sans jeton.

| Fichiers principaux |
|---|
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` |
| `tests/concurrent-controller.test.mjs` |
| `tests/resource-coordination.test.mjs` |
| `openspec/specs/concurrent-run-coordination/spec.md` |
| `DEVELOPMENT_MAP.md` |

Les chemins complets, y compris les fichiers versionnés d’alignement et de test, sont disponibles dans le commit SCM. `DEVOPS.md` généré localement n’est pas inclus.

## 4. Commandes

| Vérification | Réussies | Échouées | Ignorées | Total | Part réussite |
|---|---:|---:|---:|---:|---:|
| Suite Node complète | 679 | 0 | 31 | 710 | 95,6 % |
| Suite Python | 83 | 0 | 0 | 83 | 100 % |
| `openspec validate --all --strict` | 17 | 0 | 0 | 17 | 100 % |
| Tests ciblés coordination et contrôleur | 198 | 0 | 0 | 198 | 100 % |
| `git diff --check` | N/A | 0 | 0 | N/A | N/A |

L’archivage de la spécification a été réalisé après les suites. La publication SCM et CABU 2.1.41 restent à vérifier ; les cases de livraison ne sont pas déclarées terminées à ce relevé.

## 5. Accès web

Aucune recherche web n’a été effectuée. Aucun appel d’API de recherche n’est attribué à cette session SCM.

## 6. Synthèse globale

| Mesure du quota Codex sur 7 jours | Horodatage | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant | N/A — relevé initial absent | N/A | N/A |
| Après | N/A — outil de quota non interrogé pour ce change | N/A | N/A |
| Différence | — | N/A | — |

Bilan au 2026-11-01 17:41 Europe/Paris : 679/710 tests Node passent (31 ignorés, aucun échec), Python passe 83/83 et OpenSpec strict passe 17/17. La spécification est archivée ; publication SCM et activation CABU restent à accomplir. Aucun secret n’a été lu ou rapporté.
