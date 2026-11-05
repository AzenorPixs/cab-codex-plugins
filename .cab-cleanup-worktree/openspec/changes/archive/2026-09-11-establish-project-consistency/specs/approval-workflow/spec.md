## Purpose

Cette capacité définit le cycle de validation CAB entre OpenCode et CGPT, sans décision implicite ni confusion entre demandes concurrentes.

## ADDED Requirements

### Requirement: Demande corrélée et décision explicite
CAB SHALL attribuer ou accepter un `requestId` stable pour chaque demande de validation et ne SHALL appliquer une décision que si elle correspond à cette demande. L'absence de décision SHALL conserver la demande dans un état non terminal et ne SHALL jamais être interprétée comme une approbation.

#### Scenario: Approbation corrélée
- **WHEN** une demande PENDING reçoit une décision `approved` correspondant à son `requestId`
- **THEN** CAB la fait passer à APPROVED et restitue cette décision à OpenCode

#### Scenario: Décision absente
- **WHEN** aucune décision contrôleur n'est disponible pour une demande PENDING
- **THEN** CAB ne modifie pas son état vers APPROVED

### Requirement: États terminaux protégés
CAB SHALL distinguer PENDING, APPROVED, REJECTED, NEEDS_CLARIFICATION, CANCELLED et EXPIRED. Une décision supplémentaire ou contradictoire pour une demande terminale SHALL être refusée.

#### Scenario: Seconde décision refusée
- **WHEN** une décision est soumise pour une demande déjà APPROVED
- **THEN** CAB conserve la première décision et refuse la seconde
