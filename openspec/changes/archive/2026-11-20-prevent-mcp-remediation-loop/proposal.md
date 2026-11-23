# Empêcher les remédiations MCP successives

## Why

Sur l’hôte, plusieurs pertes historiques de Codex CLI empêchent l’association de la liaison de remplacement à un reçu individuel. Les contrôles natifs déjà terminés s’enchaînent alors que le connecteur actif répond et charge la version de CAB.

## What Changes

Vérifier la présence d’un unique remplaçant sain de la même instance et du même emplacement avant de remédier à une perte. Clore l’observation devenue sans objet avec la preuve du remplaçant, sans attribuer son rétablissement à un contrôle. Revérifier cette preuve à l’admission d’un contrôle et à la réclamation d’une relance par le relais.
