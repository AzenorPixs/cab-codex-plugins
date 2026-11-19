# Conception

## Liaison effective

`native.bind` continue de lier le journal vérifié mais retourne séparément `connector_bound`. Le résultat ne doit pas prétendre autoriser Git quand le worker authentifié n'est pas identifié dans le registre. Les identités Linux et les protections contre les liaisons concurrentes restent requises. La correction du heartbeat doit être motivée par une reproduction mesurée ; une connexion SDK distincte constitue un canal de travail, jamais une preuve de réparation des connexions déclarantes.

## Récupération sans inventer de heartbeat

Si le journal est vérifié mais le registre manque, CAB peut observer le couple
kernel réellement appelant : worker et parent CAB de même UID/agent, identités
PID/start/boot, unicité et absence de liaison incompatible. Le registre créé
porte `OBSERVED`, versions et catalogue vides, incertitude vraie ; il ne prouve
ni heartbeat, ni moteur actualisé, ni catalogue chargé. Le verrou d'acteur
sérialise inscription et heartbeat. Un heartbeat authentifié ultérieur du vrai
parent adopte la liaison ; l'observation antérieure reste `SUPERSEDED` et n'est
plus sélectionnable. Les protections de RUN et CABU restent inchangées. Cette
récupération corrige le symptôme de rattachement sans prétendre connaître la
cause historique de l'absence de heartbeat.

## Contestation

`finalization.contest_check` est réservé à un administrateur authentifié. La demande désigne projet, RUN, check, opération et preuve, avec leurs empreintes attendues et celle de la politique. Elle fournit un request_id stable, une autorisation et une justification. La transaction verrouille RUN et plan, refuse revue, clôture, import, gel, baux et effets indécis, vérifie l'intégrité et la portée de la preuve courante, puis conserve un événement d'exclusion sans modifier la preuve ni son reçu. Seul argv est corrigé ; la révision du contrôle augmente et une nouvelle preuve devient nécessaire. Une répétition identique retrouve le reçu ; une demande concurrente périmée ou différente est refusée.

La sélection de finalisation et la révision autonome ignorent les preuves contestées. Un succès ancien ne peut redevenir valide après un retour au même argv. Aucun test n'est lancé par la contestation. La qualification de DIU requiert une vraie découverte non vide et un nouveau contrôle exécuté depuis le projet voulu. Le correctif est qualifié avant toute contestation de l'opération historique131.

## Autonomie de préqualification et rapports du lot

Avant toute opération ou preuve, l'administrateur peut corriger une admission
`development` en `delivery` par `run.reframe_prequalification(nature=delivery)`
uniquement si une publication est déjà cadrée et si les critères restent exacts.
Checks, producteurs et revue restent intacts ; les empreintes attendues et toutes
les protections sont vérifiées, les anciens contrats conservés. Aucun reset de
révision source ni nouvelle session ne contourne une admission incorrecte.

Le moteur de livraison inclut automatiquement les rapports CAB des archives
validées incluses au lot : même projet, acteur et session, RUN CLOSED prouvé,
proposal.md et tasks.md archivés réservés par l'index courant. Il réutilise les
vérifications de provenance CAB, SHA entier, absence de modification manuelle
et de réservation étrangère du moteur existant. Les autres rapports restent
hors périmètre. Le LLM ne réserve ni n'édite ces rapports.

La réconciliation officielle d'archive conserve aussi l'attribution des fichiers
réservés : même RUN, index, acteur et session, même chemin relatif, événement
serveur vérifié, archive unique, source absente et cible régulière sans lien.
La réservation refuse un propriétaire concurrent et conserve sa provenance,
sans modifier les captures initiales ni admettre un déplacement arbitraire.
