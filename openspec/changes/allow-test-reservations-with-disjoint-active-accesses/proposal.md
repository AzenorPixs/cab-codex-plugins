# Réserver un environnement de test malgré des accès disjoints

## Pourquoi

`acquireTests` refuse actuellement une réservation dès que le RUN possède un
accès HELD, EXECUTING, UNKNOWN ou WAITING, même si cet accès porte sur un
fichier sans rapport avec l'environnement LXC/Docker demandé. Cela bloque des
travaux indépendants et contredit le contrat resource-scoped.

## Changements

- Limiter la barrière d'acquisition des environnements de test aux accès
  non résolus du même RUN qui recouvrent les ressources de test demandées.
- Conserver les accès HELD, EXECUTING, UNKNOWN et WAITING existants ; un accès
  recouvrant garde son effet bloquant.
- Conserver les gardes de phase, génération, suspension, réservation de test
  déjà active, exclusivité des environnements et usage natif.

## Hors périmètre

- Libérer, fusionner, réconcilier ou modifier un accès existant.
- Modifier les décisions, les permissions `once`, ou les opérations natives.
- Modifier les autres RUN ou leurs réservations.

## Vérification

Tester l'acquisition pendant des accès disjoints HELD, UNKNOWN et WAITING,
puis vérifier qu'un accès recouvrant bloque toujours l'environnement de test.
Exécuter les suites applicables et la validation OpenSpec stricte.
