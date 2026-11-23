# Récupérer les statistiques arrêtées et fiabiliser CABU

## Pourquoi

Le parcours3.2.19 a révélé un job statistique arrêté avec fichier et index toujours à l’état initial, et des fichiers publics Debian privatisés par l’umask077 hérité. Un relais peut aussi rester sans rechargement après négociation quand le client omet la notification initialized pourtant acceptée par le serveur.

## Changements

- Réconcilier automatiquement l’état initial prouvé en échec distinct, originaux conservés et aucun rejeu.
- Borner l’umask au subprocess build et contrôler les permissions publiques du.deb avant APT.
- Reconnaître l’acquittement par le premier appel après négociation réussie, sans inventer une réponse ni rejouer un appel métier.

## Portée

Maintenance3.2.20 distincte. Qualification hôte avant report source, sans modifier la source figée du RUN3.2.19 avant son CLOSED. DIU et les secrets/profils restent hors modification.
