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
