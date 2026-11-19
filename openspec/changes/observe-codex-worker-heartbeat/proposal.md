# Observer le moteur d’un relais Codex

## Why
Le relais de bureau répond après relance mais aucun heartbeat n’est publié tant que sa version reste inconnue.

## What Changes
- Rapporter la version émise au démarrage par le worker attaché au relais.
- Conserver la lecture réelle du catalogue comme condition de READY.
- Autoriser une demande de version plus récente depuis le frontend déjà relancé si le reçu antérieur attendait seulement ses connexions.
