## ADDED Requirements

### Requirement: Suppression manuelle d’une déclaration CCAB résolue

Un administrateur MUST pouvoir supprimer une seule déclaration résolue depuis le tableau Incidents du projet après confirmation nominative. Le serveur MUST vérifier le projet, l’état et la révision sous verrou. Il MUST conserver une trace de l’action.

#### Scenario: Déclaration résolue et confirmée
- **WHEN** l’administrateur confirme une déclaration résolue dont la révision est inchangée
- **THEN** CAB retire cette seule déclaration et actualise le tableau

#### Scenario: Déclaration ouverte, différente ou modifiée
- **WHEN** l’utilisateur cible une déclaration non résolue, rattachée à un autre projet ou modifiée depuis la confirmation
- **THEN** CAB refuse la suppression
