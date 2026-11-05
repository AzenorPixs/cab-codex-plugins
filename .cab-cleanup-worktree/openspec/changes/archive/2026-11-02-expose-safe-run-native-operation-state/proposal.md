# Exposer l’état durable d’une opération native par RUN

Code de lot : non attribué — identifiant technique provisoire.

## Problème

Après redémarrage du contrôleur, le statut public peut indiquer une permission
native non rapprochée sans exposer l’état durable de l’opération ni son
`onceAcknowledged`. Le snapshot global contient aussi des données d’accès qui
ne doivent pas être diffusées pour établir ce diagnostic.

## Objectif

Ajouter un GET borné et ciblé par RUN qui projette l’état durable d’une
opération native, notamment l’accusé `once`, sans modifier l’opération ni
exposer jeton, contenu, commande ou chemin de fichier.

## Critères d’acceptation

1. Le GET ne retourne que les opérations du RUN désigné ; un filtre par
   `operationId` est disponible et la liste non filtrée est bornée.
2. Une opération avec entrée native indique `onceAcknowledged` vrai ou faux ;
   l’absence d’entrée native reste `null`.
3. L’instantané inclut l’état de l’opération, l’identité native utile à la
   corrélation et l’état de l’accès, sans token, commande, chemin ni contenu.
4. La lecture ne modifie ni registre, ni permission, ni décision, ni lease.
5. Les tests positifs/négatifs vérifient l’accusé, l’isolation entre RUN, la
   borne de liste et l’absence de données sensibles.
6. La version commune CAB/CABU passe à 2.1.62, avec commandes, documentation
   et distribution alignées.

## Hors périmètre

Aucun POST de réponse ou rejet de permission, aucune restauration automatique
d’une décision après redémarrage, aucun rejeu d’outil, aucune clôture d’effet,
aucun changement de RUN/session, ni lecture du snapshot global depuis une
session de codage.
