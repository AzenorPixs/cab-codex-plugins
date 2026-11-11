## Why

Les modes 0770 et 2770 sur le reporting du broker et l'état d'exécution
externe empêchent le fonctionnement malgré des droits de groupe autorisés.

## What Changes

Accepter ces modes pour le reporting, les journaux d'exécution et les hôtes
connus, conserver les anciens modes et créer les fichiers concernés en 0770.
Cette première livraison débloque le parcours externe ; les autres briques
restent suivies par `support-cab-permission-resilience`.
