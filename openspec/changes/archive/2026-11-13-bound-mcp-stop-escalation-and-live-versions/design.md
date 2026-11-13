# Décisions

La politique mcp_reload contient graceful_timeout_seconds2,
term_timeout_seconds10, kill_timeout_seconds5 et allow_sigkill=true par défaut.
Délais bornés0.1–120s, booléens stricts ; lecture par API authentifiée sans exposer
/etc ni ses secrets au compte client. Une politique indisponible interdit KILL.
Le helper vérifie UID/PPID, mode mcp-worker, boot/start et pidfd avant chaque
signal. Une identité divergente, une requête en vol ou indécise diffère l'arrêt.
Le relais stable et les applications natives ne sont jamais ciblés.

Le nouveau relais charge le helper d'arrêt depuis le paquet à frontière sûre.
Les anciens relais en mémoire ne sont pas déclarés mis à jour par supposition ;
leur version reste inconnue s'ils ne l'annoncent pas. Aucun forçage des anciens
processus non supervisés sans preuve de quiescence.

Le registre garde les tentatives idempotentes et leur résultat technique, sans
prompt ni corps d'appel. Une sortie non observée bloque le remplacement ; la
reprise et la relecture de catalogue restent requises avant succès CABU.

McpConnectorProjection ne contient que profil, UID, versions, état et connexion.
Aucun PID, chemin, secret ni identité d'acteur privée dans le flux. Electric
pousse les mutations et déconnexions observées ; le frontend ne poll pas ces
versions. Un seul abonnement partagé alimente le bandeau et Agents. Les profils
codex desktop/CLI partagés sont explicitement présentés comme un profil MCP.
