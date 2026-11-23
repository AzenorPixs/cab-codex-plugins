# Rendre le démarrage de l’API CAB fiable

## Why

Le démon peut envoyer un signal SIGHUP avant que l’enfant API ait installé son gestionnaire. L’API quitte alors pendant le démarrage et CABU expire en attendant une réponse.

## What Changes

L’API lit sa configuration au démarrage. Le démon attend une réponse du processus API avant de lui transmettre une demande explicite de rechargement.
