---
description: Entrée CAB système CABU
version: 3.6.1
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

## Reprise nécessaire à CABU

Une demande CABU autorisée couvre aussi la reprise nécessaire de son instance
observée, pour le même demandeur, UID, request_id et version. Ne pas redemander
une confirmation pour cette seule reprise. Lire recovery_authorization dans
le même reçu ; AUTHORIZED est une autorité bornée, pas une preuve de reconnexion.
La préférence native reste prioritaire. Une reprise administrative contrôlée
du frontend n'est admise qu'en dernier recours RELOAD_REQUIRED, avec identité
kernel stable, frontière sûre de tous les acteurs du compte, PIDFD, reçu durable,
supervision indépendante et sortie prouvée avant relance. Aucun arrêt arbitraire
ni injection dans un canal privé. L'absence de mécanisme qualifié est un blocage
technique explicite, pas une raison de redemander l'autorisation déjà donnée.

Le propriétaire ou l'administrateur peut révoquer cette autorité par
`native.control.configure` avec `cabu_recovery_authorized=false` ; seule cette
préférence change, sans appel fournisseur ni nouvelle génération. Les reprises
en attente sont revérifiées sous verrou avant dispatch. Un effet UNKNOWN, une
instance divergente ou une révocation bloque sans rejeu. Un ancien reçu sans
observation kernel n'acquiert aucune autorité rétroactive par simple lecture.
