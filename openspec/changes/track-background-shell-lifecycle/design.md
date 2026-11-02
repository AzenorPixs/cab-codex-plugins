# Conception

Le start background n’est accepté que pour une opération native `shell` exacte
liée à une ressource `port:*` en écriture, avec `tool_input_sha256` attestant
`background=true` et un délai explicite borné. Le contrôleur extrait le
`shellID` du résultat natif, puis valide le `GET /api/shell/:id` : id, location,
session, commande, répertoire et statut RUNNING doivent concorder.

Le statut de processus est conservé dans un journal privé distinct du registre
des RUN pour rester lisible par l’ancienne version en cas de rollback. L’accès
port reste détenu tandis que le shell tourne ; les ressources disjointes
peuvent progresser. `shell.exited` ou un GET terminal exact permet de fermer
l’opération. L’absence de shell, un timeout sans corrélation, une erreur HTTP
ou un shellID divergent gardent l’accès protégé.

Une opération foreground `background=false` conserve ses gardes actuelles. Une
opération qui n’a jamais produit de shellID ne peut pas être adoptée par ce
cycle ; le cas historique -03 reste EXECUTING et exige une preuve native
terminale corrélée.
