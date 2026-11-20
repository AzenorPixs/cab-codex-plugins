# Exiger le catalogue avant d’afficher un connecteur actif

## Why
La remédiation attend le catalogue, mais la projection affichait une liaison active dès CATALOG_PENDING.

## What Changes
Aligner la projection temps réel sur une preuve de catalogue et éviter une nouvelle relance pendant l’attente du client.
