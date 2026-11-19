# Conception

L’environnement fait partie de la définition effective d’un serveur MCP. CAB_MCP_PACKAGE_VERSION est une variable non secrète détenue par CAB. Sa valeur suit la version du paquet ; une réconciliation de cette même version doit laisser la définition inchangée. CAB_MCP_RELOAD_ID reste distinct et conserve le nonce des rechargements natifs existants.

L’éditeur TOML compare le document avant/après et n’admet que la modification de cette clé dans mcp_servers.cab.env. Les autres valeurs restent identiques et ne sont pas restituées au modèle. La création et les formes courantes table/inline sont prises en charge ; un format ambigu est refusé sans écriture.

La finalisation du paquet et la réconciliation des comptes partagent ce marqueur, pour éviter sa suppression ou une alternance entre états. La négociation, la version chargée et le catalogue restent des observations indépendantes ; le client natif effectue son remplacement à sa frontière sûre. L’écriture ne prouve ni nouveau processus ni connexion.

La recette sur hôte commence avec une seule session existante consentie pour le contrôle en lecture, sans effet métier, avant généralisation et livraison. Si le client ne rafraîchit pas sa configuration, le blocage et la nécessité d’un mécanisme supplémentaire sont conservés, sans faux READY.

## Reprise de l’instance graphique après CABU

Après vérification de l’installation, le superviseur essaye d’abord le parcours natif. Si le relais de l’instance qui a demandé CABU reste en RELOAD_REQUIRED, il peut fermer cette instance et la relancer via le service systemd du compte graphique, avec runuser. L’admission revalide le reçu CABU, le compte, les identités des processus, la préférence de révocation et les opérations CAB protégées. Une maintenance empêche les démarrages concurrents couverts par le verrou CAB.

Le reçu de redémarrage est écrit avant tout signal. CAB essaie SIGTERM. Si le même processus est encore vivant à l’expiration du délai, il utilise SIGKILL sur le même PIDFD. La relance attend la sortie confirmée. Une issue incertaine conserve le reçu et bloque le rejeu. Un nouveau processus de la bonne instance et un heartbeat MCP pour le moteur et le catalogue cibles sont nécessaires pour terminer la réconciliation.
