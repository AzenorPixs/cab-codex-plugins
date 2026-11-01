## ADDED Requirements

### Requirement: Instructions de routage MCP en Code Mode

Le broker MUST inclure dans le résultat MCP `initialize` des instructions
destinées à OpenCode Code Mode, précisant que les méthodes MCP CAB s'appellent
via `execute` avec le nom exact découvert par `search`, sans appel direct,
nom deviné ou repli shell. Ces instructions MUST NOT créer de décision, de
permission ou d'effet. Les clients MCP non OpenCode gardent leur contrat.

#### Scenario: Handshake OpenCode reçoit la route Code Mode

- **WHEN** OpenCode initialise le broker CAB
- **THEN** le résultat d'initialisation contient les instructions de routage Code Mode

#### Scenario: Appel destiné à un autre client MCP

- **WHEN** le broker est utilisé par un client MCP autre qu'OpenCode
- **THEN** le broker n'exige pas le wrapper Code Mode et conserve les outils et schémas actuels
