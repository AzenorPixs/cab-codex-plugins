## ADDED Requirements

### Requirement: Retrait après annulation d’un accès jamais attribué

CAB SHALL proposer et contrôler le retrait propriétaire d’une opération PREPARED approuvée dont l’unique accès dédié a été annulé avant attribution, sur identités exactes et preuve native fraîche. Il SHALL conserver les reçus et l’approbation historique et SHALL refuser tout accès attribué, partagé ou ambigu, toute permission ou tout effet incertain.

#### Scenario: Accès annulé avant attribution
- **WHEN** l’accès dédié CANCELLED n’a jamais reçu de token, fencing ou grantedAt et que deux frontières natives stables confirment l’absence d’émission
- **THEN** le propriétaire peut retirer uniquement la coordination sans nouvelle permission ni modification de l’accès

#### Scenario: Journal de réponses incomplet
- **WHEN** des reçus de réponses sont illisibles ou incomplets
- **THEN** leur absence d’information n’est jamais interprétée comme absence de permission et le retrait reste refusé si les autres preuves autoritaires ne suffisent pas

#### Scenario: Accès attribué ou preuve divergente
- **WHEN** un accès a été attribué, une permission est présente ou la frontière change
- **THEN** CAB conserve l’opération et les protections sans rejouer l’effet
