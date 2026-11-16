# scope-responsive-profiles-by-page — code non attribué

## Why

Les ajustements effectués depuis une page modifiaient toutes les pages, empêchant leur réglage individuel.

## What Changes

- Conserver une référence responsive propre à chaque page et à chaque résolution.
- Appliquer les valeurs globales comme multiplicateurs des références de chaque page, sans les remplacer.
- Synchroniser les réglages des pages ouvertes par PostgreSQL et Electric.
- Proposer les commandes de page dans le bandeau lorsque le mode développeur est actif.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `system-platform` : portée des profils responsives et mode développeur.

## Impact

Interface web, API et préférences PostgreSQL existantes ; aucune nouvelle dépendance ni nouvelle table.
