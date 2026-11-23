# Synchroniser les catalogues des agents dans CAB

## Why

Les tableaux doivent afficher immédiatement les données de PostgreSQL et recevoir les changements sans navigation. Les mises à jour de modèles ne sont justifiées que par un changement du contenu des fichiers de catalogue.

## What Changes

- Projeter les données affichables par Electric et maintenir les fichiers validés dans l’état privé de CAB.
- Comparer les empreintes de tous les fichiers avant tout réajustement de modèles.
- Administrer la source de complétion et les rafraîchissements des fournisseurs.
- Réorganiser les blocs Agents et afficher MCP sous l’état du programme.
