# Scope terminal NO_EFFECT proof to its native turn

## Why

Une récupération NO_EFFECT prouvée peut rester UNKNOWN lorsqu’un événement
read-only de broker arrive après le watermark terminal et sans messageId.
L’événement appartient à un tour ultérieur, mais le contrôleur le traite comme
une ambiguïté du tour déjà terminé.

## What Changes

- Limiter les parties d’effet inspectées aux trois messages exacts du tour
  utilisateur terminal.
- Ignorer pour l’association de ce tour uniquement les événements d’une
  séquence durable supérieure au watermark conservé ; les événements
  non corrélés à la frontière restent bloquants.
- Conserver la double lecture stable du transcript et du journal complet.

## Out of Scope

- Réinterpréter une permission consommée ou un callID existant.
- Modifier l’opération C12 `-03`, réattribuer une fin native ou rejouer `once`.
- Détendre les contrôles de révision, quiescence ou intégrité.
