## Why

Cycle doit regrouper les compteurs et les coûts. Le détail des étapes doit indiquer les agents et réglages réellement observés par passage.

## What Changes

- Regrouper les colonnes de tokens puis de coûts.
- Persister les observations des agents en PostgreSQL et présenter le tableau Agents aligné sous Cycle.
- Résoudre le fournisseur dans le catalogue et conserver l’indication d’indisponibilité quand la preuve manque.

## Capabilities

### Modified Capabilities

- `publication-cycle` précise l’ordre des colonnes et ajoute le détail des agents observés.

## Impact

Migration PostgreSQL, collecte native, diffusion du détail d’étape et interface des douze sous-onglets.
