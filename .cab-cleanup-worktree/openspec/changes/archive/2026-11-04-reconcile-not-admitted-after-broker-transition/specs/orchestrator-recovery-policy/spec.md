## ADDED Requirements

### Requirement: Retrait d’une préparation dont le broker refuse définitivement l’admission
Le propriétaire SHALL pouvoir retirer une préparation sans décision, accès ou effet via withdraw-unissued-validation sur preuve native NOT_ADMITTED exacte et fraîche, deux frontières stables, SID idle et zéro permission. Seule la coordination SHALL devenir CANCELLED ; le terminal natif et l’absence de décision restent conservés. La reprise SHALL restituer le même reçu sans rejeu.


#### Scenario: Terminal broker et préparation locale sans effet
- **GIVEN** la même identité de demande/opération/RUN/SID et une lecture get_approval NOT_ADMITTED complète de moins de cinq minutes
- **WHEN** le propriétaire retire la coordination sur la frontière qualifiée
- **THEN** l’opération devient CANCELLED sans décision inventée, native/nativeResult/once ni permission
- **AND** le reçu reste identique après perte de réponse ou redémarrage
- **AND** les protections indépendantes sont inchangées et le mandat suivant exige des identifiants neufs

#### Scenario: Preuve inadmissible
- **GIVEN** une preuve PENDING/APPROVED, étrangère, périmée ou tronquée, une décision, un accès, une permission ou un effet
- **WHEN** le retrait de préparation est demandé
- **THEN** il est refusé sans mutation des protections
