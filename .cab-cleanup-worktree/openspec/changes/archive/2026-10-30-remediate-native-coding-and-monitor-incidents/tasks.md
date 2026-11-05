# Tâches

- [x] 1. Spécifier les remédiations et invariants.
- [x] 2. Corriger la projection registre et les diagnostics bornés du moniteur.
- [x] 3. Fournir les instructions natives et diagnostic corrélé sans relance.
- [x] 4. Qualifier refus/contenu exact, documenter, distribuer la version et préparer SCM/CABU.

## Sous-lots normalisés

Code non attribué ; repères techniques provisoires, normalisation ACL ultérieure. Validé source le 30 octobre 2026 : QUALIFICATION.md et PREUVES-SCM.json.

| Référence | Tâches | Périmètre | Dépendances | Critère | État |
|---|---|---|---|---|---|
| incidents-contract | 1 | OpenSpec | Mandat humain | Strict cible | VALIDÉ SOURCE |
| monitor-registry | 2 | Projection/collecte | 1 | Gros registre sans plafond relevé, refus lisibles | VALIDÉ SOURCE |
| native-recovery | 3 | Helpers/protocole | 1 | Corrélation, erreur fournisseur, aucune autorité | VALIDÉ SOURCE |
| incidents-qualification | 4 | Globaux/doc/version | 2,3 | Natifs, gardes, source cohérente | VALIDÉ SOURCE |
