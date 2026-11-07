## Why
Une permission shell native à trois ressources provoque une erreur répétée et empêche l’observation du RUN PA01.

## What Changes
- Qualifier la source native et la couverture littérale complète de la commande pour les ressources multiples.
- Empêcher les observations simultanées et répéter le diagnostic seulement si la cause change.
- Conserver les protections et refuser les corrélations ambiguës.

## Capabilities
### Modified Capabilities
- `opencode-v2-transport`: corrélation des ressources shell natives.

## Impact
Client OpenCode, observation du job, documentation et tests ciblés ; aucun rejeu ni mutation implicite d’une permission.
