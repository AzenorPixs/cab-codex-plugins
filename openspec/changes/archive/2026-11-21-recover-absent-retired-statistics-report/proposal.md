# Réconcilier le rapport retiré sans ancienne entrée Git

## Why

Le job statistique arrêté5a56bde066ab72173c5e507d165a950d bloque la clôture du RUN de récupération332. Son rapport en attente visait un change désormais archivé ; l'ancien chemin est absent du dossier, de HEAD et de l'index.

## What Changes

Étendre le constat sans effet à cette absence vérifiée par Git, en conservant les contrôles des rapports achevés, des producteurs arrêtés, des verrous et de l'archive unique. Aucun autre RUN n'est modifié et aucune publication initiale n'est rejouée.
