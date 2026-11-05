## ADDED Requirements

### Requirement: Projection minimale d’identité du moniteur
`GET /api/identity` MUST retourner exactement `version` et `identity.workspace`,
avec le workspace absolu canonique. La réponse MUST NOT contenir de RUN,
change, session, événement ou source amont. L’endpoint MUST rester disponible
sans contrôleur/superviseur, sans collecte, avec les gardes loopback/origine ;
les autres méthodes MUST être refusées. `/api/snapshot` et SSE MUST conserver
leur contrat multi-RUN.

#### Scenario: Bootstrap du moniteur
- **WHEN** `/CAB start` vérifie une instance de moniteur active
- **THEN** `GET /api/identity` permet de valider version et workspace sans
  transmettre au bootstrap le snapshot multi-RUN

#### Scenario: Sources amont indisponibles
- **WHEN** le contrôleur et le superviseur sont inaccessibles
- **THEN** `/api/identity` retourne toujours la version et le workspace du
  moniteur sans sonder les sources amont

#### Scenario: Requête étrangère ou méthode invalide
- **WHEN** une requête cible une origine/host interdit ou une méthode autre que GET
- **THEN** le serveur refuse la requête sans collecte ni effet métier
