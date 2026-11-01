### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent de codage identifiable — session SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex (rôle observé ; version télémétrique absente) | N/A | OpenAI | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

Session SCM directe, change `prove-unused-test-lease-after-history-compaction`, release CAB 2.1.42. Aucun agent de codage OpenCode n’a été identifié pour l’implémentation.

| Borne | Valeur |
|---|---|
| Début | N/A — horodatage initial absent |
| Fin après archivage | 2026-11-01 18:01 Europe/Paris |
| Durée globale | N/A — borne de début absente |
| Approbations/refus | N/A — outil de mesure non applicable à cette session SCM |

## 2. Types de messages et d'outils

| Mesure | Valeur |
|---|---:|
| Messages utilisateur / assistant ventilés par phase | N/A — agrégat natif de session indisponible |
| Appels d’outils par famille | N/A — agrégat natif de session indisponible |
| Appels de commandes | N/A — agrégat natif de session indisponible |

Les validations sont rapportées dans la section 4 ; elles ne sont pas déduites du nombre d’appels d’outils.

## 3. Fichiers modifiés

Le change étend la récupération d’un bail de test inutilisé après compaction : le contrôleur peut s’appuyer sur le registre durable uniquement lorsque les opérations pertinentes sont toutes classées sans démarrage natif, aucun accès ou permission ne reste actif, et la frontière est stable. Les effets inconnus restent bloquants.

| Fichiers principaux |
|---|
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` |
| `tests/concurrent-controller.test.mjs` |
| `openspec/specs/concurrent-run-coordination/spec.md` |
| `DEVELOPMENT_MAP.md` |

`DEVOPS.md` généré localement n’est pas inclus.

## 4. Commandes

| Vérification | Réussies | Échouées | Ignorées | Total | Part réussite |
|---|---:|---:|---:|---:|---:|
| Suite Node complète | 681 | 0 | 31 | 712 | 95,6 % |
| Suite Python | 83 | 0 | 0 | 83 | 100 % |
| `openspec validate --all --strict` | 17 | 0 | 0 | 17 | 100 % |
| `openspec validate --archived --strict` | 114 | 0 | 0 | 114 | 100 % |
| Tests ciblés compaction ledger-only et refus natif | 2 | 0 | 0 | 2 | 100 % |
| `git diff --check` | N/A | 0 | 0 | N/A | N/A |

Le code source est publié sur `main` dans le commit `4cca176203e209d9306320efb03534ff32d09cef`. CABU 2.1.42 a terminé ; le contrôleur, superviseur, monitor et broker sont en version 2.1.42 et les trois services sont actifs.

## 5. Accès web

Aucune recherche web n’a été effectuée. Aucun appel d’API de recherche n’est attribué à cette session SCM.

## 6. Synthèse globale

| Mesure du quota Codex sur 7 jours | Horodatage | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant | N/A — relevé initial absent | N/A | N/A |
| Après | N/A — outil de quota non interrogé pour ce change | N/A | N/A |
| Différence | — | N/A | — |

Bilan au 2026-11-01 18:05 Europe/Paris : 681/712 tests Node passent (31 ignorés, aucun échec), Python passe 83/83, OpenSpec strict passe 17/17 et les 114 archives passent leur validation stricte. Le change est publié et CABU 2.1.42 a terminé ; ses quatre versions et l’état actif des trois services sont vérifiés. Aucun secret n’a été lu ou rapporté.
