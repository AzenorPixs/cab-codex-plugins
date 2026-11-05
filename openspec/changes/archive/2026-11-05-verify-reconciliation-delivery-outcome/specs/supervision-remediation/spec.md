## ADDED Requirements

### Requirement: Succès vérifié d’une réconciliation de notification
RECONCILE_PENDING_APPROVALS SHALL qualifier son résultat sur une décision appliquée ou un terminal observé, une livraison ACK et persistée, ou une livraison déjà observée distincte. Sans preuve suffisante, il SHALL retourner NOTIFICATION_NOT_REESTABLISHED avec rétablissementfalse et tentativeFAILED dans réponse/registre. La clôture manuelle SHALL refuser le faux succès. Budgets, gardes et reçus historiques SHALL rester conservés, sans effet métier ou livraison inventée.

#### Scenario: Notification non livrée
- **GIVEN** une approbation PENDING sans décision disponible et une notification non confirmée
- **WHEN** la réconciliation finit sans exception
- **THEN** absence de rétablissement et tentativeFAILED sont persistées, avec observations filtrées disponibles
- **AND** aucun succès, nouvelle décision, réinitialisation de budget ou exécution métier n’est inféré

#### Scenario: Livraison ou concurrence qualifiées
- **WHEN** ACK et DELIVERED sont confirmés, ou qu’un terminal/livraison déjà acquis est relu
- **THEN** le résultat distingue action réalisée et état concurrent observé sans attribution fictive

#### Scenario: Ancien reçu ou clôture manuelle
- **WHEN** un résultat contradictoire est fourni pour une nouvelle clôture dite réussie
- **THEN** la tentative estFAILED, pasCOMPLETED
- **WHEN** un ancien reçu est lu
- **THEN** son historique est conservé sans réécriture rétroactive
