## Why

Le contrôleur mémorise une décision par `requestId`, tandis que le broker la
recherche par `approval_id`. Ces identifiants distincts empêchent une décision
valide d'être appliquée, laissent l'approbation en attente et font expirer
l'appel MCP côté OpenCode.

## What Changes

- Uniformiser la route de lecture des décisions sur le `requestId` métier.
- Inclure les identifiants de corrélation dans toute décision produite ou
  mémorisée par le contrôleur.
- Refuser les décisions dont les identifiants ne correspondent pas exactement
  à la demande notifiée.
- Couvrir le flux complet avec des identifiants `requestId` et `approval_id`
  volontairement différents.

## Capabilities

### New Capabilities

- Aucune.

### Modified Capabilities

- `controller-transport`: renforcer le contrat HTTP de décision autour du
  `requestId` et des identifiants corrélés.
- `approval-workflow`: garantir l'application et la restitution d'une
  décision disponible pour la demande métier correspondante.

## Impact

- `src/cgpt_approval_bridge_server.py`
- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- tests du broker et du contrôleur
