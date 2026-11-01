# Conception

Conserver le contrat bearer existant : les projections GET omettent toujours
`token`. Le POST `acquire` répété avec le même RUN, `transactionId`, version,
ressources, evidence et payload complet est idempotent ; après restauration, il
renvoie le token/fencing existant avec `reconciliationRequired=true`. Il ne
crée ni réservation, permission ou commande. Le propriétaire peut alors utiliser
la route de réconciliation normale si le jeton et les preuves restent
accessibles.

Pour un bail restauré dont le jeton et le payload original sont perdus, ajouter
une preview GET read-only qui expose uniquement les identifiants, le fencing,
les compteurs et empreintes filtrées de l'historique natif, les opérations
contrôlées et la frontière courante. Elle n'expose ni token, commande, transcript
ou contenu privé. Elle vérifie la session native idle et l'exhaustivité des
preuves.

Un POST `release-unused-lost-token` peut libérer un bail HELD restauré sans
ancien token uniquement lorsque le RUN est réservé, son job est armé et son
`changeId`, sa session, son contexte et son répertoire correspondent exactement
au RUN et au bail. Cet état prouve que le travail reste dans le change déjà
validé et n'exige pas une autorisation humaine supplémentaire. Le POST exige
une preview native fraîche, une attestation exhaustive d'absence de mutation et
l'absence de mandat, permission, effet ou opération inconnu/en cours. Le
contrôleur relit la même histoire complète et la même frontière avant de
persister un reçu idempotent, marquer ce seul bail RELEASED et retirer son token
interne. Toute incertitude conserve HELD.
