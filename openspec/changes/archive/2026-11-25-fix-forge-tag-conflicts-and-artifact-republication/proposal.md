# Fiabiliser les envois et les republications sur les trois forges

## Why

Fusion Directory a deux tags de même nom autour d’un changement de commit. Le commit envoyé est en tête de branche sur les trois forges mais deux tags distants désignent encore l’ancien commit. Sur pmidpoint, la republication Docker réussit sur deux forges et GitLab laisse un transfert incertain. Les liens d’artefacts de la carte héritent du style global des boutons.

## What Changes

- Faire afficher et aligner les tags divergents par CAB à la confirmation d’« Envoyer », avec contrôle des références et traitement sans mutation des références identiques.
- Donner aux liens des tags Docker et Debian la présentation des autres liens des cartes.
- Qualifier la publication et la republication Docker avec les reçus réels et corriger la lecture des manifestes si le certificat du registre n’est pas reconnu.
