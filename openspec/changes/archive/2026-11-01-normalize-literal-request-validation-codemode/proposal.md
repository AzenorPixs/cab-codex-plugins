# Normaliser les littéraux sûrs de `request_validation` en Code Mode

## Why

Le client CAB ne normalise pas certaines commandes de `request_validation`
exprimées par template littérale ou par une constante string unique. Le
contrôleur refuse alors la corrélation avant notification, même lorsque le
tool call MCP natif est unique et que ses métadonnées portent le payload exact.

## What Changes

- Reconnaître les templates sans interpolation et une unique constante string
  littérale limitée à `commands[0]` du wrapper terminal.
- Continuer d'exiger un seul appel natif complet, non tronqué et identique au
  payload reconstruit.
- Refuser les variables dynamiques, interpolations, statements ou tools
  supplémentaires et toute divergence.

## Out of Scope

- Aucun rejeu, annulation ou remplacement d'une validation en attente.
- Aucune modification d'un projet consommateur ou d'`ancien protocole local`.

## Acceptance Criteria

1. Une commande template littérale sans interpolation et une constante string
   simple sont normalisées uniquement dans leur forme bornée documentée.
2. Le contrôleur corrèle le tool call natif exact, sans permission avant
   admission ni extension des outils acceptés.
3. Les expressions dynamiques, payloads divergents et opérations multiples
   restent `execute` non admis.
