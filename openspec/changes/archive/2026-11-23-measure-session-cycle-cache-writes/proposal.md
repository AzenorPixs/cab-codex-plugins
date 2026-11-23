## Why

Le suivi des cycles expose les lectures depuis le cache. Codex et OpenCode peuvent aussi fournir un compteur natif d’écriture dans le cache.

## What Changes

Afficher Te et Ts pour l’entrée et la sortie, Tr pour la lecture du cache et Tw pour son écriture. Appliquer à Tw les mêmes fenêtres, cumuls par rôle et mises à jour que pour Tr.

## Impact

La collecte native, le stockage PostgreSQL et les vues des sessions et des changes évoluent. Les relevés historiques sans valeur d’écriture restent consultables.
