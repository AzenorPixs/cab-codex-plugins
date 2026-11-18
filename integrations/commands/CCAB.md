---
description: Entrée CAB système CCAB
version: 3.2.18
---

Répondre en français. Charger le skill CCAB distribué avec le plugin du même nom.
Utiliser le moteur `/usr/bin/cab` et son serveur MCP ; aucune logique de service
ni credentials dans la commande. Vérifier la version active et conserver les
reçus, SID/RUN et protections. Argument utilisateur : `$ARGUMENTS`.

Pour purger : qualifier chaque entrée et obtenir son retour vérifié, renouveler
le claim sans rouvrir RESOLVED, puis utiliser incident.purge ou la purge globale
atomique explicitement demandée. Aucun incident non résolu ne doit disparaître.
