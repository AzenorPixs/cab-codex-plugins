# Autorisation de reprise nécessaire à CABU

## Why
Une mise à jour CABU déjà autorisée exigeait une seconde confirmation pour reprendre son client natif. Cette répétition bloque la livraison sans apporter de décision nouvelle.

## What Changes
- La demande CABU porte une autorisation de reprise limitée à son demandeur authentifié, son UID, son instance kernel et la version installée.
- Le service conserve ce périmètre dans le reçu, expose son admissibilité et vérifie à nouveau les protections avant une reprise.
- Le demandeur peut révoquer cette autorisation avec native.control.configure ; les états inconnus ne sont jamais rejoués.
- Skills et commandes utilisent cette autorité sans question supplémentaire. Une absence de mécanisme technique reste un blocage explicite.

## Impact
Service de mise à jour, contrôle natif, contrat public, intégrations et tests ciblés. Aucun changement DIU, aucune commande arbitraire, aucune nouvelle dépendance.
