# Tâches

- [x] 1. Spécifier `/CAB` comme commande unique et retirer la compatibilité `/cab`.
- [x] 2. Retirer le fichier source `cab.md` et ajuster le flux de distribution,
      les cadrages, le protocole piloté et les tests associés.
- [x] 3. Incrémenter CAB, CABU et les composants communs en `2.1.33` ; mettre à
      jour le changelog.
- [x] 4. Valider OpenSpec, les versions, les tests ciblés et la suite applicable.
- [x] 5. Actualiser la cartographie et vérifier la cohérence documentaire ainsi
      que l’éligibilité à l’archivage.

## Sous-lots normalisés

Repères provisoires — code non attribué, attribution ACL ultérieure.

| Repère | Tâches | Périmètre | Dépendance | Critère | État |
|---|---|---|---|---|---|
| canonical-command-contract | 1 | OpenSpec | Aucune | `/CAB` seul est spécifié | VALIDÉ |
| canonical-command-distribution | 2, 3 | Commandes, packaging, cadrages | Contrat | Seules CAB.md/CABU.md sont distribuées en 2.1.33 | VALIDÉ |
| canonical-command-validation | 4 | Tests et validation | Distribution | Alias et divergence de versions refusés | VALIDÉ |
| canonical-command-release | 5 | Cartographie et clôture documentaire | Validation | Cartographie courante et change éligible à l’archivage | VALIDÉ |
