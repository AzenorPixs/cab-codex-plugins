# Arrêt borné des moteurs et versions en direct

Les relais3.2.4 utilisent une politique validée, lue par l'API authentifiée
/api/v1/connectors/policy. Le compte du connecteur ne lit pas /etc/cab/cab.json.
Ce fichier accepte la section suivante, aussi modifiable par l'API d'administration :

```json
{
  "mcp_reload": {
    "graceful_timeout_seconds": 2,
    "term_timeout_seconds": 10,
    "kill_timeout_seconds": 5,
    "allow_sigkill": true
  }
}
```

Chaque délai est numérique, strictement borné0.1–120s ; allow_sigkill est un
booléen. La politique est capturée au début de la tentative et s'applique aux
prochains arrêts, sans redémarrer le service. Si elle est indisponible, SIGKILL
est désactivé pour cette tentative. La journalisation respecte logging.level.

Le relais attend une frontière sans appel client ni demande serveur en vol.
Un appel devenu indécis protège un moteur encore vivant. L'arrêt vise seulement
le moteur enfant mcp-worker du même UID, PPID, boot/start ; un pidfd est ouvert
et l'identité est revérifiée avant toute action/signature de signal.
EOF stdin permet la sortie naturelle ; après son délai viennent SIGTERM, puis
SIGKILL si autorisé. La sortie doit être observée avant de démarrer un remplaçant.
Le relais stable et les applications Codex/OpenCode ne sont jamais ciblés.

Si le client se déconnecte pendant un appel, le relais attend son issue au lieu
de forcer le moteur. Une identité divergente, un appel indécis ou KILL désactivé
produit un diagnostic ; aucun appel métier n'est réémis. Les tentatives sont
tracées sans corps d'appel sur stderr et dans mcp_stop_attempts/journald quand
le service est joignable. Les rapports répétés ont la même identité et empreinte.
Un rapport d'arrêt ne vaut pas acquittement de reconnexion ou de catalogue.

Les anciens relais déjà en mémoire gardent leur code et leurs capacités jusqu'à
leur reprise native. relay_version reste vide s'ils ne l'annoncent pas : CAB ne
prétend pas leur avoir appliqué la nouvelle politique en changeant le seul moteur.

## Affichage

McpConnectorProjection ne publie que profil, UID, versions et état de connexion.
Electric pousse les mutations de la projection. Le bandeau et /agents partagent
un seul abonnement, sans polling des versions ni rechargement du document.
Le bandeau affiche boule verte et texte vert gras à gauche d'API, depuis la droite.
Les connexions identiques sont groupées ; des versions différentes restent visibles.
Les cartes Codex et Codex CLI peuvent afficher le même profil MCP partagé.

La version affichée est celle du moteur réellement chargé ; le tooltip distingue
catalogue et relais. Une connexion non observée ne reçoit pas de version supposée.
La déconnexion est poussée dès sa déclaration, sinon après détection de processus
ou expiration du heartbeat. Le flux reste limité au compte authentifié ;
l'administrateur voit les profils connectés. Aucun PID, chemin ou secret n'est publié.
