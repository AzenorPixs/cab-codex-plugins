## ADDED Requirements

### Requirement: Transition vers CAB 1.10.6
Le profil de mise à jour MUST traiter 1.10.6 comme version cible et MUST
continuer à accepter le broker chargé 1.10.5 dans la liste fermée des
versions qualifiées précédentes. Les contrôles de propriétaire, manifeste,
processus, PAUSE, HELD et récupération MUST rester inchangés.

#### Scenario: Broker 1.10.5 chargé et artefacts 1.10.6
- **WHEN** le broker chargé est 1.10.5 et les trois artefacts source sont 1.10.6
- **THEN** la preuve admet la version chargée antérieure et compare les artefacts à la cible 1.10.6

#### Scenario: Version postérieure inconnue
- **WHEN** le broker chargé annonce une version postérieure non qualifiée
- **THEN** le validateur refuse avant mutation
