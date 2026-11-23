# Politique TLS de l’authentification GitLab

Code non attribué.

## Why

Sur le poste professionnel, CAB atteint la forge GitLab mais la vérification du certificat échoue. Le contrôle d’authentification ignore le paramètre `REMOTE_GITLAB_SSL_VERIFY` existant.

## What Changes

Appliquer la désactivation explicite configurée à l’authentification GitLab et à son repli par le dépôt. Signaler ce mode dans la console et invalider le résultat mémorisé si la politique effective change.
