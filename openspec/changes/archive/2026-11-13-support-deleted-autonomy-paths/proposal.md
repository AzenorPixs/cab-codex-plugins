## Why
La suppression autorisée SGS.md ne doit ni recréer un fichier ni empêcher
la qualification du RUN existant. Le hash accepte l’absence mais l’atelier
tentait encore lstat/bind du chemin absent, avant effet.

## What Changes
Ignorer le montage d’un chemin cadré absent, garder le projet RO et les
contrôles de liens/périmètre, test effectif et livraison3.1.2.
