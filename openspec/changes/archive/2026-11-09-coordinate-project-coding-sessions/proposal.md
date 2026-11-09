# Coordonner les dépendances des sessions de codage

## Why

Les sessions directes et pilotées d’un projet peuvent dépendre de travaux précis d’autres sessions. Les réservations CAB et l’observation SGS ne fournissent pas de contrat commun de déclaration, d’avis durable et de vérification par chaque destinataire.

## What Changes

- Définir une interface locale commune aux sessions directes et pilotées pour déclarer des dépendances précises, publier des avis sourcés et consulter et acquitter sa propre boîte.
- Conserver les avis pendant les indisponibilités et les pauses, dédupliquer les opérations et préserver les autres sessions ; le destinataire vérifie ses propres critères sur les sources d’autorité.
- Exposer le choix explicite entre pause et arrêt ciblé lorsque les unités indépendantes sont épuisées, sans reprise automatique ni archivage forcé.
- Documenter les interfaces destinées aux prompts et les limites des transports natifs effectivement vérifiés.

## Capabilities

### New Capabilities
- `project-session-dependency-coordination`: Déclarations et avis durables de dépendances entre sessions d’un même projet.

### Modified Capabilities
- `concurrent-run-coordination`: Préserver l’autorité des sources et les protections existantes lors de la coordination entre modes.
- `change-state-erasure`: Effacer la coordination ciblée après preuve de clôture, en conservant les références encore nécessaires aux pairs.

## Impact

Contrat CAB, composants locaux, tests et documentation. Aucune nouvelle dépendance tierce, aucune livraison ni activation dans cette session. Les adaptateurs de prompts relèvent de leur propre session.
