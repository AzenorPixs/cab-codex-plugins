# Mesurer les tokens des cycles de session

## Pourquoi

Les compteurs natifs existent mais le détail des douze étapes affiche seulement les durées. L’usage doit être visible au même niveau de détail et au niveau du change.

## Modification

- Conserver les incréments natifs entiers en PostgreSQL, avec leur provenance numérique et leur rattachement projet, change, session, RUN, étape et action éventuelle.
- Cumuler Te (entrée), Ts (sortie) et Tc (lecture du cache) par action, étape, cycle, ensemble de cycles et change, en distinguant le codeur et l’orchestrateur.
- Afficher les cumuls de la dernière itération dans Résumé et les compteurs dans les tableaux, avec mise à jour Electric.

## Validation

Qualification PostgreSQL isolée, TypeScript, construction frontend et Chromium/Firefox. Migration additive et réversible, puis livraison CICDF et activation CABU vérifiée.

Le développeur a également demandé l’ajout de mandats à une session active, avec un reçu complémentaire dans la chronologie du RUN et conservation de la validation initiale.
