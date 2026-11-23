# Conception

Le worker transmet sa propre version au relais sur son flux enfant. Le paquet installé ne suffit pas pour déduire cette version. Un identifiant aléatoire propre au lancement relie le message au worker courant. Le relais consomme ce message en interne. Sa réponse au client reste du JSON-RPC.

Le heartbeat indique CATALOG_PENDING tant qu’une lecture complète de tools/list manque. Le reçu précédent reste accessible et les anciens effets incertains gardent leurs protections.
