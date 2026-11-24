# Configurer la rétention des artefacts par projet

## Why

Les nettoyages fixes après publication Debian et Docker ne permettent pas à chaque
projet de choisir son historique de versions. L’éditeur doit rester lisible avec
les réglages supplémentaires, y compris sur un écran étroit.

## What Changes

- Ajouter les réglages indépendants `PROJECT_DEBIAN_RETENTION` et
  `PROJECT_DOCKER_RETENTION`, désactivés par défaut.
- Cumuler la conservation par nombre et par âge dans les publications
  manuelles et automatiques après confirmation sur chaque forge.
- Rendre l’éditeur de projet compact, avec deux colonnes égales lorsque
  la largeur le permet et une seule colonne sur écran étroit.
