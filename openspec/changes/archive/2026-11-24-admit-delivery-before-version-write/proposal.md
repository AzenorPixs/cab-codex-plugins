# Admettre la livraison avant de modifier la version

## Why

Le dernier contrôle de liaison du connecteur pouvait refuser la publication
après l’écriture de la nouvelle version du projet. Aucune livraison durable
n’existait alors pour cette version et la proposition du codeur devenait périmée.

## What Changes

Effectuer les contrôles d’admission avant d’enregistrer la livraison. Confier
l’écriture et la projection de la version aux étapes durables du worker.
Conserver le comportement des livraisons déjà enregistrées.
