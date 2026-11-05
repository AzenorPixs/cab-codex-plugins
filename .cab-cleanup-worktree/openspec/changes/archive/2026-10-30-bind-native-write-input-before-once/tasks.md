# Tâches

- [x] 1. Spécifier l’empreinte et la compatibilité des mandats historiques.
- [x] 2. Lier broker/décision/opération et dériver la preuve native avant once.
- [x] 3. Qualifier écritures/éditions positives et divergentes avant effet sur2.2.0.
- [x] 4. Distribuer protocole/version, vérifier globalement puis clôturer SCM et CABU.

## Sous-lots normalisés

Code non attribué : références techniques provisoires, aucune allocation ACL. Critères futurs au30 octobre2026.

| Référence | Tâche | Objectif/périmètre | Dépendances | Critère attendu | État |
|---|---|---|---|---|---|
| native-input-contract | 1 | Contrat d’empreinte et limites | Demande humaine | OpenSpec strict | VALIDÉ — preuves30/10/2026 |
| native-input-binding | 2 | Broker/client/contrôleur | 1 | Positifs/négatifs ciblés | VALIDÉ — preuves30/10/2026 |
| native-input-native | 3 | Refus avant effet exact2.2.0 | 2 | Once absente/fichier inchangé si divergence | VALIDÉ — preuves30/10/2026 |
| native-input-distribution | 4 | Distribution/clôture | 2,3 | Globaux, archive, publications, activation | VALIDÉ — preuves30/10/2026 |
