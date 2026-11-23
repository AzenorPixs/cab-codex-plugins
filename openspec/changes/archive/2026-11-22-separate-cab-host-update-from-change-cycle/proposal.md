# Séparer la mise à jour de l’hôte du cycle du change

## Why

Les étapes du change doivent rester indépendantes du projet et de son installation locale. La présentation des durées doit se limiter aux valeurs.

## What Changes

Clôturer le change sur ses preuves de publication. Exécuter la mise à jour de l’hôte séparément via cab update et cab-update.service, conserver le reçu système, puis annoncer son résultat dans la session.
