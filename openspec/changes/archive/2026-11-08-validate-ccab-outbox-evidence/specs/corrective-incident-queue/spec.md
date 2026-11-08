## ADDED Requirements

### Requirement: Validation et réparation ciblée de l’outbox

Le broker MUST valider le schéma des preuves CCAB avant toute nouvelle mise en file. Il MAY remplacer uniquement les preuves invalides d’une entrée historique par des preuves valides lors d’une soumission de même identité et de mêmes autres champs. Il MUST conserver sa date et les autres entrées, et MUST acquitter uniquement après succès du relais.

#### Scenario: Nouvelle empreinte mal formée
- **WHEN** une preuve ne contient pas un SHA-256 hexadécimal complet
- **THEN** la déclaration est refusée avant création de l’entrée locale

#### Scenario: Correction ciblée d’une ancienne preuve invalide
- **WHEN** le déclarant reprend la même identité et les mêmes champs avec des preuves valides
- **THEN** seules les preuves sont actualisées et la même entrée est relayée puis acquittée sur succès

#### Scenario: Modification étrangère ou preuve déjà valide
- **WHEN** un autre champ diffère ou qu’une preuve valide est remplacée
- **THEN** la correction est refusée et l’entrée existante reste intacte
