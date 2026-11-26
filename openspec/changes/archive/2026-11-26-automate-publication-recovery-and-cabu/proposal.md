## Why

Des interblocages PostgreSQL successifs ont bloqué l’admission de publication. L’activation CABU attend aussi un nouveau tour malgré une clôture attestée.

## What Changes

- Employer des verrous MCP compatibles avec les contrôles de clés étrangères et traiter les interblocages restants par reprises bornées sur preuves.
- Permettre à CAB d’archiver et de déclencher CABU sur un mandat explicite après clôture, pour le paquet attesté.

## Capabilities

### Modified Capabilities

- `publication-cycle` décrit la reprise et l’activation système après le cycle.

## Impact

Protocole de publication, connecteurs MCP, service CABU et recette PostgreSQL isolée.
