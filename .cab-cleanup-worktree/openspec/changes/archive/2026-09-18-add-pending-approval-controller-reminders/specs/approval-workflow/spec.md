## ADDED Requirements

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
