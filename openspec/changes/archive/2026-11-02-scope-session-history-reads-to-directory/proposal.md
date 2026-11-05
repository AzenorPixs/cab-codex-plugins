# Cibler l’historique natif sur la location de session

## Why

La lecture paginée des messages recevait un répertoire de session, mais le
client HTTP omettait ce répertoire dans son en-tête de location. Le serveur
OpenCode pouvait donc servir l’historique de la location par défaut du client.
Un grand historique a alors atteint la limite de pagination pendant la
réconciliation d’une validation déjà annulée.

## What Changes

- Chaque page de `messages(sessionId, directory)` cible explicitement la
  location `directory` via `x-opencode-directory`.
- Les tests couvrent un client dont la location par défaut diffère de celle de
  la session, avec pagination sur plusieurs pages.
- Aucun transcript, RUN, accès, permission ou décision n’est modifié par la
  correction du client.

