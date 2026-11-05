# Tâches

- [x] 1. Spécifier la projection et ses frontières après changement de PLLM/compte.
- [x] 2. Implémenter la projection isolée et les refus de portée/connexion.
- [x] 3. Qualifier le chargement à chaud2.2.0, même modèle/SID/PID, préservation de l’histoire et isolation du pair.
- [x] 4. Distribuer procédure/version commune et vérifier globalement avant archive, publications et CABU.

## Sous-lots normalisés

Code non attribué : identifiants techniques provisoires, aucune allocation ACL. Critères futurs au30 octobre2026 ; états source/publication/activation distincts.

| Référence technique provisoire | Tâches | Objectif et périmètre | Dépendances | Critère / preuve attendue | État |
|---|---|---|---|---|---|
| portable-context-contract | 1 | Contrat de projection et limite de portée | Demande humaine mode2 | Deltas OpenSpec validés | VALIDÉ — preuves30/10/2026 |
| portable-context-module | 2 | Projection sans mutation et garde connexion | 1 | Tests positifs/négatifs isolés | VALIDÉ — preuves30/10/2026 |
| portable-context-native | 3 | Mécanisme natif chargé à chaud | 2 | Binaire2.2.0 exact, histoire/PID/SID conservés, pair inchangé | VALIDÉ — preuves30/10/2026 |
| portable-context-distribution | 4 | Protocole, versions, clôture SCM | 2,3 | Suites globales, distribution et OpenSpec | VALIDÉ — preuves30/10/2026 |
