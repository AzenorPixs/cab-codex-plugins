## Why

Un refus Git peut présenter le même message qu'une perte de réponse. Des actions des Forges affichent leurs erreurs hors de leur Overview et la publication d'artefacts masque le détail du reçu.

## What Changes

- Identifier les refus Git prouvés par le résultat du transfert et préserver la protection des résultats incertains.
- Présenter les erreurs des actions Git locales et distantes dans leurs Overviews.
- Expliquer les prérequis Docker manquants et les échecs de publication dans l'Overview de la forge.

## Capabilities

### Modified Capabilities

- `system-platform`: distinguer les refus Git des résultats indéterminés.
- `local-web-monitor`: afficher les diagnostics des actions Git et de publication.

## Impact

Moteur Git et publication CAB, interface Forges et tests. Les reçus historiques restent lisibles. Le transfert conserve l'aperçu, les leases et l'envoi atomique.
