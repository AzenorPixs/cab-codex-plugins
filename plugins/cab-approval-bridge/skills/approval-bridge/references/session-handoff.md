# Changer le SID de pilotage dans le même RUN — CAB 2.2.24

Cette voie appartient à l’orchestrateur propriétaire dans le change autorisé.
Elle ne corrige pas un HTTP401 : utiliser d’abord le client CAB authentifié.
Le transfert ordinaire `/job/recover` et son refus des accès non résolus restent
inchangés. Ne jamais créer un RUN de remplacement pour contourner un verrou.

## Préparation

Clôturer le mandat courant par son rapport et `/job/progress` (champ
`currentCabMandate: ""`), sans retirer ni déclarer exécutée une ancienne unité.
Conserver le checkpoint métier et identifier les effets historiques protégés.
Les anciennes approbations PREPARED restent historiques et non exécutables ;
un changement de SID ne vaut ni retrait de coordination ni libération d’accès.
Les deux sessions doivent être idle, sans permission native en attente,
validation indécise, transition de modèle/recovery (y compris persistée hors requête en cours) ou contrôle en cours.
Une ancienne partie bash encore active n’est admise que si son call et sa
cible correspondent exactement à un once acquitté et un accès conservé.
Un nouveau call actif ou une intention sans ACK interdit le transfert.

Créer une candidate dans le même directory, permissions bash/shell et edit
`ask`, même fournisseur, modèle et raisonnement que le job. L’ancienne session
reste sous ask/deny pour ces effets. Ne confier aucun travail métier à la
candidate. Lui faire appeler uniquement la readiness native scellée CodeMode :
`return await tools["cgpt-validation"].broker_readiness({"run_id":"<run>"});`
Une découverte exacte de la signature request_validation est également admise.
La dernière readiness doit être READY, pending_count0, liée au RUN et à la
version courante. Les anciennes observations readonly de ce RUN restent
historiques ; une mise à jour permet leur actualisation dans la même candidate. Les autres outils, y compris une commande de prévol, sont refusés.
Le transfert conserve le contrat modèle ; il ne lance pas de nouvelle PLLM.

## Décision et preuve

Lire `GET /runs/<run>/session-handoff?sessionId=<candidate>` via le contrôleur
local. L’aperçu observe deux frontières natives stables et fournit les champs
ci-dessous ainsi que les accès protégés, sans jetons ni transcript.
Conserver la requête exacte dans le checkpoint de l’orchestrateur avant POST.

```json
{
  "handoffId": "handoff-identifiant-inédit",
  "ownerId": "propriétaire-du-run",
  "version": 123,
  "jobId": "job-existant",
  "expectedSessionId": "ses_ancienne",
  "sessionId": "ses_candidate",
  "checkpointDigest": "empreinte-de-l-aperçu",
  "boundaryDigest": "empreinte-de-l-aperçu",
  "reason": "Motif du changement dans le change autorisé",
  "evidence": ["référence du checkpoint et des preuves examinées"]
}
```

Envoyer à `POST /runs/<run>/session-handoff`, avec les gardes loopback et
`x-cab-continuity: cab-continuity-v1`. Le contrôleur réobserve la frontière,
persiste PREPARED avant la bascule puis COMMITTED avec le SID de pilotage,
répare atomiquement le checkpoint, révoque les anciennes validations et
persiste DONE avant réponse. Il n’émet aucune permission ni prompt métier.
RUN, contexte, version de réservation, job, change, jalon, critères, lifecycle,
terminal gate, décisions, opérations, accès et réservations restent conservés.
Chaque opération historique garde son SID ; les événements de fin restent
observés. Le superviseur suit le SID courant mais ne crée aucun mandat.

## Perte de réponse et reprise

Lire `GET /runs/<run>/session-handoff/receipts`, `/job` et `/runs` ; rejouer
uniquement la requête exacte avec le même handoffId. DONE retourne le même
reçu ; une requête divergente est refusée. Un redémarrage après COMMITTED
termine uniquement les métadonnées attestées, avant toute admission. Une
preuve divergente conserve le gel du seul RUN, sans rollback ni effet natif.
Un PREPARED interrompu garde l’ancien SID et attend le même transfert, ou
`POST /runs/<run>/session-handoff/abort` avec handoffId, ownerId, version et
evidence. L’abandon avant commit est journalisé ABORTED ; après COMMITTED il
est interdit. Aucun abandon ne supprime des opérations, accès ou décisions.

Après DONE, vérifier la cohérence du SID dans RUN et job et transmettre le
checkpoint métier à la candidate. Utiliser de nouveaux identifiants, inputs,
décisions, accès et once. Les verrous historiques restent opposables, y compris
à une tentative de réutiliser leur accès ; les travaux disjoints autorisés
peuvent continuer. Le gate final et les libérations attendent toujours les
réconciliations nécessaires. Une preuve de handoff n’est pas une preuve produit.

Le registre reste compatible avant usage. Après création d’un reçu
sessionHandoffs, une ancienne version qui ne connaît pas cette extension
refuse sa restauration : reprendre en avant, ne pas supprimer le journal
pour effectuer un downgrade. Aucune bascule de RUN réel n’est implicite dans CABU.
