# approval-workflow Specification

## Purpose
Cette capacité définit le cycle de validation CAB entre OpenCode et CGPT, sans décision implicite ni confusion entre demandes concurrentes.

## Requirements

### Requirement: Demande corrélée et décision explicite
CAB SHALL attribuer ou accepter un `requestId` stable pour chaque demande de
validation et ne SHALL appliquer une décision que si son `requestId`, son
`approval_id` et son `change_id` correspondent à la demande en attente. Le
broker SHALL rechercher la décision contrôleur par le `requestId` métier.
L'absence de décision SHALL conserver la demande dans un état non terminal et
ne SHALL jamais être interprétée comme une approbation. Lorsqu'un contrôleur
est configuré en mode manuel, l'absence de décision automatique SHALL
conserver la demande PENDING jusqu'à la réception d'une décision corrélée.

#### Scenario: Approbation corrélée
- **WHEN** une demande PENDING reçoit une décision `approved` dont les identifiants correspondent à sa demande
- **THEN** CAB la fait passer à APPROVED et restitue cette décision à OpenCode

#### Scenario: Identifiants de décision incohérents
- **WHEN** le contrôleur retourne une décision avec un `requestId`, un `approval_id` ou un `change_id` différent de la demande PENDING
- **THEN** CAB refuse la décision et conserve la demande dans un état non terminal

#### Scenario: Décision absente
- **WHEN** aucune décision contrôleur n'est disponible pour une demande PENDING
- **THEN** CAB ne modifie pas son état vers APPROVED

#### Scenario: Mode manuel sans décision
- **WHEN** le contrôleur utilise le mode manuel et aucune décision corrélée n'a été soumise
- **THEN** CAB conserve la demande PENDING sans créer de décision automatique

### Requirement: États terminaux protégés
CAB SHALL distinguer PENDING, APPROVED, REJECTED, NEEDS_CLARIFICATION, CANCELLED et EXPIRED. Une décision supplémentaire ou contradictoire pour une demande terminale SHALL être refusée.

#### Scenario: Seconde décision refusée
- **WHEN** une décision est soumise pour une demande déjà APPROVED
- **THEN** CAB conserve la première décision et refuse la seconde

### Requirement: Relance corrélée des décisions PENDING
Pour chaque validation PENDING notifiée au contrôleur et sans décision
corrélée disponible, le broker SHALL relancer le contrôleur toutes les trente
secondes. La relance SHALL contenir le même `requestId`, `approval_id` et
`change_id`, l'âge de l'attente, l'opération demandée et le dernier état
connu. Elle SHALL être journalisée, ne SHALL modifier ni l'état PENDING ni la
décision, et ne SHALL jamais transmettre une permission OpenCode.

#### Scenario: Relance sans décision
- **WHEN** une validation notifiée reste PENDING trente secondes sans décision corrélée
- **THEN** le broker envoie une relance corrélée au contrôleur et conserve la validation PENDING

#### Scenario: Décision disponible avant la relance
- **WHEN** une décision corrélée devient disponible avant l'intervalle de relance
- **THEN** le broker n'envoie pas de relance et applique seulement la décision conformément au cycle existant
