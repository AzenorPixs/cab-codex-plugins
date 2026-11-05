## ADDED Requirements

### Requirement: Réveil corrélé de l'orchestrateur
Le contrôleur SHALL accepter une relance corrélée sur une interface HTTP locale
et vérifier son `requestId`, son `approval_id` et son `change_id` avant toute
action. Pour une relance valide sans décision terminale, il SHALL tenter, dans
l'ordre, de transmettre l'événement structuré à la tâche orchestratrice
persistante, de planifier un heartbeat lié à cette tâche avec la consigne
d'examiner le mandat sans l'approuver implicitement, puis de conserver une
notification locale persistante si le réveil est indisponible. Aucune de ces
actions ne SHALL créer, modifier ou consommer une décision.

#### Scenario: Événement structuré transmis
- **WHEN** le contrôleur reçoit une relance corrélée et sa tâche orchestratrice persistante est disponible
- **THEN** il transmet `requestId`, `change_id`, session OpenCode, âge, opération et dernier état connu sans créer de décision

#### Scenario: Réveil indisponible
- **WHEN** le contrôleur ne peut pas transmettre l'événement ni planifier son heartbeat
- **THEN** il conserve une notification locale persistante pour l'orchestrateur et retourne un état de relance non décisionnel
