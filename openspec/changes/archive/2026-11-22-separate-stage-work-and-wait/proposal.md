# Séparer travail, attente et relances de session

## Why

Un passage d’étape peut rester ouvert pendant des heures même si l’agent a terminé son tour. L’Overview doit distinguer le travail observé de cette attente et restituer les horaires connus de Revue et de Clôture.

## What Changes

Croiser les passages PostgreSQL avec les intervalles attestés pour afficher le travail et l’attente séparément. Relancer le codeur ou l’orchestrateur qui doit agir selon trois délais réglables dans Administration → Agents.
