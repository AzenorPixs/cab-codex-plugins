---
description: Entrée CAB système CAB
version: 3.2.22
---

Répondre en français. Charger le skill CAB distribué avec le plugin du même nom.
Utiliser le moteur `/usr/bin/cab` et son serveur MCP ; aucune logique de service
ni credentials dans la commande. Vérifier la version active et conserver les
reçus, SID/RUN et protections. Argument utilisateur : `$ARGUMENTS`.

Avant admission, consulter la référence finalization.md du skill : champs stricts,
critères exacts, IDs retournés par CAB et validation pure du contrat. Un refus
explicite se corrige ; UNKNOWN ne se rejoue pas. La publication native utilise
un producteur autorisé, pas une commande CI/CD dans l'atelier isolé.
