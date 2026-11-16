# configure-responsive-profiles — code non attribué

## Why

Les tailles de l’interface responsive ne peuvent pas être ajustées par résolution ni synchronisées entre les pages ouvertes.

## What Changes

- Ajouter six profils de résolution avec une échelle d’interface et une échelle de police.
- Conserver le rendu actuel par défaut et interpoler les valeurs entre profils.
- Stocker les réglages en PostgreSQL et les diffuser aux pages ouvertes via une projection Electric limitée aux préférences d’interface.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `system-platform` : administration et synchronisation des profils responsives.

## Impact

Interface web, API, migration PostgreSQL additive et publication Electric ; aucune nouvelle dépendance.
