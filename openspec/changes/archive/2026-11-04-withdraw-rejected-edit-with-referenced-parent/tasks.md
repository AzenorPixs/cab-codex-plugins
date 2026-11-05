## Sous-lots normalisés
Code non attribué ; repère technique withdraw-rejected-edit-with-referenced-parent.
Normalisation définitive par ACL ultérieure ; aucune allocation implicite.

## 1. Frontière référencée de retrait
Objectif : retirer l’enfant refusé sans modifier son parent. Périmètre registre,
recovery et contrôleur ; dépend de la preuve native ACK204 et du parent HELD.
Critères : CANCELLED isolé, aucune once/liaison/édition, parent intact. État VALIDÉ (source ; voir QUALIFICATION.md).
- [x] 1.1 Étendre explicitement la seule voie recovery et ses gardes.
- [x] 1.2 Qualifier positifs/négatifs, persistance et reprise.

## 2. Contrat et livraison préparée
Objectif : documenter la voie propriétaire, preuves exactes et version cohérente.
Dépend du1 ; critères syntaxe/tests/OpenSpec/budgets/statistiques. État VALIDÉ (source ; voir QUALIFICATION.md).
- [x] 2.1 Mettre à jour contrat, cadrages et spécification.
- [x] 2.2 Qualifier, archiver et préparer commit/publication/CABU.
