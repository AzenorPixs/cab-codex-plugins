## Why
Une lecture exacte absente est signalée comme invalide et peut être prise à tort pour une corruption avant un premier rejet.

## What Changes
- Distinguer absence et reçu invalide dans la lecture exacte, sans créer de reçu ni autoriser un rejet.
- Documenter la voie propriétaire et conserver les protections des issues incertaines.

## Capabilities
### Modified Capabilities
- `orchestrator-recovery-policy`: diagnostic exact de présence d'un reçu.

## Impact
Client de journal, contrat distribué et tests ciblés ; aucune permission rejouée.
