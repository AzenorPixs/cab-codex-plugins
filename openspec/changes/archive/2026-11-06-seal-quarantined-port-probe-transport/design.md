# Liaison stricte sans recopie

POST recovery/port-probe-stage reçoit opération historique, nonce futur,
stageId/requestId/approvalId et répertoires. Le contrôleur construit le payload
par son générateur existant, prépare le carrier privé et ne renvoie que le
lanceur et ses métadonnées. Les sources et la commande du générateur restent
revues par l’orchestrateur de version correspondante. Aucun payload libre.
GET port-probe-command rafraîchit le permit et renvoie le lanceur lorsqu’un
stage unique de ces identités correspond encore exactement au payload.
Un autre stage pour la même opération future, un payload divergent ou un
SID non courant est refusé. Les sondes inline restent compatibles.
La réconciliation relit le stage privé exact, sa liaison de mandat et le
payload généré ; le résultat doit provenir du call natif portant ce lanceur.
La livraison existante exige EXECUTING/onceACK et contexte exact. Ni stage
ni métadonnées ne valent permission. Après reboot/rechargement, les gardes
existantes interdisent de délivrer un effet restauré/inconnu.
