# Ajouter un terminal au détail d’une session

## Why

L’affichage du détail laisse de la largeur inutilisée. Un terminal interactif
permet à un administrateur de travailler dans l’atelier isolé du RUN tout en
gardant son avancement visible.

## What Changes

- Utiliser la largeur disponible et présenter le détail plus compact à gauche.
- Présenter à droite un terminal inactif jusqu’à l’ouverture explicite.
- Exécuter le shell en root dans son espace de noms, lié au RUN et au navigateur.
