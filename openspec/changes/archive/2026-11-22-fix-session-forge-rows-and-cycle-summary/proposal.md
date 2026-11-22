# Corriger les informations de session — code non attribué

## Why
La disposition diffère des blocs forge et le chargement séparé des étapes peut masquer les compteurs persistés.

## What Changes
Une ligne libellé/valeur par information dans le corps du bloc. La synthèse persistée est renvoyée par le détail du RUN.

## Impact
Interface et API du détail du RUN. Contrôles navigateur et Electric.
