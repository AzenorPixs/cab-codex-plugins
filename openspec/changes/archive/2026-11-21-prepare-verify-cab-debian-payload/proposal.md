# Régénérer et vérifier le paquet Debian CAB

## Why

Le paquet Debian 3.6.0 annonçait cette version dans son contrôle Debian tout
en distribuant le contenu préparé pour la 3.5.0. CABU l’a refusé avant APT.

## What Changes

La fabrication native de la recette qui installe le runtime CAB prépare le
frontend, le code Python et le manifeste dans un espace neuf. Le constructeur
et la publication vérifient le paquet réel avant de le rendre disponible.
