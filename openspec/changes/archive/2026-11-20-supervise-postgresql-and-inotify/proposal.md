# Superviser PostgreSQL et les veilles inotify

## Why
Les processus PostgreSQL et les veilles noyau de CAB peuvent tomber hors des parcours de mise à jour.

## What Changes
- Inventorier le processus principal du cluster PostgreSQL CAB.
- Démarrer uniquement le cluster CAB confirmé arrêté, une fois par panne.
- Reconstruire une fois une veille inotify interrompue.
- Consigner et notifier le résultat horodaté.
