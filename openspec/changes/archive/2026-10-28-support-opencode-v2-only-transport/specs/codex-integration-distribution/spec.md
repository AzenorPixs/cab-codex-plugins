## ADDED Requirements

### Requirement: Configuration MCP OpenCode V2
Le broker CAB MUST être déclaré comme serveur MCP local `stdio` sous `mcp.servers.cgpt-validation`. La forme V1 plaçant le serveur directement sous `mcp` MUST NOT être utilisée ni réparée automatiquement.

#### Scenario: Configuration compatible
- **WHEN** la configuration OpenCode V2 est inspectée
- **THEN** `cgpt-validation` est sous `mcp.servers` avec `type: "local"` et utilise stdio

#### Scenario: Configuration V1 résiduelle
- **WHEN** le serveur est déclaré directement sous `mcp`
- **THEN** CAB signale la configuration incompatible sans la réécrire ni démarrer le broker

## MODIFIED Requirements

### Requirement: Connexion MCP et création du RUN CAB

Avant de créer une session de codage, `/CAB start` SHALL consulter `GET /api/mcp` du serveur OpenCode V2 avec authentification valide et exiger que l'entrée `cgpt-validation` soit `connected` dans l'enveloppe V2 de la location cible. En cas d'échec, `/CAB start` MAY tenter uniquement les routes V2 documentées de déconnexion puis connexion du MCP ciblé, à une frontière de maintenance autorisée, puis SHALL relire `/api/mcp`. Il MUST NOT appeler `/instance/dispose`, essayer les routes V1, ni démarrer ou arrêter directement le broker.

#### Scenario: Connexion MCP et création du RUN CAB
- **WHEN** la purge du nouveau RUN est terminée mais cgpt-validation n'est pas connecté
- **THEN** aucune session de codage n'est créée avant un état MCP sain et CAB ne lance ni n'arrête directement le broker

#### Scenario: Création après raccordement sain
- **WHEN** l'initialisation globale exclusive ou la jonction sans purge est réconciliée et MCP est sain
- **THEN** `/CAB start` SHALL créer une nouvelle session maîtresse OpenCode persistante

### Requirement: Messagerie et reprise du même RUN CAB

`/CAB start` MAY réutiliser la session seulement pour la reprise du même RUN, sans purge. `/CAB start` SHALL transmettre les mandats via `POST /api/session/{sessionID}/prompt` V2 dans la location persistante, préserver le texte, la corrélation de mandat, les permissions natives et le mode de livraison sans reprise implicite.

#### Scenario: Messagerie et reprise du même RUN CAB
- **WHEN** CAB reprend le même RUN avec sa session persistante
- **THEN** il conserve cette session sans purge et transmet les mandats par sa messagerie native
