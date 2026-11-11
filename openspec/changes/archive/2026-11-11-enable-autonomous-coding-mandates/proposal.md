# Autonomie du codeur dans le change et validation finale

Code non attribué. Mandat SCM validé par le développeur le 11 novembre 2026.

## Pourquoi
Les décisions unitaires imposent des échanges pendant les écritures et les essais.
Le développeur demande un cadrage initial, une réalisation autonome et une revue finale.

## Changements
Déléguer le périmètre au RUN par un mandat persistant, lié à sa génération et son SID.
Résoudre avant démarrage les choix nécessaires entre orchestrateur et développeur.
Permettre les commandes et écritures isolées dans les chemins réservés, sans
sollicitation par opération. Soumettre une révision et ses tests à la revue finale.
Les seules exceptions métier sont hors change, hors cadrage, outil nécessaire absent
et accès web de consultation. La publication exige une acceptation de la révision.

## Impact
Contrat distribué, contrôleur, broker, supervision, permissions, preuves et tests.
Les sessions historiques restent lisibles ; leur migration est explicite à frontière
inactive. Pas de propagation implicite dans les projets consommateurs ou les prompts.
Les sessions Pixs sont préservées pendant CABU, puis leur reprise est vérifiée.
