## Why

La largeur variable des colonnes de tokens déplace les compteurs d’un onglet à l’autre. Le tableau peut utiliser davantage de place pour l’état et ses détails.

## What Changes

- Donner aux colonnes Te, CTe, Ts, CTs, Tr, CTr, Tw et CTw la même largeur fixe permettant d’afficher `999 M`.
- Ajouter la largeur d’un espace à Début, Fin, CAB, Agents et Attentes.
- Étendre la colonne État à l’espace restant et accompagner « Terminé » d’une coche verte.

## Capabilities

### Modified Capabilities

- `publication-cycle` précise la largeur des colonnes et l’état « Terminé » des tableaux Cycle.

## Impact

Tables des passages des douze onglets et recette Chromium et Firefox.
