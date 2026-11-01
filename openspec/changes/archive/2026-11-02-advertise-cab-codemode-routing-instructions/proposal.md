## Why

La seule consigne ajoutée par `nativeCodingMandate` peut être ignorée alors
que le catalogue natif montre également les méthodes MCP. Le broker ne fournit
pas encore de guidance durable au handshake MCP qui accompagne le prompt
système OpenCode.

## What Changes

Le broker fournit des instructions génériques dans le résultat `initialize`
et dans les descriptions des outils CAB : OpenCode Code Mode doit appeler la
méthode MCP exacte trouvée par `search` via l'hôte `execute`. Les clients MCP
hors OpenCode gardent leur contrat propre.

## Non-goals

Aucune configuration OpenCode, location, permission, décision ou once n'est
modifiée. Le RUN reste sous la responsabilité de sa session propriétaire.
