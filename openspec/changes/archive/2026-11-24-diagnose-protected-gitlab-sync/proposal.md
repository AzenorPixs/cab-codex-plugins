## Why

Sur PFD, la synchronisation de Git local vers GitLab prépare la transaction, puis la branche protégée refuse le remplacement d'une tête divergente bien que le compte puisse pousser normalement.

## What Changes

- Vérifier à l’aperçu et à la confirmation les refus GitLab attestés sur la branche ciblée.
- Distinguer l’interdiction de pousser de l’interdiction d’un remplacement non fast-forward.
- Conserver l’envoi atomique et les leases pour les synchronisations permises.
