## ADDED Requirements

### Requirement: Gel des relances pendant une récupération
Le superviseur MUST suspendre les messages de reprise lorsque le contrat expose une récupération en cours. Il MUST NOT relancer l'ancienne session ou la candidate pendant le prévol. Après transfert confirmé, il MUST suivre exclusivement la nouvelle session du même job et conserver le gate OPEN. Il MUST NOT créer la session candidate ni décider le transfert.

#### Scenario: Récupération préparée
- **WHEN** le contrat expose une récupération préparée non terminée
- **THEN** le superviseur attend avec une cause observable sans envoyer de message

#### Scenario: Récupération terminée
- **WHEN** le contrôleur a confirmé le transfert
- **THEN** le superviseur reprend ses contrôles sur la nouvelle session sans relancer l'ancienne
