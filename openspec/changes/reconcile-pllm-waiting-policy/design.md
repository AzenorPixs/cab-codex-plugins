## Context

L'archive du 10 octobre 2026 a introduit l'attente avec réessais illimités.
Le complément du 26 octobre a réconcilié les supports CAB et ajouté la règle
d'attente humaine dans la distribution, sans remplacer les clauses de
supervision et de statistiques. Les archives restent des traces historiques.

## Decisions

1. Remplacer la prescription de réessais périodiques par une attente humaine
   sans nouvelle évaluation automatique lorsqu'aucune politique n'est admissible.
2. Conserver le choix et les preuves du RUN. Une ancienne échéance ne déclenche
   aucune tentative à la reprise ; une tentative d'effet inconnu est réconciliée.
3. Préserver les services partagés, les gates, les permissions unitaires et
   la réconciliation avant toute reprise autorisée. La disponibilité d'un
   benchmark ne vaut jamais autorisation d'exécution.
4. Garder les sondes statistiques indépendantes. Leur échéance ou leur échec
   ne déclenche aucun benchmark ni suspension du seul fait d'un échec de sonde.
5. Ajouter au test documentaire existant une comparaison explicite des trois
   références courantes et de leurs invariants ; exclure les archives.

## Validation

Valider strictement les deltas avant toute écriture de test. Ajouter ensuite
le contrôle documentaire et constater son échec sur le référentiel initial.
Réconcilier les références et vérifier son succès, puis exécuter le fichier
documentaire complet, la syntaxe JavaScript et les validations OpenSpec ciblées,
globales standard et strictes. Vérifier UTF-8/LF, les empreintes des archives
et le périmètre modifié sans inspection Git.

Les tests runtime, navigateur, Docker et LXC ne sont pas nécessaires : aucun
code exécutable distribué ni comportement visuel n'est modifié. Aucun service
n'est démarré par les contrôles documentaires.

## Compatibility and Rollback

Aucun format ni version de composant ne change. Les nouvelles règles concernent
la conduite de l'orchestrateur déjà décrite par les supports distribués.
Les anciennes traces sont conservées, sans restauration d'une boucle automatique.
La correction documentaire est réversible par restauration des seuls passages
concernés ; aucun retour arrière de données ou de service n'est nécessaire.

## Limite explicite

L'archivage est exclu par la demande. Le change et ses preuves restent actifs,
sans modification des archives, statistique d'archivage ou publication Git.
