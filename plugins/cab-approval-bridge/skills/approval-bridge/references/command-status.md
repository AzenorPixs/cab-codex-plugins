# Statut — CAB 2.2.21

## `/CAB status`

Produire dans ce chat un résumé très synthétique français et horodaté. Cette
consultation est ponctuelle et strictement en lecture seule ; elle se termine
après le tableau, même si des RUN continuent leur travail.

### Arguments et périmètre

Accepter exactement `status` ou `status --run <run_id>`. Le RUN est un
identifiant exact, jamais un fragment ni un chemin : 1 à 100 caractères,
premier caractère alphanumérique, suivants alphanumériques, `_`, `.` ou `-`,
sans `..`. Refuser argument manquant, dupliqué, option inconnue ou suffixe.
Sans filtre, résumer les RUN courants du contexte suivi, y compris les parents
en sélection ou en attente sans réservation ; ne pas réintroduire les anciens
RUN explicitement arrêtés. Avec filtre, rechercher seulement le RUN exact et
signaler « RUN introuvable dans le périmètre consulté » s'il est absent.
Ne choisir aucun voisin et n'initialiser aucun contexte.

### Collecte ciblée

1. Identifier le contexte et les RUN depuis les sources publiques disponibles :
   GET /runs et GET /status du contrôleur local déjà connu. Pour les seuls RUN
   courants concernés, lire GET /runs/<run_id>/status ; lire
   GET /runs/<run_id>/integration-status et GET /runs/<run_id>/locks si une coordination doit être éclaircie.
   Utiliser des délais bornés ; une erreur est une indisponibilité, pas un
   ordre de démarrer CAB. Aucune nouvelle configuration n'est créée ou lue
   dans un emplacement sensible pour trouver le contrôleur.
2. Recouper, si accessibles, les états natifs Codex via list_threads puis
   wait_threads avec timeoutMs:0, et les états OpenCode via GET /api/session/active.
   Corréler ownerId, sessionId, directory, run_id et change_id ; ne pas prendre
   le statut du présent chat de consultation pour celui d'un orchestrateur.
   Ces lectures ne transmettent aucun message, ne réveillent aucun agent et
   n'exécutent pas broker_readiness dans une session de codage.
3. Lire le checkpoint par RUN du projet identifié :
   output/<prompt>/<run_id>/state.json, notamment output/cismp/<run_id>/state.json.
   Une liste limitée à ce répertoire permet de retrouver un parent sans
   réservation ; pas de parcours récursif global. Ne pas utiliser seul l'ancien
   output/cismp-state.json. Extraire seulement les champs utiles d'identité,
   état, date, dernier jalon, prochaine action, mandat, gate et coordination ;
   ne jamais afficher ou exporter l'objet complet, ses contenus préparés ou
   historiques bruts. Les liens sortant du projet et sources exclues restent
   interdits. Une identité divergente n'est pas fusionnée.
4. Pour le change exact, recouper tasks.md avec les références de preuves
   disponibles. Une coche seule reste une réalisation déclarée : ne pas
   annoncer de test exécuté sans résultat observé. La présence d'une archive
   ne prouve pas publication, STATISTICS.md vérifié et gate ; vérifier leurs
   preuves ciblées avant d'annoncer une livraison. Un candidat réservé sans
   répertoire de change est annoncé « préparation », sans créer ce répertoire.
5. Dater les observations et conserver les dates des checkpoints. Avant de
   conclure à une attente, vérifier qu'elle n'a pas déjà ended_at, closed_at,
   une publication/réconciliation ou une reprise plus récente corrélée.
   Une ancienne prochaine_action ne prime pas sur le dernier mandat ou travail
   prouvé. Une contradiction non réconciliée ou l'absence de source actuelle
   exploitable donne INDÉTERMINÉ, avec cause et dernière date disponible.
   Une source défaillante n'empêche pas d'utiliser une autre preuve actuelle
   corrélée ; signaler séparément sa limite.

### Statut de chaque RUN

- **ACTIF** : activité actuelle d'orchestration Codex ou de travail OpenCode
  corrélée, sans suspension actuelle du travail. Préciser l'action observée ;
  Codex peut revoir un contenu quand OpenCode est idle. Ne pas prétendre à
  une exécution native si seule l'orchestration est active.
- **EN ATTENTE DE RUN <identifiant> — <cause>** : dépendance, exclusion,
  position FIFO ou ressource réellement bloquante actuellement corrélée au
  pair nommé. Une exclusion actuelle reste affichée même si Codex poursuit
  des lectures. Ne pas transformer tous les obstacles d'intégration d'un RUN
  encore au travail en une attente actuelle. Après publication et
  réconciliation prouvées, l'ancienne attente est levée.
- **EN ATTENTE — <cause>** : attente interne actuelle, par exemple prévol
  modèle, décision humaine ou réconciliation propre, sans pair prouvé.
- **BLOQUÉ**, **ARRÊTÉ** ou **TERMINÉ** : seulement sur état et preuves
  corrélés ; distinguer gate individuel d'un change et état du parent.
- **INDÉTERMINÉ — <cause>** : preuve actuelle absente, ancienne ou contradictoire.

RESERVED, READY, IMPLÉMENTATION, un processus vivant ou un chat simplement
chargé ne suffisent pas à établir ACTIF. OpenCode idle ne signifie pas une
attente d'un autre RUN. Un parent idle sans cause d'attente prouvée reste
INDÉTERMINÉ. La présence d'autres RUN ne prouve aucune dépendance.

### Restitution exacte

Afficher « État observé le <date et heure, fuseau utilisateur> », puis :

| RUN / Nom du change | Actions réalisées | Actions en cours | Actions restant à réaliser |
| --- | --- | --- | --- |
| <RUN — statut explicite, pair et cause éventuels> · <change exact> | <preuves acquises> | <dernier travail observé ou attente actuelle> | <obligations non prouvées> |

Une ligne courte par RUN, avec un lien vers son checkpoint ou tasks.md si
accessible. Conserver l'identifiant du pair même si un libellé CISMPx est
disponible ; n'inventer ni numérotation, ni pourcentage, ni succès, ni cause.
Une phrase courte après le tableau peut signaler les limites de collecte.
Si aucun RUN courant n'est trouvé, l'indiquer avec le périmètre et les sources
consultés ; une source indisponible ne prouve pas l'absence de RUN.

Ne jamais appeler POST, PATCH ou DELETE, approuver une permission, écrire un
checkpoint ou rapport, démarrer, arrêter ou reconnecter un service, créer une
session, une automation ou un message. La consultation ne modifie ni le projet
piloté, ni CAB, ni les processus ; elle n'exécute aucun test du projet suivi.
