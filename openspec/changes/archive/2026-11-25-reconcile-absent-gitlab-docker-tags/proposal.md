# Débloquer la republication GitLab après absence confirmée des deux tags

## Why

Sur Fusion Directory, le push Docker avait été déclaré terminé. Les vérifications ont échoué et le reçu est resté incertain, ce qui désactive la publication. Le registre accessible confirme que les deux références exactes sont absentes.

## What Changes

CAB vérifie les deux références et l’identité du dépôt GitLab, y compris pour les reçus dont les tentatives historiques sont épuisées. Si les deux tags sont absents, le reçu conserve son état d’origine dans l’historique et la publication suivante reste déclenchée par l’administrateur.
