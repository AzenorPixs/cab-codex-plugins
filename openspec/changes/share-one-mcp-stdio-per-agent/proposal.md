# Partager une seule connexion MCP stdio par agent

## Why
Plusieurs sessions du même agent ouvrent actuellement leurs propres canaux stdio. Le partage peut les réduire à une liaison par type d’agent, à condition de conserver la provenance native de chaque appel.

## What Changes
Qualifier le partage par client, isoler les rattachements RUN sur la connexion partagée et surveiller l’unicité et la version. Publier une notification au début d’un écart puis au retour vérifié à l’état attendu.
