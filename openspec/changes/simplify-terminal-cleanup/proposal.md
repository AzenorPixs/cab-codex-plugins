# Simplifier le nettoyage terminal CAB

## Pourquoi

Le nettoyage actuel cumule des inventaires, contrôles croisés et transactions
globales qui immobilisent d’autres sessions et retardent la suppression de
données de coordination devenues inutiles. Le développeur demande une opération
simple et rapide, à son initiative ou à la fin du RUN.

## Changements

Fournir une commande unique de nettoyage ciblé par projet et RUN ou change,
avec exécution autonome, progression par brique et reprise idempotente. Refuser
un RUN actif ; conserver les autres projets, RUN et fichiers métier. Une brique
indisponible n’empêche pas le traitement des autres et sa reprise est locale.
Conserver les demandes et décisions actives hors cible. Supprimer les contrôles
redondants et les dépendances à l’historique CAB lorsqu’ils ne servent pas ces
garanties. La migration des anciennes données et du reçu figé existant fait
partie de la qualification ; aucune perte de pair ni rejeu d’effet n’est admis.
