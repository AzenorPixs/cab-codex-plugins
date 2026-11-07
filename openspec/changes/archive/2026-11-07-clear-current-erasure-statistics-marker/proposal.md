## Why
Le nettoyage Z27 a rencontré dans SGS le marqueur transitoire du reçu d’effacement courant, ce qui empêche sa propre projection.

## What Changes
- Retirer ce seul marqueur du checkpoint broker et de son outbox pendant la transaction correspondante.
- Préserver les autres statistiques et refuser les références étrangères non classées.

## Capabilities
### Modified Capabilities
- `change-state-erasure`: projection du marqueur statistique de la transaction courante.

## Impact
Nettoyage SGS, tests ciblés et documentation ; aucune modification d’un RUN vivant ni décision de permission.
