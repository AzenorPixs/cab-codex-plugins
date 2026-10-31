# Tâches

- [x] 1. Spécifier l’absence de jeton brut dans les accès libérés et le maintien
      du rejeu idempotent par empreinte.
- [x] 2. Supprimer le jeton à la transition RELEASED et retirer sa comparaison
      en clair du chemin d’idempotence.
- [x] 3. Tester libération, publication, persistance/reprise, rejeu exact et
      requête divergente avec des valeurs synthétiques.
- [x] 4. Incrémenter et aligner CAB/CABU en `2.1.35`, puis mettre à jour
      documentation, changelog et cartographie.
- [x] 5. Exécuter les validations locales, vérifier OpenSpec et préparer
      l’archivage et la publication SCM.

## Sous-lots normalisés

Repères provisoires — code non attribué ; attribution ACL ultérieure.

| Repère provisoire | Tâches | Périmètre | Dépendance | Critère | État |
|---|---|---|---|---|---|
| discard-released-access-tokens — contrat | 1 | Spécification de sécurité et idempotence | Aucune | Aucun jeton brut après RELEASED | VALIDÉ |
| discard-released-access-tokens — implémentation | 2 | Registre resource-scoped | Contrat | Jeton supprimé sans perte du reçu de rejeu | VALIDÉ |
| discard-released-access-tokens — vérification | 3, 4, 5 | Tests, version et clôture | Implémentation | Tests isolés et OpenSpec strict valides | VALIDÉ |
