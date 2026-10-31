## ADDED Requirements

### Requirement: Suppression du jeton d'un accès libéré
Après libération ou publication, CAB MUST retirer le jeton brut de l'accès
persisté et de toute réponse. Le rejeu exact MUST rester idempotent grâce à
l'empreinte persistée de la requête. Les accès actifs MUST conserver leur
jeton ; une requête divergente MUST être refusée.

#### Scenario: Libération et rejeu exact
- **WHEN** un accès HELD est libéré puis la même requête est rejouée
- **THEN** le reçu est rendu sans jeton brut et sans nouvelle mutation

#### Scenario: Rejeu divergent
- **WHEN** une requête de libération diffère du reçu persistant
- **THEN** CAB refuse le rejeu sans exposer ni réactiver l'ancien jeton

#### Scenario: Publication d'un accès
- **WHEN** un accès est consommé par une publication réussie
- **THEN** son état RELEASED et son reçu subsistent sans jeton brut

