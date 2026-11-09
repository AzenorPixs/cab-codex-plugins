# Compatibilité des droits de la clé HMAC avec DIU

## Why

DIU réapplique des droits récursifs au compte DevOps ; le broker refuse alors la clé HMAC existante. Le développeur a validé une clé en 0770 et la coordination du traitement avec DIU.

## What Changes

- Accepter les droits du groupe autorisé sur la clé locale tout en refusant tout accès aux autres comptes.
- Créer les nouvelles clés en 0770, conserver la compatibilité des clés privées existantes et contrôler les identités.
- Tester les modes, les propriétaires, les liens et la préservation du journal.

## Capabilities

### New Capabilities

### Modified Capabilities
- `approval-persistence`: préciser les droits et la validation de la clé HMAC locale.

## Impact

Broker, tests et documentation CAB ; coordination avec le change DIU `preserve-cab-hmac-key-permissions`.
