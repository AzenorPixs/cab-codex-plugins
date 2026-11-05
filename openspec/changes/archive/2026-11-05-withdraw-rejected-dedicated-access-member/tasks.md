## Sous-lots normalisés
Code non attribué ; repère technique withdraw-rejected-dedicated-access-member.
Normalisation définitive ACL ultérieure ; aucune attribution implicite.

## 1. Retrait dédié avant once
Objectif : retirer le membre refusé sans libérer implicitement son parent.
Périmètre registre/recovery/contrôleur ; dépend de la preuve native ACK204.
Critères : CANCELLED isolé, parent inchangé, gardes et reçus conservés.
État VALIDÉ (source ; voir QUALIFICATION.md).
- [x] 1.1 Ajouter la frontière dédiée explicitement dans la récupération.
- [x] 1.2 Qualifier refus, retrait puis libération et reprise de reçus.

## 2. Contrat et livraison préparée
Objectif : documenter les deux actions et versions cohérentes ; dépend du1.
Critères tests/syntaxe/liens/budgets/OpenSpec/statistiques. État VALIDÉ (source ; voir QUALIFICATION.md).
- [x] 2.1 Actualiser contrat distribué et spécification.
- [x] 2.2 Qualifier, archiver et préparer commit/publication/CABU.
