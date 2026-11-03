# Shell durable en arrière-plan — CAB 2.2.4

Déclarer explicitement shell_background=true dans la demande unitaire, avec
une commande, un port write réservé et tool_input_sha256 calculé sur tous les
arguments natifs exacts. L'outil shell doit recevoir background=true et un
timeout entier strictement positif, choisi pour l'opération. Ce timeout protège
ce processus ; il ne limite pas la durée de la session CAB. Conserver ASK et la
permission once corrélée. Une autre commande, un autre cwd ou timeout, ou un
background non déclaré n'obtient aucune once.

Le retour du tool part completed indique ici un démarrage. Son metadata.shellID
est lié au callID, à la permission, au RUN et à la session natifs. Le contrôleur
lit GET /api/shell/<shellID> et vérifie id, location, commande, cwd, dates et
identité OpenCode. Le champ session n'est pas obligatoire dans Shell.Info :
la liaison provient du call natif et tout champ session exposé doit concorder.
Le checkpoint privé shell-lifecycle.json reste distinct du registre métier.

L'opération reste EXECUTING et le port protégé pendant status=running.
Les événements shell.exited et session.shell.ended réveillent la lecture de
l'état natif ; la reconnexion et les vérifications explicites de libération
relisent aussi les preuves. Aucun tour LLM de polling n'est requis. Après
redémarrage, un reçu privé seul ne clôt rien : la source native doit être
revérifiée. Une sortie exited avec exit non nul reste un échec métier ; timeout
ou killed devient un résultat natif d'erreur. La fin ne libère pas le port :
la revue des effets et /locks/release restent explicites.

Une réponse 404, un GET indisponible, une divergence ou un checkpoint altéré
conserve les protections. Un timeout foreground historique sans shellID,
notamment l'ancien Vite -03, ne devient pas rétroactivement un shell suivi.
Idle, port fermé ou absence dans une liste ne prouvent pas sa fin. Employer
la récupération qualifiée, sans NO_EFFECT, réattribution ou rejeu déduits.
