# Design

La récupération demeure distincte de `/CAB update` ordinaire. Le flag
`--recover-mcp` doit référencer le seul reçu non terminal existant. Si l’état
natif est `failed`, seul ce chemin peut poursuivre : il recueille
`mcpRecoverySnapshot`, refuse toute session active ou permission partagée,
persiste `reload.state=INTENT`, puis exécute une unique requête
`POST /api/location/reload` non scoppée.

La réconciliation observe le même processus OpenCode, version, location et
empreinte de sessions. Une intention déjà écrite n’est jamais rejouée. Le
chemin sans flag, l’auth requise, l’identité divergente, les sessions actives,
les permissions et les états inconnus restent refusés. Aucun statut HTTP seul
ne clôt le reçu.

Si le reçu est en reprise `RESTARTING` et que le dépôt a avancé depuis sa
préparation, une branche terminale `SUPERSEDED` est permise seulement pour le
cas vérifié où tous les artefacts hors broker gardent leurs empreintes du
reçu et où les trois modules broker présents sont identiques au paquet CAB
courant plus récent. Une readiness fraîche doit confirmer les versions des
trois services comme celles du reçu et le broker chargé dans l’intervalle
`(version du reçu, version du paquet courant]`. L’updater conserve les
empreintes et l’échec historiques, ajoute un reçu de supersession explicite,
et ne démarre ni installation ni rechargement dans cette invocation. L’appel
CABU suivant ouvre une transaction neuve pour installer le jeu complet.
Toute autre divergence conserve le reçu non terminal.
