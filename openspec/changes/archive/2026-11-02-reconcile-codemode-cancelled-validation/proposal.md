# Réconcilier une annulation Code Mode exacte

## Why

OpenCode peut présenter la demande `request_validation` et son annulation dans
des appels MCP imbriqués sous un wrapper Code Mode `execute`. La restauration
du contrôleur ne retrouvait que les outils natifs directs ; une approbation
terminalement `CANCELLED/cancelled_by=OC` restait `PREPARED`.

## What Changes

Réconcilier le même requestId à partir du wrapper natif exact, sans décision,
permission, accès ni `once` supplémentaires.

## Hors périmètre

- Rejouer l’approbation ou créer un requestId de remplacement.
- Clore une opération commencée, une permission ou un effet natif.
- Modifier le RUN de la session bloquée pendant la préparation source.

## Vérification

Les tests couvrent une requête imbriquée, la découverte littérale et l’appel
unique `cancel_approval`, la réponse terminale native et la double relecture
stable. Tout appel ajouté, wrapper tronqué, identité divergente, session
active, permission ou accès conserve l’opération protégée.
