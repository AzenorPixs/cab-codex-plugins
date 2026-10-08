## MODIFIED Requirements

### Requirement: Réveil corrélé de l'orchestrateur
Le contrôleur SHALL accepter une relance corrélée sur une interface HTTP locale
et vérifier son `requestId`, son `approval_id` et son `change_id` avant toute
action. Pour une relance valide sans décision terminale en mode manuel, il
SHALL signaler le rappel corrélé dans son statut sans créer de thread ni de
tour Codex App Server. Cette protection SHALL s'appliquer également aux
heartbeats de relance. La demande SHALL rester indécise jusqu'à une décision
HTTP explicite et corrélée de l'orchestrateur principal. En mode automatique,
le contrôleur SHALL conserver son chemin existant de transmission structurée
à la tâche orchestratrice persistante, de heartbeat lié à cette tâche et de
notification locale persistante lorsque le réveil est indisponible. Une
relance SHALL NOT créer, modifier ou consommer une décision ou une permission.

#### Scenario: Rappels manuels répétés
- **WHEN** le contrôleur reçoit plusieurs relances corrélées d'une demande
  sans décision avec `OC_Codex_DECISION_MODE=manual`
- **THEN** il retourne une réponse non décisionnelle, rend le rappel observable
  et ne lance aucun `thread/start` ni `turn/start`
- **AND** `GET /decision/<requestId>` reste indisponible

#### Scenario: Décision explicite après un rappel manuel
- **WHEN** l'orchestrateur principal publie une décision valide sur
  `POST /decision/<requestId>` après un rappel manuel
- **THEN** le contrôleur mémorise cette décision une seule fois avec les
  identifiants de la demande
- **AND** une seconde décision ou une relance terminale est refusée

#### Scenario: Événement structuré transmis
- **WHEN** le contrôleur reçoit une relance corrélée en mode automatique et
  sa tâche orchestratrice persistante est disponible
- **THEN** il transmet `requestId`, `change_id`, session OpenCode, âge,
  opération et dernier état connu sans créer de décision

#### Scenario: Réveil indisponible
- **WHEN** le contrôleur en mode automatique ne peut pas transmettre
  l'événement ni planifier son heartbeat
- **THEN** il conserve une notification locale persistante pour
  l'orchestrateur et retourne un état de relance non décisionnel
