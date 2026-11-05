# Statistiques SCM — réconciliation de l'attente PLLM

## 1. Statistiques générales et décisions

| Mesure | Résultat |
|---|---|
| Projet et profil | CAB, session SCM directe ; aucun pilotage CAB/OpenCode démarré. |
| Change | `reconcile-pllm-waiting-policy`, archivé le 27 octobre 2026 sous `2026-10-27-reconcile-pllm-waiting-policy`. |
| Tâches | 6 tâches élémentaires validées sur 6, selon `tasks.md`. |
| Modèle, durée exacte et consommation | `N/A` — aucune mesure attribuable de façon exhaustive à ce change n'a été conservée. |
| Décision | Archivage explicite autorisé par le développeur ; références déjà synchronisées, donc `specsUpdated=false`. Aucune activation de composant. |

## 2. Types de messages et d'outils

| Activité | Mesure et limites |
|---|---|
| Mandats CAB/OpenCode | 0 ; session directe, aucune permission native sollicitée. |
| Tests de code | Suite documentaire Node : 24 réussis, 0 échoué, 0 ignoré sur l'état final vérifié. Contrôles ciblés exécutés séparément et non ajoutés au total de la suite. |
| Validations OpenSpec | 15 éléments validés sur 15 en mode standard, puis 15/15 en mode strict ; inclut 14 spécifications et le change avant son archivage. Le change ciblé strict a aussi réussi. |
| Syntaxe | `node --check tests/controller-service-distribution.test.mjs` réussi ; l'exécution finale de la suite a suivi la dernière édition du test. |
| Compteurs complets de messages, commandes et outils du change | `N/A` — télémétrie exhaustive non disponible ; aucune extrapolation à partir des seules commandes conservées. |

Le test documentaire a échoué une fois avant la réconciliation et a détecté
l'ancienne obligation de réessai. Après correction, les deux tests ciblés ont
réussi. Cet échec initial est une preuve de détection ; il n'est pas inclus
dans le bilan de la suite finale.

## 3. Fichiers modifiés

| Périmètre | Fichiers |
|---|---|
| Spécifications canoniques mises à jour | `openspec/specs/persistent-job-supervision/spec.md`, `openspec/specs/archive-session-statistics/spec.md`, `openspec/specs/codex-integration-distribution/spec.md` |
| Test et historique mis à jour | `tests/controller-service-distribution.test.mjs`, `CHANGELOG.md` |
| Artefacts du change archivés | `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, et trois deltas sous `specs/` |
| Rapport d'archive | `openspec/changes/archive/2026-10-27-reconcile-pllm-waiting-policy/STATISTIQUES.md` |
| Composants exécutables | Aucun modifié ; contrôle d'intégrité antérieur : les sources runtime observées sont restées identiques. |

Au total, cinq fichiers préexistants ont été mis à jour, sept artefacts du
change ont été archivés et ce rapport a été créé. Les 459 fichiers Markdown,
JSON et YAML contrôlés dans les archives ainsi que leur inventaire sont restés
identiques. Git n'a pas été inspecté.

## 4. Commandes et validations

| Contrôle | Résultat observé |
|---|---|
| `/home/devops/.local/npm/bin/openspec validate reconcile-pllm-waiting-policy --strict --no-interactive --json` | Réussi, aucun diagnostic. |
| `/home/devops/.local/npm/bin/openspec validate --all --no-interactive --json` | Réussi, 15/15 éléments, aucun diagnostic. |
| `/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive --json` | Réussi, 15/15 éléments, aucun diagnostic. |
| `/home/devops/node/current/bin/node --test tests/controller-service-distribution.test.mjs` | Réussi, 24 tests, 0 échec, 0 ignoré. |
| `/home/devops/node/current/bin/node --check tests/controller-service-distribution.test.mjs` | Réussi. |
| Contrôle final UTF-8/LF, concordance delta/références, empreintes des archives et des fichiers protégés | Réussi avant l'archivage ; les références canoniques correspondaient exactement aux exigences ADDED/MODIFIED et les exigences REMOVED étaient absentes. |
| Archivage OpenSpec avec `--skip-specs` | Réussi ; `specsUpdated=false`, car les références avaient déjà été synchronisées et vérifiées. |

La production et la relecture de ce rapport ont été effectuées après
l'archivage, comme requis. Aucun contrôle applicatif runtime, test navigateur,
construction ou test conteneurisé n'était applicable aux modifications
exclusivement documentaires.

## 5. Accès web et ressources externes

| Ressource | Résultat |
|---|---|
| Recherche web ou API externe | `N/A` — aucun accès externe utilisé. |
| Benchmark fournisseur, quotas ou prévol de modèle | `N/A` — aucun benchmark ni quota mesuré pendant cette session directe. |
| Services, broker MCP et OpenCode | Aucun démarrage, arrêt, rechargement ou activation effectué. |
| Secrets ou configuration privée | Aucune donnée secrète consultée ou exposée. |

## 6. Synthèse globale

Les exigences d'attente PLLM, de checkpoint et de traitement des échéances
anciennes sont réconciliées. Les sondes statistiques restent indépendantes ;
le contrôle documentaire couvre maintenant les trois spécifications courantes
et exclut les archives historiques. La suite documentaire finale et les
validations OpenSpec standard et strictes ont réussi. Le change est archivé et
son rapport à six sections est présent. Aucun composant n'a été activé.

Les six sections, l'encodage UTF-8/LF et les totaux de validation ont été
vérifiés. Les mesures sans données exhaustives sont indiquées `N/A` avec leur
motif.
