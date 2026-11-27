## Why

Les tests en lecture mobilisent les fichiers du mandat et peuvent empêcher
une autre session de préparer ses écritures.

## What Changes

- Limiter les verrous de fichiers aux écritures exactes et les libérer dès la fin de l’écriture.
- Exécuter les tests en lecture seule dans un atelier temporaire.
- Annoncer l’échéance du verrou d’écriture une minute à l’avance et notifier sa restitution.

## Capabilities

### Modified Capabilities

- `system-platform` fixe la portée, l’échéance et la restitution des verrous.

## Impact

Moteur de réservation, exécuteur local, préparation Git et intégrations CAB.
