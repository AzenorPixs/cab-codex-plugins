# Observer l’API OpenCode lorsque son écoute IPv4 accepte le loopback

## Why

Sur l’hôte, OpenCode écoute sur toutes les interfaces IPv4. La surveillance CAB excluait cette écoute de la recherche du port local et ne pouvait pas interroger l’état MCP natif.

## What Changes

Prendre en compte les sockets appartenant au processus qui écoutent sur 127.0.0.1 ou 0.0.0.0. Conserver la requête sur 127.0.0.1 et vérifier l’identité du processus répondant.
