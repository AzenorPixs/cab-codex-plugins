## Sous-lots normalisés
Code non attribué ; repère technique withdraw-rejected-native-write.
Normalisation définitive ACL ultérieure ; aucune attribution implicite.

## 1. Projection et preuve Write V2
Objectif : exposer le call/ACK et qualifier le retrait, sans exécution.
Périmètre recovery-evidence ; dépend du client V2 et journal SDK existants.
Critères : schema/digests exacts, enfant seul, parent et protections inchangés.
État VALIDÉ (source ; voir QUALIFICATION.md).
- [x] 1.1 Inclure write dans la projection et la liaison des reçus.
- [x] 1.2 Qualifier le schéma fermé Write avec gardes et digests distincts.

## 2. Qualification et livraison préparée
Objectif : couvrir compatibilité et contrat distribué cohérent ; dépend du1.
Critères tests unitaires/HTTP/natif,syntaxe/liens/budgets/OpenSpec/statistiques.
État VALIDÉ (source ; voir QUALIFICATION.md).
- [x] 2.1 Tester positifs/refus/ressources/membres et non-rejeu.
- [x] 2.2 Actualiser noyau/index/références/skills/commande et spécification.
- [x] 2.3 Qualifier,archiver et préparer commit/publication/CABU.
