# Retirer les instantanés SGS des sessions libérées

## Why

Un rapport BLOQUÉ d’un change ouvert peut être conservé dans SGS après la
libération d’une session directe. Son réimport peut recréer les données
supprimées alors que le rapport métier doit rester intact.

## What Changes

Ajouter une opération SGS ciblée sur les sessions libérées d’un rapport ouvert.
Elle retire leurs instantanés runtime, protège les pairs et empêche leur
réimportation sans masquer les observations nouvelles. Le fichier source,
les statistiques globales et les preuves métier restent inchangés.
