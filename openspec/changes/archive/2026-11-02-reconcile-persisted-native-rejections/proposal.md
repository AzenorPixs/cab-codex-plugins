# Réconcilier les rejets natifs persistés après échec de notification

## Why

Une décision native `REJECTED` peut être confirmée dans l’historique OpenCode alors que sa notification au contrôleur a échoué. La validation reste alors localement indécise et bloque le RUN.

## What Changes

Réconcilier cette seule frontière terminale depuis un historique natif stable et exact. Persister atomiquement le rejet et la preuve filtrée, annuler l’opération encore `PREPARED` et restaurer le même état après redémarrage. Aucun appel natif, permission, accès ou `once` n’est émis.

## Hors périmètre

- Rejouer une demande, un rejet ou une commande.
- Reconstruire une approbation ou accepter un état `PENDING`.
- Modifier un autre RUN, une autre session ou les autorisations natives.

## Vérification

Tests isolés positifs et négatifs pour preuve exacte, quiescence, idempotence, redémarrage et absence d’effets.
