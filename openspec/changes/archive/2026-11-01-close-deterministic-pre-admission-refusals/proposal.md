## Why

Une requête `request_validation` peut rester `PENDING` dans le broker après un
refus HTTP 400/409 du contrôleur. Le refus est persisté comme diagnostic de
notification, mais le poll continue à demander `poll_approval` alors que le
contrôleur ne possède aucune validation ni décision. Pour `resource-revision-stale`,
cette attente ne peut pas devenir une admission valide et bloque inutilement
la session.

## What Changes

Ajouter l’état terminal `NOT_ADMITTED` pour les seuls diagnostics HTTP filtrés
et déterministes de la liste fermée du contrôleur. Conserver l’approbation et
son diagnostic dans le journal ; ne créer ni rejet, ni décision, ni accès, ni
permission. Les erreurs transitoires, absentes ou inconnues restent `PENDING`
et suivent leur attente/retry borné existant.
