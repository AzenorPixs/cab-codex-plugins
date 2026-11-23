# Clôture Git des sessions et versions sans préfixe

## Why

Les rapports finaux sont actuellement amendés après le commit de livraison et restent hors du dépôt distant. Une clôture achevée ou bloquée doit conserver ces documents et leur envoi confirmé. Les versions et tags produits par CAB doivent suivre une règle unique sans préfixe v.

## What Changes

- Indexation immédiate des rapports CAB et de BLOCKERS.md attribuable à la session.
- Dernier commit limité aux statistiques du change, au global et aux blocages éventuels ; envois vérifiés avant clôture.
- Reçus PostgreSQL et conservation des effets incertains, sans double commit ni reprise aveugle.
- Versions du projet, tags Git, tags et versions de release sans v ; défaut égal à la version du projet.
- SCM et CI/CD 3.2.17, builds DIU et releases DIU différées ; prompts partagés maintenus en pause.
