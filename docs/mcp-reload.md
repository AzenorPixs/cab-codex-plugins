# Rechargement des connecteurs après CABU

`/usr/bin/cab mcp --agent codex|opencode` conserve le canal stdio du client et
lance un moteur `mcp-worker` sous le même compte. Le relais observe la version
installée, attend la santé du service correspondant puis remplace son moteur
seulement sans requête métier ou demande serveur en vol. Les seuls messages
réémis sont initialize/initialized ; aucun appel métier n'est rejoué.

Le relais émet `notifications/tools/list_changed`. Le registre n'acquitte le
catalogue que sur une réponse tools/list achevée, avec version, PID/start et
génération du moteur. Une notification seule ne vaut pas lecture du catalogue.
Le protocole stdio2025-11-25 est qualifié sur les profils Codex et OpenCode.
Les corps d'appels restent en mémoire ; ni prompts, secrets ni arguments métier
ne sont persistés dans le registre. Diagnostics techniques sur stderr uniquement.

## Mise à jour initiée par MCP

Le relais traite l'attente cab_update hors du moteur : une admission au service,
puis lectures du même request_id. Le moteur peut ainsi redémarrer pendant que
le job système poursuit sa mise à jour. Une réponse perdue reste
ADMISSION_UNCONFIRMED ; elle ne provoque jamais une seconde demande.
Un arrêt inattendu du moteur rend l'issue des appels en vol explicitement
indécise ; les reçus CAB durables restent consultables, sans relance automatique.

## Reçu CABU

Le reçu distingue package_state=OK, état du service et état des connecteurs.
RECONNECTING attend la frontière sûre ou la lecture du catalogue.
RELOAD_REQUIRED demande la reprise native d'un ancien connecteur sans relais.
OK atteste que les connecteurs actifs visés sont à jour, ou que leur client
s'est déconnecté (statut DISCONNECTED explicitement conservé), sans faux restart.
Le reçu terminal acquis reste stable. PostgreSQL conserve cibles et observations
dans connector_reloads, séparément du résultat d'un ancien worker d'installation.
Ainsi un worker déjà chargé ne peut pas effacer ce contrôle pendant l'upgrade.

L'inventaire des anciens processus lit seulement les métadonnées des commandes
CAB connues pour les UID/agents enrôlés, jamais leurs environnements ou secrets.
Aucun signal n'est envoyé à ces processus ni aux applications natives.

## Première transition depuis un ancien connecteur

Un programme déjà en mémoire avant3.2.3 ne contient pas le nouveau relais.
Si le client ne propose aucune interface native accessible de rechargement,
une reconnexion MCP native unique est nécessaire pour démarrer le relais.
CABU l'indique et conserve les sessions ; il ne tue pas le client et n'injecte
aucune commande dans le stdio privé de son app-server. Sur cet hôte, les quatre
connecteurs Codex observés avant déploiement appartiennent à ce cas.
Les mises à jour suivantes utilisent le relais installé.

Codex possède une option native mcp_tool_list_changed. CAB l'active via sa CLI
si elle est disponible et sans override existant ; un false explicite est
préservé et diagnostiqué. Les autres configurations restent intactes.
Une capacité client absente/non activée n'est jamais assimilée à un catalogue relu.

Références primaires consultées :
- https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/server/tools.mdx
- https://learn.chatgpt.com/docs/app-server (config/mcpServer/reload)
- https://github.com/openai/codex/blob/main/codex-rs/features/src/lib.rs

L'API app-server officielle permet au client propriétaire de recharger sa
configuration ; elle n'autorise pas un processus tiers à écrire sur son canal
stdio privé. Les profils et les identités CAB restent agnostiques aux comptes.
