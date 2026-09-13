# Changelog

Toutes les évolutions significatives de CAB seront documentées dans ce fichier.

## Unreleased

- Correction de la validation des mandats unitaires : une commande unique peut
  désormais être validée avec une liste `files` vide.
- Passage à des mandats unitaires : Codex pilote et valide chaque opération
  OpenCode, y compris l’archivage OpenSpec ; CAB ne transmet qu’une décision
  corrélée à une permission native unique.
- Alignement du plugin, de la commande `/cab` et des cadrages sur la session
  OpenCode persistante et l'état MCP natif `/mcp`.
- Correction de la documentation des variables du broker vers les noms
  effectivement implémentés `CGPT_*`.
- Uniformisation de la terminologie utilisateur sur Codex, tout en conservant
  les identifiants techniques historiques `cgpt-validation` et `CGPT_*`.
- Établissement du socle OpenSpec des capacités CAB.
- Normalisation de l'arborescence du plugin Codex.
- Déplacement de la marketplace Codex et du plugin à la racine du dépôt pour la distribution GitHub privée.
- Réparation du contrat HTTP du contrôleur local.
