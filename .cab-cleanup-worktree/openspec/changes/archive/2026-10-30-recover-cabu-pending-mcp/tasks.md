# Tâches

- [x] 1. Spécifier attente, état durable et consentement de récupération.
- [x] 2. Implémenter observation MCP bornée et reprise du même journal.
- [x] 3. Qualifier récupération explicite unique et conservation native.
- [x] 4. Distribuer documentation/version, vérifier globaux et préparer clôture SCM/CABU.

## Sous-lots normalisés

Code non attribué, repères provisoires ; attribution ACL ultérieure. Validé source le30octobre2026 : QUALIFICATION.md et PREUVES-SCM.json.

| Référence | Tâches | Périmètre | Dépendances | Critère | État |
|---|---|---|---|---|---|
| pending-contract | 1 | OpenSpec | Mandat humain | Strict cible | VALIDÉ SOURCE |
| pending-transition | 2 | Updater/client | 1 | Attente bornée, aucun retry | VALIDÉ SOURCE |
| pending-recovery | 3 | Reçu/rechargement | 2 | Positifs/négatifs et natif | VALIDÉ SOURCE |
| pending-distribution | 4 | Versions/docs/globaux | 2,3 | Qualification source cohérente | VALIDÉ SOURCE |
