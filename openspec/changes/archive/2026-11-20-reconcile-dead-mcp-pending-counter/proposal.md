# Rétablir CABU après un heartbeat ancien

## Why

Un relais et son moteur déjà arrêtés peuvent conserver un compteur de transport actif dans le dernier heartbeat. Ce compteur peut bloquer indéfiniment le redémarrage de l’instance Codex.

## What Changes

Écarter ce compteur de la frontière de reprise lorsque les deux sorties sont prouvées, que le dernier heartbeat est ancien et que les protections des effets réels sont satisfaites. Inscrire cette observation au reçu de reprise.
