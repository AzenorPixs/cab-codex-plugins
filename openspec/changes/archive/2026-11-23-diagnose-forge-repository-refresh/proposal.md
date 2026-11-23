# Diagnostic du rafraîchissement des forges

Code non attribué.

## Why

Un rafraîchissement manuel peut échouer alors que l’authentification GitLab fonctionne. Les deux parcours n’appliquent pas la même politique TLS. La réponse de rafraîchissement contient seulement un état de disponibilité.

## What Changes

Respecter le réglage TLS GitLab existant et retourner les étapes expurgées de la tentative manuelle. En cas d’échec, ouvrir la console de cette tentative dans l’Overview. Conserver les observations valides et le fonctionnement en arrière-plan.
