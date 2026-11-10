## ADDED Requirements

### Requirement: Examen coordonné des bancs pertinents

Avant un blocage d’environnement, le codeur SHALL communiquer le critère empêché et les preuves disponibles. L’orchestrateur SHALL examiner les bancs pertinents autorisés, leur disponibilité observée et les restrictions applicables, motiver sa décision et poursuivre les voies utiles autorisées. Les preuves SHALL conserver leur portée et les protections CAB SHALL rester applicables.

#### Scenario: Échec local et banc LXC pertinent
- **WHEN** la session de codage ne dispose pas du service nécessaire et qu’un LXC pertinent est déclaré pour les tests
- **THEN** le pilote examine son autorisation et sa disponibilité, motive son choix et fait poursuivre la voie utile autorisée selon les protections CAB

#### Scenario: Restriction propre au Desktop
- **WHEN** une restriction sans installation ne concerne que le banc Desktop
- **THEN** le pilote ne l’étend pas au LXC sans autre source applicable et vérifie les autorisations du LXC

#### Scenario: Preuve limitée à son banc
- **WHEN** un test LXC réussit pour un critère d’intégration
- **THEN** sa preuve reste attachée au banc et au critère testés et ne qualifie pas automatiquement le profil Desktop

#### Scenario: Ressource non allouée ou état inconnu
- **WHEN** un banc est déclaré mais sa disponibilité ou son autorisation effective n’est pas établie
- **THEN** le pilote ne la suppose pas acquise et conserve les décisions et réservations applicables
