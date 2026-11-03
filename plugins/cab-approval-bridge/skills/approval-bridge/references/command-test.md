# Test du raccord — CAB 2.2.13

## `/CAB test`

Exécute un test non destructif après `/CAB start`.

Utilise la session de codage persistante créée par `/CAB start`. Ne crée pas de session éphémère : le test et les mandats ultérieurs doivent rester observables au même endroit. Le test ne lit ni n’écrit le projet et n’exécute aucune commande qui y accède. Pour vérifier le cycle CAB de bout en bout, il utilise exclusivement la commande inoffensive `true`, sans effet fonctionnel.

1. Vérifie OpenCode : `OK` ou `NOK`.
2. Vérifie par `GET /api/mcp` que `cgpt-validation` est `connected` comme MCP local `stdio`.
3. Vérifie que l’identifiant de la session persistante est connu et que la session reste accessible par l’API native OpenCode.
4. Appelle `broker_readiness` dans cette session par `POST /api/session/<id>/prompt`.
5. Interprète strictement :
   - `READY` → continuer ;
   - `DEGRADED` → afficher `root_cause` et `recommended_action`, continuer seulement si le test actif reste sûr ;
   - `BLOCKED` → arrêter immédiatement en `NOK` ;
   - `HUMAN_REQUIRED` → arrêter et signaler l’intervention humaine requise.
6. Vérifie le contrôleur Codex et le SSE direct OpenCode actifs.
7. Vérifie qu’aucune demande d’approbation parasite n’est en attente.
8. Dans la même session persistante, demande à OpenCode de produire une validation non destructive sur `cgpt-validation` avec un `requestId` unique, `files: []` et `commands: ["true"]`.
9. Codex rend une décision explicite unique `approved`.
10. Vérifie dans cette session qu’OpenCode reçoit la réponse MCP corrélée et exécute `true` une seule fois.
11. Vérifie l’accusé de réception OpenCode via le SSE direct.
12. En cas de reconnexion ou divergence, confirme l’état réel par HTTP puis recontrôle `/api/mcp` avant de reprendre le test.

Affiche une coche verte uniquement pour une preuve réellement observée dans la session courante.

En cas d’échec, affiche :
- `NOK` ;
- le `requestId` concerné si disponible ;
- `root_cause` si disponible ;
- `recommended_action` si disponible ;
- la cause précise.

N’annonce jamais une réussite partielle comme un test validé.

À la fin du test, conserve la session persistante pour le job. Ne clôture que les ressources temporaires propres au test.

Ne ferme jamais :
- le broker MCP stdio principal ;
- OpenCode ;
- le contrôleur persistant ;
- la supervision native.

Ces interdictions concernent la fermeture des processus. Elles n’interdisent
pas une bascule d’authentification fournisseur explicitement autorisée ni le
stockage privé standard de la clé par OpenCode, hors dépôt et lecture des
agents. Le transport V2 ne requiert aucun `/instance/dispose`. Après une
reconnexion MCP ciblée, réconcilier `/api/info`, `/api/mcp`, readiness réelle
et test CAB. Le secret Basic Auth est provisionné dans le fichier local privé
décrit par BUILD.md ; il ne passe pas au modèle ni dans les arguments.
