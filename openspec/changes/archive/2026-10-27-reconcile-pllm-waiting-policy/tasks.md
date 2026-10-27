## 1. Contrat et contrôle documentaire

- [x] 1.1 Valider strictement les deltas de réconciliation autorisés.
- [x] 1.2 Compléter le contrôle documentaire croisé et constater son échec sur les anciennes règles.

## 2. Réconciliation

- [x] 2.1 Réconcilier les trois références courantes, compléter le changelog et réussir le contrôle ciblé.

## 3. Validation finale

- [x] 3.1 Réussir la syntaxe JavaScript et le fichier documentaire complet.
- [x] 3.2 Exécuter les validations OpenSpec ciblées, globales standard et strictes ; qualifier leurs résultats.
- [x] 3.3 Vérifier la revue documentaire, UTF-8/LF, le périmètre et les archives préservées.

L'archivage, les statistiques d'archive et les opérations Git sont exclus de
cette session par la demande explicite du développeur. Ces exclusions ne
constituent pas des tâches à cocher ou des validations réussies.

## Preuves

- 1.1 : `openspec validate reconcile-pllm-waiting-policy --strict --no-interactive --json`
  réussit sans diagnostic. Le premier passage a signalé deux titres de scénarios
  omis ; leurs identités historiques ont été conservées avant le succès.
- 1.2 : le nouveau test `les références OpenSpec PLLM conservent une attente
  humaine sans réessai automatique` échoue sur la prescription historique de
  `persistent-job-supervision` avant application des deltas (une exécution,
  un échec attendu, code 1). Aucun test existant n'a été affaibli.
- 2.1 : contrôle ciblé de la politique distribuée et des références courantes :
  2/2 tests réussis après réconciliation. Les trois références sont synchronisées
  avec les deltas ; les exigences supprimées sont absentes, chaque bloc ajouté
  ou modifié correspond exactement à sa référence.
- 3.1 : `/home/devops/node/current/bin/node --check tests/controller-service-distribution.test.mjs`
  réussit ; `/home/devops/node/current/bin/node --test tests/controller-service-distribution.test.mjs`
  réussit sur l'état final : 24 tests, aucun échec, aucun ignoré. Les contrôles
  ciblés recouvrent cette suite et ne s'ajoutent pas à son total.
- 3.2 : `/home/devops/.local/npm/bin/openspec validate reconcile-pllm-waiting-policy --strict --no-interactive --json`
  réussit sans diagnostic. Les commandes du même exécutable
  `validate --all --no-interactive --json` et
  `validate --all --strict --no-interactive --json` réussissent chacune sur
  15 éléments : 14 spécifications et ce change, aucun diagnostic.
- 3.3 : revue des blocs modifiés et comparaison par empreintes sans Git :
  cinq fichiers existants modifiés, sept artefacts de ce change créés ;
  49 autres fichiers suivis par le contrôle restent identiques. Les 459 fichiers
  Markdown/JSON/YAML des archives et leur inventaire sont identiques au relevé
  initial. Les fichiers modifiés et créés sont UTF-8/LF avec une fin de ligne finale.

## Revue documentaire finale

| Élément | État et justification |
|---|---|
| AGENTS.md | Inchangé ; règles SCM, OpenSpec et protection des archives respectées. |
| PROJECT.md | Inchangé ; section 3.3 déjà conforme à l'attente humaine sans réessai et au choix de session conservé. |
| TECHNICAL.md | Inchangé ; cadences de la boucle de pilotage et séparation des sondes déjà conformes. |
| BUILD.md | Inchangé ; préparation du Monitor 1.10.4 conforme, aucune distribution exécutable modifiée. |
| DEVOPS.md | Inchangé ; exécutables Node et OpenSpec déclarés utilisés, aucune dépendance ajoutée. |
| README.md | Inchangé ; section Cadences de pilotage déjà conforme à la politique retenue. |
| CHANGELOG.md | Mis à jour dans l'entrée 1.10.4 de préparation source, sans nouvelle version ni publication. |
| openspec/specs/ | Trois références réconciliées, deltas concordants et validations standard/stricte réussies. |
| ORCHESTRATED_CODING.md, commande et skill CAB | Inchangés ; politique courante vérifiée par les 24 tests documentaires. Aucun fichier du référentiel template n'est modifié. |
| Code runtime | Inchangé ; aucune adaptation exécutable, migration ou activation. |

## Clôture du périmètre demandé

Réconciliation et contrôles terminés ; le change reste actif et ses références
sont déjà synchronisées. L'absence d'archivage applique la restriction humaine,
elle ne prouve ni un archivage ni une livraison publiée. Toute suite doit tenir
compte de cette synchronisation et respecter les autorisations alors applicables.

Tests runtime complets, navigateur, Docker et LXC : non pertinents pour cette
correction exclusivement spécificative et documentaire. Benchmark fournisseur,
installation, activation, archivage, rapport statistique et Git : non exécutés.
