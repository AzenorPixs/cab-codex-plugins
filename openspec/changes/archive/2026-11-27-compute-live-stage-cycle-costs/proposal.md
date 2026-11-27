## Why

Le détail des étapes doit afficher le montant calculé à partir des tokens tarifés et les changements de modèle du passage.

## What Changes

- Persister les montants calculés dans la session et les actualiser via Electric.
- Délimiter les modèles successifs et agrandir les colonnes de tokens et de coût.

## Capabilities

### Modified Capabilities

- `publication-cycle` définit les montants calculés et les segments d’agents.

## Impact

Projection de session PostgreSQL, collecte native et tableau Cycle.
