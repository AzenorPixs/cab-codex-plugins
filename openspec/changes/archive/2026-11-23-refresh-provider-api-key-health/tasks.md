## 1. Données et service

- [x] 1.1 Persister les contrôles et leurs horodatages, planifier et déclencher les actualisations, projeter les champs publics.
- [x] 1.2 Vérifier les clés et collecter les mesures disponibles. Utiliser une clé valide choisie pour les catalogues.

## 2. Administration

- [x] 2.1 Rendre les URL cliquables et ouvrir les détails du dernier essai de catalogue depuis l’état.
- [x] 2.2 Afficher l’état, l’horodatage de réussite et le détail d’une clé. Permettre son actualisation manuelle.

## 3. Qualification

- [x] 3.1 Vérifier les comportements PostgreSQL et les deux tableaux sur l’hôte.
- [x] 3.2 Interroger OpenAI avec la clé déjà configurée, vérifier les données publiques et reporter les sources dans le projet.

## Sous-lots normalisés

Repère provisoire refresh-provider-api-key-health, code non attribué.

- Données et service, tâches 1.1 et 1.2, vérifiés sur PostgreSQL isolé (15 tests) et OpenAI sur l’hôte.
- Administration, tâches 2.1 et 2.2, vérifiée sur Chromium et Firefox, flux Electric simulé.
- Qualification, tâches 3.1 et 3.2, sonde réelle et report vérifiés le 23 novembre 2026. La clé OpenAI a donné accès aux limites de fine-tuning de huit modèles et l’API des coûts a retourné 403.
