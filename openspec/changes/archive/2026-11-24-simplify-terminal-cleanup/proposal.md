# Simplifier le nettoyage terminal CAB

## Why

Le nettoyage actuel cumule des inventaires, contrôles croisés et transactions
globales qui immobilisent d’autres sessions et retardent la suppression de
données de coordination devenues inutiles. Le développeur demande une opération
simple et rapide, à son initiative ou à la fin du RUN.

## What Changes

Fournir une commande unique de nettoyage ciblé par projet et RUN ou change,
avec exécution autonome, progression par brique et reprise idempotente. Refuser
un RUN actif ; conserver les autres projets, RUN et fichiers métier. Une brique
indisponible n’empêche pas le traitement des autres et sa reprise est locale.
Conserver les demandes et décisions actives hors cible. Supprimer les contrôles
redondants et les dépendances à l’historique CAB lorsqu’ils ne servent pas ces
garanties. CAB 3.x porte la commande. La qualification couvre l’import de données
historiques et la reprise du format signé 2.x sur des données isolées. La recette
du reçu figé de C08 exige sa source authentifiable et une vérification de sa
portée actuelle. Aucune perte de pair ni répétition d’effet n’est admise.
