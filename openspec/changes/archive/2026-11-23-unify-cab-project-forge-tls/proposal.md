# Politique TLS commune aux forges configurées

Code non attribué.

## Why

L’authentification, l’observation du dépôt, les commandes Git et la publication n’appliquent pas la même politique TLS. Un dépôt accessible dans l’Overview peut donc échouer dès l’aperçu de l’envoi.

## What Changes

Appliquer une politique commune aux connexions API et Git pilotées par CAB vers les trois forges configurées. Retirer les paramètres historiques de la projection et de l’éditeur. Conserver les contrôles d’intégrité et la politique de téléchargement CABU.
