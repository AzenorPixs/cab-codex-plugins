# Politique TLS de l’authentification Forgejo

Code non attribué.

## Why

L’authentification Forgejo doit accepter les certificats TLS de la forge quels qu’ils soient, sans réglage par projet.

## What Changes

Accepter tout certificat TLS pour l’authentification Forgejo et la vérification du dépôt. La console signale ce mode. Les résultats issus de l’ancienne politique TLS vérifiée sont invalidés.
