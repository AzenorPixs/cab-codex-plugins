# Corriger le précontrôle de migration réelle — CAB2.2.8

## Why
CABU2.2.7 a échoué avant coupure :son lecteur générique d’artefacts est borné
à4Mio, tandis que le registre disque réel fait20581389octets. Le JSON HTTP
compact et le JSON disque indenté ne partagent pas leur taille.

## What Changes
Employer le lecteur JSON runtime existant, borne64Mio, sans augmenter les
réponses HTTP. Ajouter une régression disque de plus de16Mio. Incrément,
publication,CABU et information des sessions selon mandat SCM existant.

## Impact
Une branche de précontrôle et les versions ; aucune nouvelle dépendance,
autorisation métier ou configuration. Les protections du protocole restent.
