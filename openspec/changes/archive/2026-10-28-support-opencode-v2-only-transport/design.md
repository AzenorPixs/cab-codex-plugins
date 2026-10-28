# Conception

## Client HTTP V2 commun

Toutes les briques CAB distribuées dans cette version auront la version commune `2.0.0`.

Ajouter un client natif partagé par contrôleur, superviseur, healthcheck, moniteur, outil de mise à jour, réparation et métadonnées. Il construira exclusivement des URL `/api/...`, refusera les redirections et les réponses non JSON pour les routes JSON, appliquera des limites de taille, validera les structures et retournera des erreurs CAB stables sans corps d'erreur OpenCode.

Au démarrage, `GET /api/info` doit retourner un `ServerInfo` valide, un numéro de version analysable de majeure 2 et un PID positif. Un `401`, une réponse HTML, une version V1 ou une structure inconnue bloque le client avant toute opération. Aucun repli vers une route V1 n'est permis.

Le client fournira la variable non secrète `OC_Codex_OPENCODE_PASSWORD_FILE` avec défaut `~/.config/cab-approval-bridge/opencode.password`. OpenCode V2 utilise le nom Basic Auth fixe `opencode`; son serveur est lancé avec `OPENCODE_PASSWORD` défini sans l'inscrire dans le dépôt ou une ligne de commande. Le credential CAB doit être un fichier ordinaire, sans lien symbolique ni liens multiples, appartenant à l'utilisateur courant, lisible uniquement par son propriétaire, de taille bornée et constitué d'une seule ligne UTF-8 non vide. Les unités systemd le recevront via `LoadCredential`; les commandes locales liront le même fichier par le client. La valeur ne sera conservée qu'en mémoire pour construire l'en-tête Basic Auth et ne sera jamais incluse dans une erreur ou un journal.

## Adaptation des contrats V2

- Santé et version : `GET /api/info`.
- MCP : `GET /api/mcp`; normaliser `data[]` en état de serveur et vérifier `cgpt-validation`.
- Réconciliation MCP : `POST /api/experimental/mcp/{server}/disconnect` puis `/connect`, uniquement à une frontière de maintenance déjà autorisée, suivi d'une relecture MCP.
- Sessions : `GET/POST /api/session`, `GET /api/session/{id}`, `GET /api/session/active`, et `GET /api/session/{id}/message` avec pagination explicite.
- Mandats : `POST /api/session/{id}/prompt` avec corps V2 `text`, `resume` et pièce jointe si applicable; préserver le mode sans réponse jusqu'à l'approbation CAB.
- Permissions : `GET /api/permission/request`, `GET /api/session/{id}/permission`, et réponse `POST /api/session/{id}/permission/{requestId}/reply` avec `decision: once`. Normaliser les champs V2 `action`, `resources`, `metadata`, `id` vers les invariants CAB sans relâcher les contrôles de session, commande, cible et corrélation.
- Événements : `GET /api/event`; parser les événements V2, puis réconcilier via HTTP après chaque reconnexion, débordement ou divergence.

Les routes V2 de permissions, les sessions et le flux d'événements ont un statut expérimental dans la référence officielle. Les tests de contrat et la vérification au démarrage sont donc obligatoires; toute évolution non reconnue échoue de façon fermée.

## Secret et réseau

Le dépôt ne crée pas le credential. La documentation demande à l'opérateur de configurer le même secret côté serveur OpenCode et dans le fichier privé CAB sans le transmettre au modèle. CAB se connecte par `127.0.0.1:4096` lorsque les processus sont sur le même hôte. `0.0.0.0` reste une adresse d'écoute, jamais une destination client. Un accès distant en HTTP clair n'est pas qualifié par cette évolution.

## Repli

Le changement est d'abord livré dans le dépôt CAB. Aucun redémarrage ni déploiement du profil actif n'est inclus. En cas d'échec des tests, garder le change ouvert, corriger dans ce périmètre et ne pas reconnecter le broker en production. Le retour à OpenCode 1.19.x est explicitement exclu.
