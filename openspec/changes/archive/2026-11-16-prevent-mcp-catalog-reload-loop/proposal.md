# prevent-mcp-catalog-reload-loop — code non attribué

## Why

Un relais dont le moteur est déjà à jour peut redémarrer en boucle tant que son client ne relit pas le catalogue, sans pour autant démontrer la reconnexion.

## What Changes

- Arrêter les redémarrages répétés lorsque seul le catalogue manque.
- Préserver la priorité des contrôles natifs et l’attente d’une lecture réelle du catalogue.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `system-platform` : attente sûre du catalogue MCP.

## Impact

Politique de rechargement et relais MCP ; aucune nouvelle dépendance ni migration.
