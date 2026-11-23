# Réconciliation des envois et synchronisations de forge

Code non attribué.

## Why

Un envoi ou une synchronisation de forge dont le résultat est incertain bloque les nouveaux aperçus. Le rafraîchissement habituel lit l’état de la forge sans résoudre le reçu incertain.

## What Changes

Donner à l’administrateur une action de vérification sans écriture sur la forge. Libérer la protection d’un reçu incertain lorsque la branche et, selon l’action, les tags observés correspondent exactement à sa cible. Conserver l’incertitude initiale et la preuve de réconciliation.
