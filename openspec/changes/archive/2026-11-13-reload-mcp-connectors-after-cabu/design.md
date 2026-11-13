# Décisions

/usr/bin/cab mcp devient un relais stdio sous l'UID et le profil du client.
Il conserve le canal et le handshake client, lance mcp-worker, suit tous les
identifiants JSON-RPC en vol et ne recharge qu'en l'absence de requête métier
ou de requête serveur non résolue. Seul le handshake de protocole est réémis.
Les corps d'appels ne sont ni persistés ni rejoués. Une panne du moteur répond
inconnue aux appels concernés, sans redéclenchement d'effet.

cab_update est une attente durable traitée par le relais : admission unique,
puis lectures du même reçu. Cette attente ne bloque pas le remplacement du
moteur, ce qui évite l'interblocage CABU/connexion initiatrice. Toute admission
incertaine conserve request_id et interdit une nouvelle demande.

Le relais constate la version installée et remplace son moteur, réinitialise
son protocole interne puis émet tools/list_changed. Le catalogue n'est confirmé
que sur une lecture tools/list réellement achevée par le client. PID/start et
génération observés sont conservés ; aucun signal vers un processus tiers.

CABU capture les connecteurs actifs (supervisés et anciens détectés par
métadonnées seulement). Le reçu distingue installation vérifiée, reconnexion
en attente et reprise native requise. Les anciens exécutables n'ont pas de
protocole rétroactif de rechargement : leur première reprise doit venir du
client natif quand il n'expose aucune interface publique de reload. Ils ne
sont pas assimilés à des connecteurs redémarrés. Pas de piratage du stdio d'un
app-server, de modification de secret ou de fin forcée de session.

Sources : protocole MCP tools/list_changed et API officielle Codex
config/mcpServer/reload ; cette dernière n'est pas une commande accessible à
un autre processus si l'app-server actif n'expose que son stdio privé.
