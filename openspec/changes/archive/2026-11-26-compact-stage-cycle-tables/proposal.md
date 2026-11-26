## Why

Les tableaux des passages occupent trop de place et ne montrent pas la progression des compteurs de tokens au fil des cycles.

## What Changes

- Ajuster les libellés et les largeurs au contenu dans les douze onglets d’étape.
- Afficher les cumuls CTe, CTs, CTr et CTw immédiatement après leurs compteurs respectifs pour chaque rôle applicable.
- Garder chaque passage sur une ligne et limiter le défilement horizontal aux cas où le tableau dépasse l’espace disponible.
- Accompagner l’état « En cours » d’une icône animée qui respecte la préférence de réduction des animations.
- Accompagner l’état « Annulé » d’un triangle jaune avec un point d’exclamation.

## Capabilities

### Modified Capabilities

- `publication-cycle` couvre les tableaux des passages dans les douze onglets du RUN.

## Impact

Composants et styles du détail de session, et recette Chromium et Firefox.
