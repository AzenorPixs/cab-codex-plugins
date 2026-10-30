# Tâches

- [x] 1. Spécifier payload, invocation courte et absence d’autorité du staging.
- [x] 2. Implémenter stockage immuable, limites et livraison liée aux gardes natives.
- [x] 3. Qualifier long payload exact, refus avant once et corps altéré sans effet.
- [x] 4. Distribuer version/protocole et qualifier la source ; préparer la clôture SCM et la procédure CABU/information distincte.

## Sous-lots normalisés

Code non attribué : références techniques provisoires, aucune allocation ACL. Critères vérifiés le 30 octobre 2026, preuves : QUALIFICATION.md et PREUVES-SCM.json.

| Référence | Tâche | Périmètre | Dépendances | Critère attendu | État |
|---|---|---|---|---|---|
| shell-carrier-contract | 1 | Contrat et limites | Mandat humain | OpenSpec strict | VALIDÉ SOURCE |
| shell-carrier-store | 2 | Stage/transport/gardes | 1 | Positifs/négatifs/durabilité | VALIDÉ SOURCE |
| shell-carrier-native | 3 | Exécution native exacte | 2 | Long corps non recopié, once, altération refusée | VALIDÉ SOURCE |
| shell-carrier-distribution | 4 | Versions et clôture | 2,3 | Globaux et procédure de publication/activation | VALIDÉ SOURCE |
