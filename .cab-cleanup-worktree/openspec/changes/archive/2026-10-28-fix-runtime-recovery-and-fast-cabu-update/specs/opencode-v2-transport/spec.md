## ADDED Requirements

### Requirement: Ciblage natif explicite de location
Le client MUST transmettre x-opencode-directory pour les requêtes et événements ciblant un workspace. Il MUST vérifier les enveloppes retournées et refuser une location divergente. Il MUST NOT utiliser un repli V1.

#### Scenario: Paramètre directory ignoré
- **WHEN** OpenCode sélectionne sa location par en-tête HTTP
- **THEN** CAB cible le workspace demandé et vérifie la même location dans les réponses

### Requirement: Broker unique dans la location serveur
Les appels MCP de contrôle MUST cibler la location serveur obtenue par GET /api/location sans en-tête de projet. Les sessions et leurs permissions MUST garder leur workspace propre. CAB MUST vérifier la location de chaque réponse MCP et MUST NOT créer une seconde instance de broker dans le workspace d'un RUN. La découverte en cache MUST être liée au PID du serveur.

#### Scenario: Serveur partagé et projet distinct
- **WHEN** le serveur OpenCode est dans un répertoire et les sessions travaillent dans un autre
- **THEN** CAB reconnecte uniquement le broker partagé de la location serveur et cible les sessions avec leur propre répertoire
