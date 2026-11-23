## Why

Les mises à niveau Debian vers CAB 3.18.0 et 3.18.1 sont restées en attente de configuration après une collision sur le slot persistant Electric. Electric 1.8.1 reconnaît la collision par le code PostgreSQL et par le texte anglais exact.

## What Changes

- Fixer la langue des messages PostgreSQL pour le seul rôle Electric dans la base CAB, dès l’amorçage et avant le redémarrage Debian.
- Vérifier le slot existant pendant la maintenance. Préserver son WAL et le stockage Electric lors d’une mise à niveau ordinaire.
- Qualifier la reprise des abonnements, la resynchronisation si le slot manque et la finalisation Debian sur PostgreSQL 17 francophone.

## Capabilities

### Modified Capabilities

- `system-platform`: définir la reprise de la réplication lors d'une mise à jour Debian.

## Impact

Amorçage, maintenance du paquet, tests et procédure de qualification Debian.
