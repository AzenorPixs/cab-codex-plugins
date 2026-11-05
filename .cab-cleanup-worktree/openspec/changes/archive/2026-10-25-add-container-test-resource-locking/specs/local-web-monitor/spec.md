## ADDED Requirements

### Requirement: Cadence de la vue réglable sur la page
La page MUST proposer une liste déroulante contenant exactement Manuel, 1s, 3s, 7s, 30s, 1m, 5m, 10m et 30m, avec 1s par défaut et conservation locale du choix lorsque disponible. Elle MUST proposer Actualiser. Manuel MUST permettre seulement le chargement initial et les rafraîchissements explicites ; les snapshots SSE MUST NOT contourner cette sélection. Les autres valeurs MUST fixer la cadence de récupération de la vue sans requêtes simultanées ni modification de la collecte partagée.

#### Scenario: Actualisation manuelle
- **WHEN** Manuel est sélectionné et une nouvelle observation SSE arrive
- **THEN** la vue conserve ses données jusqu'au clic sur Actualiser

#### Scenario: Cadence mémorisée
- **WHEN** 7s est sélectionné puis la page est rechargée
- **THEN** la sélection reste 7s et la vue suit cette cadence

#### Scenario: Passage en Manuel pendant une récupération
- **WHEN** une récupération automatique se termine après sélection de Manuel
- **THEN** sa réponse ne modifie pas la vue et ne renouvelle pas la disponibilité Web

### Requirement: Disponibilité Web pendant trente minutes
La carte Web MUST afficher Disponible après un snapshot valide appliqué avec succès et pendant les 30 minutes suivantes. Elle MUST afficher Non observé si aucun succès n'existe ou dès que ce délai est atteint. Une perte SSE seule MUST NOT effacer cette disponibilité. Les échecs HTTP et observations invalides MUST NOT renouveler le délai. L'expiration MUST être visible sans nouveau rafraîchissement et MUST préserver les règles de fraîcheur des autres composants.

#### Scenario: Manuel sans refresh depuis trente minutes
- **WHEN** le dernier rafraîchissement réussi date de 30 minutes et aucune nouvelle récupération n'a réussi
- **THEN** la carte Web passe de Disponible à Non observé

#### Scenario: Nouveau relevé valide
- **WHEN** Actualiser réussit après expiration
- **THEN** la carte Web affiche Disponible et repart pour 30 minutes
