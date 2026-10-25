## 1. Spécification

- [x] 1.1 Définir les exigences controller-transport et approval-workflow et valider le change en mode strict.
- [x] 1.2 Couvrir l'alignement 1.4.0 et la garde d'opération consommée par les deltas de distribution, coordination et statistiques natives.

## 2. Implémentation

- [x] 2.1 Résoudre et valider la configuration au démarrage puis appliquer le contrôle partagé avant enregistrement.
- [x] 2.2 Restituer le refus HTTP structuré et filtrer son diagnostic dans la notification broker.
- [x] 2.3 Documenter la variable, le comptage, le refus et le repli à 2000.
- [x] 2.4 Aligner toutes les briques et les références courantes sur 1.4.0 et synchroniser le seul bloc de concurrence embarqué.
- [x] 2.5 Écarter les opérations consommées/invalidées avant admission et vérifier l'absence de réinscription après plusieurs sondages.

## 3. Qualification et clôture

- [x] 3.1 Vérifier les bornes, Unicode, configuration et routes, puis l'absence d'effets au refus.
- [x] 3.2 Vérifier la commande longue exacte, décision corrélée, once unique et diagnostics broker filtrés.
- [x] 3.3 Exécuter syntaxe, régressions applicables et contrôles OpenSpec/documentaires.
- [x] 3.4 Vérifier l'éligibilité du seul change à la synchronisation et à l'archivage.

Après ces validations, la clôture autorisée comprend la synchronisation, l'archivage du seul change et la production/vérification de STATISTIQUES.md dans son archive.

## Qualification source du 20 octobre 2026

La livraison source est qualifiée sur CAB 1.4.0. Le périmètre couvre la limite configurable, le diagnostic filtré, l'invariant commande exacte/décision corrélée/once unique, l'incrément de 0.1.0 de toutes les briques, le seul bloc de concurrence du protocole local et la garde des opérations consommées. Aucun schéma de données ni identifiant de protocole n'est modifié ; aucune installation, publication ou migration active n'est effectuée.

### Résultats finaux

| Validation | Résultat |
| --- | --- |
| Node, toutes les suites MJS en série | 235 tests recensés : 234 réussis, zéro échec, un ignoré (OpenCode réel opt-in absent). |
| Python, découverte des tests | 59 réussis, zéro échec. |
| Total distinct | 293 tests réussis, un ignoré ; les relances ne sont pas additionnées. |
| Syntaxe | 25 fichiers Python/MJS contrôlés avec succès. |
| Versions | 17 sources annoncent 1.4.0 ; commande, unités et manifeste alignés, cachebuster neuf. |
| Protocole embarqué | Référence distribuée exacte avec titres décalés ; préfixe et suffixe conservés. |

Commandes de référence :

- `/home/devops/node/current/bin/node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : exécutée et réussie, code 0.
- `/home/devops/python/current/bin/python3 -m unittest discover -s tests -p 'test_*.py'` : exécutée et réussie, code 0 après alignement 1.4.0.
- `node --check` et `py_compile` avec les runtimes DEVOPS : exécutés et réussis sur les sources distribuées et les huit suites modifiées.
- `/home/devops/.local/npm/bin/openspec validate configure-controller-command-length-limit --strict --no-interactive` : exécutée et réussie après les derniers deltas.

### Échecs intermédiaires et corrections

Les premières nouvelles fixtures ont été corrigées : GET 404 vide traité sans JSON forcé, commande native divergente placée avant l'approbation pour éviter une permission exacte admissible dans l'intervalle, et attente HTTP 400 existante pour une seconde décision, avec décision initiale inchangée vérifiée.

Le test de distribution a révélé le bloc local CAB 1.0.0 divergent de la référence distribuée. Sa synchronisation ciblée est faite. La réconciliation historique n'était pas seulement un aléa de fixture : transmitApprovedOperation appelait une admission à effet de bord avant d'écarter une opération consommée. Le nouveau test, après trois sondages, échoue avant correction avec une session réinscrite puis réussit avec la garde corrigée. La fixture de supervision attend désormais au plus cinq secondes au lieu de deux secondes et demie la première émission, sans modifier ses assertions ni les délais de production. La dernière suite globale est entièrement verte hors scénario réel explicitement ignoré.

### Bilan documentaire

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé ; aucune règle d'agent supplémentaire. |
| PROJECT.md | Mis à jour : version de référence et vues courantes 1.4.0, architecture préservée. |
| TECHNICAL.md | Mis à jour : version 1.4.0, section 15, limites et diagnostic, garde avant admission. |
| BUILD.md | Mis à jour : jeu de distribution courant 1.4.0, sans installation ni nouveau format. |
| DEVOPS.md | Inchangé ; runtimes et index des prompts de référence utilisés. |
| README.md | Mis à jour : version, configuration, comptage, refus et compatibilité. |
| CHANGELOG.md | Entrée 1.4.0 de préparation source ; historique 1.3.0 et antérieur conservé. |
| openspec/specs/ | Cinq capacités couvertes par les deltas ; synchronisation confiée à l'archivage validant. |
| ORCHESTRATED_CODING.md | Seul bloc de concurrence remplacé, aligné sur la référence 1.4.0 ; contenu extérieur conservé. |

Les sources exclues et les états CAB actifs n'ont pas été utilisés. Les transports des tests sont simulés et les workspaces temporaires isolés. Le scénario OpenCode réel n'a pas été exécuté : aucun succès de production n'est revendiqué. Lint, typage et construction tiers sont non pertinents au périmètre : aucune configuration de ces contrôles ni dépendance tierce n'est définie pour les scripts concernés.
