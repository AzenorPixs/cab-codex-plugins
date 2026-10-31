# Tâches

- [x] 1. Spécifier le contrat de l’identité minimale et l’usage dans le
      bootstrap CAB sans altérer le snapshot du dashboard.
- [x] 2. Ajouter `/api/identity` et faire utiliser cette projection par
      le bootstrap `/CAB start`.
- [x] 3. Aligner les composants, plugins, commandes et cadrages en `2.1.34`;
      documenter le changement dans `CHANGELOG.md`.
- [x] 4. Ajouter les contrôles positifs/négatifs de l’endpoint et du bootstrap,
      puis exécuter les validations et tests applicables.
- [x] 5. Mettre à jour les références ciblées de cartographie et vérifier la
      cohérence documentaire ainsi que l’éligibilité à l’archivage.

## Sous-lots normalisés

Repères provisoires — code non attribué ; attribution ACL ultérieure.

| Repère | Tâches | Périmètre | Dépendance | Critère | État |
|---|---|---|---|---|---|
| monitor-identity-contract | 1 | OpenSpec monitor et intégration | Aucune | Projection minimale spécifiée, snapshot UI préservé | VALIDÉ |
| monitor-identity-implementation | 2, 3 | Moniteur, bootstrap, distribution | Contrat | Seuls version/workspace exposés au bootstrap en 2.1.34 | VALIDÉ |
| monitor-identity-validation | 4 | Tests et validations | Implémentation | Réponse minimale, erreurs fermées, aucun RUN dans la projection | VALIDÉ |
| monitor-identity-release | 5 | Cartographie et clôture documentaire | Validation | Références ciblées à jour et change éligible à l’archivage | VALIDÉ |
