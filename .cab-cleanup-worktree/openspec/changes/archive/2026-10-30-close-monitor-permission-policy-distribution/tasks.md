# Tâches

- [x] 1. Spécifier la fermeture des imports déployés.
- [x] 2. Corriger monitorScripts et la vérification source/destination.
- [x] 3. Qualifier import installé et refus avant coupure, puis globaux.
- [x] 4. Distribuer version/documentation et préparer SCM/CABU.

## Sous-lots normalisés

Code non attribué, repères provisoires ; attribution ACL ultérieure. Validé source le30octobre2026 : QUALIFICATION.md et PREUVES-SCM.json.

| Référence | Tâches | Périmètre | Dépendances | Critère | État |
|---|---|---|---|---|---|
| deployed-import-contract | 1 | OpenSpec | Repli29terminal | Strict cible | VALIDÉ SOURCE |
| deployed-import-check | 2 | Updater | 1 | Source/destination exactes | VALIDÉ SOURCE |
| deployed-import-tests | 3 | Tests | 2 | ESM installé, négatif sans coupure | VALIDÉ SOURCE |
| deployed-import-release | 4 | Docs/versions | 3 | Source cohérente | VALIDÉ SOURCE |
