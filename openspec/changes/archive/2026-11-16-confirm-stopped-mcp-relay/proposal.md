# confirm-stopped-mcp-relay — code non attribué

## Why

Une liaison MCP dont le relais est arrêté sur autorisation peut bloquer une mise à jour, même lorsque son arrêt est démontré et qu’aucune opération n’est en cours.

## What Changes

- Permettre à un administrateur de confirmer la déconnexion d’un relais ciblé par un reçu de mise à jour.
- Vérifier l’identité et l’arrêt du relais et de son moteur ainsi que l’absence d’effets incertains ou actifs.
- Conserver un reçu explicite de déconnexion, sans affirmer qu’un catalogue a été lu ou qu’un relais a été reconnecté.
- Ne pas confondre un autre relais préexistant avec un remplacement.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `system-platform` : constatation autorisée d’une déconnexion MCP lors d’une mise à jour.

## Impact

API d’administration, évaluation des connecteurs et reçus CABU ; aucune nouvelle dépendance ni migration.
