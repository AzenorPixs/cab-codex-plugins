## Why

Un index OCI peut servir d'identifiant local Docker. CAB 3.32.0 ne reconnaît que les empreintes de configuration des manifestes enfants et laisse alors le reçu en UNKNOWN malgré les tags présents sur le registre, comme pour PFD 1.0.2 sur Forgejo.

## What Changes

- Vérifier aussi l'empreinte exacte des descripteurs OCI de tous les tags publiés.
- Permettre à l'administration de réconcilier le reçu précis sur preuve, en conservant son état initial et sans déclencher d'écriture sur la forge.
