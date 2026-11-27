## Why

Lorsque plusieurs modèles se succèdent, le coût estimé d’un passage doit répartir les tokens selon la durée de chaque modèle.

## What Changes

- Pondérer chaque tarif par la durée exacte du segment pour son rôle.
- Conserver l’arrondi du total, la persistance en session et la mise à jour Electric.
- Écarter les chronologies discontinues de l’estimation.

## Capabilities

### Modified Capabilities

- `publication-cycle` fixe le prorata temporel.

## Impact

Calcul des montants dans la projection du RUN.
