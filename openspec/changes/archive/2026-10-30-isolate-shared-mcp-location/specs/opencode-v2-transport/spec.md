## MODIFIED Requirements

### Requirement: Broker unique dans la location serveur
Les contrôles MCP MUST cibler la location serveur découverte sans scope de projet et revérifiée avant contrôle. Les sessions et permissions MUST garder leur workspace propre. CAB MUST vérifier les enveloppes et MUST NOT créer un second broker. Le cache MUST être lié au PID ; un changement de location pour le même PID ou un argument explicite divergent MUST être refusé avant tout contrôle MCP.

#### Scenario: Serveur partagé et projet distinct
- **WHEN** le serveur OpenCode est dans un répertoire et les sessions travaillent dans un autre
- **THEN** CAB reconnecte uniquement le broker partagé de la location serveur et cible les sessions avec leur propre répertoire

## ADDED Requirements

### Requirement: Découverte serveur sans contexte implicite
GET /api/info et la découverte de la location MCP MUST être envoyés sans en-tête ni paramètre directory. Les sessions ordinaires MUST conserver leur ciblage explicite. Une découverte ou location invalide MUST bloquer le contrôle sans reconnexion automatique.

#### Scenario: Client de workspace technique
- **WHEN** un client construit avec un répertoire technique demande les métadonnées serveur
- **THEN** aucune requête de découverte ne sélectionne ce workspace technique

#### Scenario: Divergence à PID inchangé
- **WHEN** la location globale change alors que le PID serveur reste identique
- **THEN** le client refuse le contrôle MCP sans mutation

### Requirement: Session de sonde dans la location partagée
createProbeSession MUST créer une session dédiée au workspace du broker partagé, seulement lorsque ce broker est connected, avec tous les outils interdits. Les remplacements de directory, permissions ou agent MUST être refusés. Le POST de création MUST cibler explicitement la même location que son corps. Aucun échec de sonde MUST déclencher de réparation MCP.

#### Scenario: Sonde sans contexte concurrent
- **WHEN** une sonde est créée depuis un client dont le workspace par défaut est distinct
- **THEN** la session appartient à la location partagée avec deny global, sans création de contexte MCP étranger

#### Scenario: Broker indisponible ou options élargies
- **WHEN** le broker n’est pas connecté ou que l’appel fournit un répertoire, agent ou permissions propres
- **THEN** aucune session de sonde n’est créée et aucune reconnexion n’est tentée

#### Scenario: Remplacement du serveur pendant préparation
- **WHEN** le PID change entre la découverte de location et la vérification MCP de la sonde
- **THEN** le client refuse sa création avant POST sans initialiser le précédent workspace
