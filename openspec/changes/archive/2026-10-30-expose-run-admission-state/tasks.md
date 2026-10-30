# Tâches

- [x] 1. Spécifier les observations d’admission et leur absence d’autorité.
- [x] 2. Exposer les instantanés et enrichir les refus sans changer les gardes.
- [x] 3. Qualifier transitions précoces/tardives, isolation, inconnus et unicité de décision.
- [x] 4. Distribuer version/protocole et clôturer SCM, CABU puis information.

## Sous-lots normalisés

Code non attribué : références techniques provisoires, aucune allocation ACL. Critères futurs au30 octobre2026.

| Référence | Tâche | Périmètre | Dépendances | Critère attendu | État |
|---|---|---|---|---|---|
| admission-contract | 1 | Contrat d’observation | Demande humaine | OpenSpec strict | VALIDÉ — preuves30/10/2026 |
| admission-observation | 2 | Statut/GET/refus | 1 | Garde inchangée, aucun effet | VALIDÉ — preuves30/10/2026 |
| admission-races | 3 | Concurrence et décisions | 2 | Positifs/négatifs/races | VALIDÉ — preuves30/10/2026 |
| admission-distribution | 4 | Version et clôture | 2,3 | Globaux/publications/activation | VALIDÉ — preuves30/10/2026 |
