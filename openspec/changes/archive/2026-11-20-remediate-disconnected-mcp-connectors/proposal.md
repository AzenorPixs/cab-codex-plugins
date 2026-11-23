# Surveiller et rétablir les connecteurs MCP

## Why
La perte d’un connecteur peut laisser un agent encore actif sans accès MCP. Le développeur doit pouvoir suivre la remédiation et les processus concernés.

## What Changes
- Détecter le passage actif vers inactif et tenter une récupération bornée, sous preuve d’identité et de disponibilité.
- Publier un rapport horodaté de résultat dans les notifications.
- Conserver dans PostgreSQL les binaires suivis et leur état. Distinguer le démarrage normal du démarrage pendant une mise à jour.
