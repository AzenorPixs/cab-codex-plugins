# Reprendre CABU en avant après un rollback contrôleur incomplet

## Why

Une coupure CABU peut installer un contrôleur plus récent puis échouer à son démarrage. Le rollback vers l’ancienne brique peut à son tour échouer si l’état durable contient une extension que cette version ne sait pas lire. Le reçu reste alors `ROLLBACK_FAILED` et empêche une mise à jour réparatrice.

## What Changes

Ajouter une reprise avant liée au reçu exact, uniquement pour un échec de démarrage contrôleur vérifié, avec conservation du reçu et des sauvegardes puis nouveau déploiement publié. Normaliser les empreintes de rejet vers des champs déjà compris par les versions antérieures. Aucune lecture ou modification des RUN n’est nécessaire.

## Non-Goals

- Recharger les locations OpenCode ou répondre à des permissions.
- Réécrire ou effacer le reçu d’échec, les données RUN ou les checkpoints.
- Démarrer une source locale non publiée.

## Verification

Tester les frontières de reprise, le maintien des preuves, le refus d’une dérive d’artefact et la compatibilité du registre après redémarrage.
