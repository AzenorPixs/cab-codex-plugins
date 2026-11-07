## Why
Le protocole demande une liste filtrée par RUN et SID, mais le broker ne propose que status et limit.

## What Changes
- Ajouter des filtres exacts run_id et session_id ainsi qu’une pagination bornée.
- Préserver le comportement sans filtre et les contrôles existants d’expiration.

## Capabilities
### Modified Capabilities
- `opencode-v2-transport`: liste des demandes native délimitée et paginée.

## Impact
Schéma et implémentation broker, références de diagnostic et tests ciblés ; aucun effet métier ni rejeu.
