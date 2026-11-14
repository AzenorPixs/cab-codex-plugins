---
description: Entrée CAB système CABU
version: 3.2.7
---

Répondre en français. Charger le skill CABU distribué avec le plugin du même nom.
Utiliser le moteur `/usr/bin/cab` et son serveur MCP ; aucune logique de service
ni credentials dans la commande. Vérifier la version active et conserver les
reçus, SID/RUN et protections. Argument utilisateur : `$ARGUMENTS`.


La demande CABU passe par le MCP `cab_update` avec un request_id stable et la
version cible. CAB conduit toute la mise à jour sans LLM intermédiaire et
retourne OK avec la version vérifiée. Reconnexion : `cab_update_status` sur
le même request_id, aucun rejeu ni demande neuve sur un effet incertain.
Aucun compte ni UID imposé ; aucune commande arbitraire ni sudo côté client.
