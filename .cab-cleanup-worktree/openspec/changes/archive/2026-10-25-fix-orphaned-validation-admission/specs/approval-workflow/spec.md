## ADDED Requirements

### Requirement: Notification réconciliée limitée au rejet
Une validation créée par réconciliation de notification MUST accepter uniquement rejected explicite. approved et needs_clarification MUST être refusés. Son opération MUST rester inexécutable, sans acquisition ni once, y compris après répétition ou restauration du registre. Aucun agent automatique MUST décider cette validation.

#### Scenario: Tentative d'approbation
- **WHEN** une décision approved ou une acquisition vise l'opération réconciliée
- **THEN** elle est refusée sans modifier la décision, les accès ou les permissions
