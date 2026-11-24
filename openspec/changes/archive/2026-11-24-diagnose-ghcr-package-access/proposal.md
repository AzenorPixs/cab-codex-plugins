## Why

Une publication PFD vers GHCR échoue en HTTP 403 avant le premier envoi. L’Overview attribue le refus de lecture GitHub Packages à l’envoi Docker, alors que le jeton finement configuré n’est pas compatible. Forgejo et GitLab doivent bénéficier du même contrôle d’accès avant envoi.

## What Changes

- Qualifier le type de jeton GitHub et la lecture de l’inventaire du registre au prévol pour les trois forges.
- Lire et nettoyer les versions d’un paquet personnel par le chemin authentifié lorsque le compte connecté est son propriétaire.
