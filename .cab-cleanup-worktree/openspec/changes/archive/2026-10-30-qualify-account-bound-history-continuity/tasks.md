# Tâches

- [x] 1. Spécifier la portée de qualification et les limites d’adoption/continuité.
- [x] 2. Corriger et qualifier l’entrée CLI par lien, sans fuite ni double effet.
- [x] 3. Reproduire et qualifier la continuité Responses liée au compte sur2.2.0, ou démontrer sa limite native sous contraintes.
- [x] 4. Clarifier contrat/documentation/version commune et réussir les vérifications globales avant archivage.

## Sous-lots normalisés

Code non attribué : les identifiants techniques provisoires ci-dessous ne constituent pas une allocation de lot ou de sous-lot ACL. Les quatre groupes et leurs critères restent inchangés. État documentaire et qualification source vérifiés le 30 octobre 2026 ; publication et activation sont des étapes distinctes.

| Référence technique provisoire | Tâche | Objectif et périmètre | Dépendances | Critère et preuve | État |
|---|---|---|---|---|---|
| account-history-specification | 1 | Contrat adoption/continuité et périmètre validé | Mandat SCM | Deux deltas OpenSpec, validation stricte ciblée | TERMINÉ |
| account-history-cli | 2 | Entrée canonique et lien symbolique du helper | 1 | Vrai CLI, effet unique, secret absent des sorties ; provider-connect.test.mjs | TERMINÉ |
| account-history-native | 3 | Historique Responses synthétique lié au compte sous2.2.0 | 1 | native-provider-encrypted-history.test.mjs ; limite et alternative explicite bornée décrites dans QUALIFICATION.md | TERMINÉ — limite native démontrée |
| account-history-distribution | 4 | Contrat distribué, documentation, version2.1.20 et vérifications | 2, 3 | QUALIFICATION.md : Node602 réussis, Python80, natif3 ; syntaxe et OpenSpec | TERMINÉ — source qualifiée |

Puis archive, statistiques six sections, publications conditionnelles et CABU ; information des sessions, sans application automatique d’une procédure non qualifiée aux RUN réels.
