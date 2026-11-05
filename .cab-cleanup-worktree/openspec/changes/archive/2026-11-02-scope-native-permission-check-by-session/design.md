# Conception

`checkNative(sessionId, idle=true)` demande au client OpenCode uniquement les
permissions de `sessionId`, en utilisant son filtre `sessionIds`. Le client
filtre la réponse par identité de session avant de valider les permissions.
Les gardes existantes d’identité, d’inactivité et de permission restent
inchangées pour la session ciblée.

La vérification ne parcourt plus les métadonnées d’une autre session et ne
peut donc ni être bloquée par leur forme ni les modifier.
