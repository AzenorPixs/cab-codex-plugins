## Why
L’observation multi-ressources doit rester distincte d’une autorisation d’exécuter la commande complète.

## What Changes
- Conserver l’observation vérifiée et refuser toute once pour plusieurs ressources shell.
- Préserver le rejet propriétaire journalisé et les protections de RUN.

## Capabilities
### Modified Capabilities
- `opencode-v2-transport`: garde d’exécution des permissions décomposées.

## Impact
Client, contrôleur de job, tests ciblés et documentation ; aucune permission réelle n’est répondue par le correctif.
