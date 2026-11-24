# Actualiser l’éditeur de configuration du projet

## Why

L’éditeur doit afficher la configuration de PostgreSQL dès son ouverture,
puis vérifier la source avant d’autoriser une écriture. Le nom historique
PROJECT_TYPE ne distingue pas les langages des frameworks.

## What Changes

- Disposer les variables de l’éditeur en deux colonnes égales avec une police
  réduite et une aide séparée pour chaque variable.
- Renommer PROJECT_TYPE en PROJECT_LANGUAGES dans les fichiers consultés et
  ajouter PROJECT_FRAMEWORKS.
- Reprendre la projection PostgreSQL et Electric dans l’éditeur. Bloquer
  l’enregistrement jusqu’à validation de la source et des valeurs de base.
