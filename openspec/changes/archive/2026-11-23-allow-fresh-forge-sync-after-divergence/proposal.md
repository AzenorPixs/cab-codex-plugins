# Synchronisation bidirectionnelle des forges

Code non attribué.

## Why

La vérification d’un reçu incertain signale la divergence mais laisse l’Overview sans parcours de reprise. La synchronisation existante utilise exclusivement le dépôt local comme source.

## What Changes

Montrer l’écart et permettre une clôture explicite du reçu incertain. Pour les trois forges, demander si le dépôt local ou la forge sert de source. Afficher la branche destinataire et les modifications des tags avant confirmation. Exiger un dépôt local propre avant l’alignement sur la forge.
