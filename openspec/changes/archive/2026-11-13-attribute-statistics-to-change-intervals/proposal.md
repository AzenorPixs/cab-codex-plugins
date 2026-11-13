## Why
Les totaux natifs de session ne prouvent pas la consommation d’un change lorsque
plusieurs changes partagent le SID. Le développeur demande des mesures bornées,
avec un contexte exclusif par SID, bascule autonome et agrégation multi-RUN/SID.

## What Changes
Périodes de mesure persistées et API CLI/MCP de début/fin/export. Deux instantanés
natifs donnent les écarts observés ; aucune reconstruction rétroactive ou mesure
partagée complète n’est inventée. Les anciennes valeurs de session sont distinguées.

## Capabilities
- system-platform : périodes statistiques propres au change.
