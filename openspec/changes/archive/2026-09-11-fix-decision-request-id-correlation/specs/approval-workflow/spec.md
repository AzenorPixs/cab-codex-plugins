## MODIFIED Requirements

### Requirement: Demande corrélée et décision explicite
CAB SHALL attribuer ou accepter un `requestId` stable pour chaque demande de
validation et ne SHALL appliquer une décision que si son `requestId`, son
`approval_id` et son `change_id` correspondent à la demande en attente. Le
broker SHALL rechercher la décision contrôleur par le `requestId` métier.
L'absence de décision SHALL conserver la demande dans un état non terminal et
ne SHALL jamais être interprétée comme une approbation.

#### Scenario: Approbation corrélée
- **WHEN** une demande PENDING reçoit une décision `approved` dont les identifiants correspondent à sa demande
- **THEN** CAB la fait passer à APPROVED et restitue cette décision à OpenCode

#### Scenario: Identifiants de décision incohérents
- **WHEN** le contrôleur retourne une décision avec un `requestId`, un `approval_id` ou un `change_id` différent de la demande PENDING
- **THEN** CAB refuse la décision et conserve la demande dans un état non terminal

#### Scenario: Décision absente
- **WHEN** aucune décision contrôleur n'est disponible pour une demande PENDING
- **THEN** CAB ne modifie pas son état vers APPROVED
