## ADDED Requirements

### Requirement: Retirer une coordination non émise après rejet natif edit vérifié
Le retrait d’une validation approuvée non émise SHALL accepter un edit avorté
uniquement si le call exact, son input et son reçu privé reject ACK204 concordent.
Deux frontières stables SHALL prouver session idle, zéro permission et absence
d’accès/native/once de l’opération. Seule la coordination SHALL devenir CANCELLED,
sans changer APPROVED ni créer nativeResult, once ou NO_EFFECT.

#### Scenario: Optional false omis et permission refusée
- **GIVEN** une empreinte approuvée avec replaceAll:false et un edit natif omettant ce défaut, rejeté avec un reçu ACK204 exact
- **WHEN** le propriétaire retire la validation à la frontière qualifiée
- **THEN** elle devient CANCELLED sans rendre l’ancien input exécutable ni corriger son empreinte historique

#### Scenario: Preuve absente, étrangère ou instable
- **GIVEN** un reçu absent/divergent, une autre cible, un effet supplémentaire ou une frontière native modifiée
- **WHEN** le retrait est demandé
- **THEN** il est refusé sans mutation de la coordination ou permission
