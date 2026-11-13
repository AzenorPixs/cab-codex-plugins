# Conception

## Transports et binaires
L’observation conserve PPID et chemins exécutables en mémoire locale. Le Codex
intégré est détecté comme binaire distinct, par configuration facultative
codex_desktop_binary, chemin de ressources connu ou processus actif. Les deux
programmes utilisent le connecteur agent codex. L’ascendance identifie lequel
détient le transport ; le CLI n’est pas marqué actif par le seul processus du bureau.
Pour les sockets AF_UNIX, SOCK_DIAG/UNIX_DIAG_PEER fournit les inodes des pairs.
Les flux ne sont jamais lus ; les sockets API ne prouvent pas la liaison au client.
Une observation indisponible reste explicitement non vérifiée.

## Releases et navigation
Le cache quotidien lit la liste des releases pour OpenCode et retient la plus
récente2.x non brouillon/non prerelease, même si Latest pointe sur1.x. Le cache
ancien1.x est invalidé par un changement de canal, pas de multiplication par page.
Codex intégré et CLI partagent le cache du dépôt openai/codex, pas leurs versions
installées. /administration/agents reste compatible avec la page /agents.
L’administration par défaut ouvre Base de données. Identifiants Projets : garder
les PK actuelles pour tous les protocoles et relations ; seule une clé publique
stable sera utilisée dans les liens lisibles après décision développeur.
