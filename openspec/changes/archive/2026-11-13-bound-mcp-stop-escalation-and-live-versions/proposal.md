# Borner l'arrêt MCP et afficher les versions en direct

Code non attribué ; attribution ultérieure par ACL.

## Why
Le relais3.2.3 possède un arrêt TERM/KILL fixe sans politique ni reçu détaillé.
Les versions de connecteurs doivent être visibles sans rafraîchissement manuel.

## What Changes
Arrêt gracieux, SIGTERM puis SIGKILL autorisé seulement sur le moteur enfant
identifié/pinné par pidfd et à frontière sûre, délais et autorisation dans
/etc/cab/cab.json, audit sans données métier. Aucun arrêt des applications ni
levée d'une requête indécise. Nouveaux relais3.2.4, versions de relais distinctes
du moteur pour ne pas prétendre qu'un ancien relais a acquis le nouveau code.
Projection publique minimale Electric pour Agents et bandeau à gauche d'API :
boule verte, libellé vert gras et versions réellement observées en direct.

## Impact
CLI/relais, API/configuration, migrations additives et projection Electric,
TanStack, clients et tests ciblés. CI/CD3.2.4 puis activation de qualification
CABU sur le même reçu, statistiques gérées par CAB.
