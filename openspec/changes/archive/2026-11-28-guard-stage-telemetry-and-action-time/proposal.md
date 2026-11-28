## Why

Une étape peut afficher des compteurs absents malgré un travail agent observé. Le temps mural des étapes comporte aussi des périodes sans action enregistrée et des actions qui se chevauchent.

## What Changes

- Conserver l’historique des modèles pour chaque passage et diagnostiquer les mesures indisponibles.
- Demander à la session responsable de vérifier sa télémétrie native si CAB atteste du travail sans mesure.
- Ventiler le temps de chaque passage entre les actions visibles et le temps hors action.

## Capabilities

### Modified Capabilities

- `publication-cycle` précise la qualification de la télémétrie et la ventilation des actions.

## Impact

Projection des étapes, relances natives et tableau Actions.
