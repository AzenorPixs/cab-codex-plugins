## 1. Rafraîchissement et diagnostic

- [x] 1.1 Appliquer la politique TLS GitLab et retourner le diagnostic expurgé du rafraîchissement manuel.
- [x] 1.2 Afficher la console de la tentative échouée dans l’Overview et vérifier les parcours backend et navigateur.

## Sous-lots normalisés

### Diagnostic de rafraîchissement et fenêtre de l’Overview

Les tâches 1.1 et 1.2 appartiennent au change `diagnose-forge-repository-refresh`. Code non attribué. La qualification s’appuie sur des forges simulées et les navigateurs du projet.

Le 23 novembre 2026, onze tests Python ont passé. Chromium et Firefox ont vérifié le détail d’échec des trois forges, le maintien du dernier commit, l’absence de rejeu et l’absence de fenêtre au succès ou lors d’une vérification automatique.
