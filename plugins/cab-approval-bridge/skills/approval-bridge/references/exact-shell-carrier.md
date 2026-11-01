# Payload Bash exact sans recopie — CAB2.1.25

## Portée

Pour un nouveau mandat Bash long, le codeur propose le corps ; l’orchestrateur le relit et valide ses octets/syntaxe/ressources. Il peut ensuite le transmettre directement au contrôleur comme payload scellé. Le modèle ne recopie plus ce long corps dans request_validation et shell : il émet uniquement l’invocation courte retournée. Cette invocation reste exacte et peut être refusée si le modèle l’altère ; aucune correction silencieuse n’est faite.

Cette voie n’utilise pas POST session.shell et n’installe aucun plugin natif. Elle conserve request_validation, décision explicite, révisions, accès exclusif et permission native once. Elle concerne un payload explicitement revu comme Bash exécuté par /bin/bash -c ; aucune équivalence implicite avec un autre shell ou un ancien mandat n’est supposée. Les commandes ordinaires restent inchangées.

## Préparation sans exécution

Le propriétaire conserve les preuves d’un éventuel ancien mandat divergent et le réconcilie avant de créer de nouvelles identités. À une frontière idle, sans permission/demande/effet propre non résolu, job armé strictCommands=true et règle shell ask, préparer :

```json
{
  "stageId": "stage-example",
  "jobId": "job-example",
  "sessionId": "ses_example",
  "reservationVersion": 1,
  "requestId": "request-example",
  "approvalId": "approval-example",
  "operationId": "operation-example",
  "payload": "printf '%s\\n' 'exemple revu'\n",
  "payloadSha256": "empreinte SHA256 réelle des octets UTF-8 revus"
}
```

Ces identités sont des exemples, jamais des valeurs à réutiliser. POST /runs/<run>/shell-stage transmet ce JSON via le canal contrôleur de l’orchestrateur, sans génération par le modèle. Prélever le payload depuis la proposition revue sans recopie manuelle : lecture d’octets, décodage UTF-8 strict vérifié par aller-retour, hash sur ces octets. Ne jamais utiliser cette préparation pour lire un secret ou charger/exécuter un fichier env. Le payload ne doit contenir aucun secret, comme toute commande CAB.

Le staging vérifie identités, contexte, hash et limites mais n’autorise et n’exécute rien. Réponse201 : identités, bytes, payloadSha256 et command courte ; le corps long n’est pas renvoyé. Comparer ces métadonnées à la proposition revue. Même stage exact idempotent ; changement de contenu/contexte/identités refusé. GET /runs/<run>/shell-stage/<stage> expose ces seules métadonnées, jamais une autorisation.

## Mandat natif et exécution

Utiliser exactement stage.command comme unique entrée commands du request_validation, avec les requestId/approvalId/operationId du stage, le RUN/SID/réservation courants et les ressources/revisions réellement nécessaires au PAYLOAD. Calculer le digest d’opération sur ce nouveau mandat exact selon le protocole courant ; le digest du payload est déjà incorporé littéralement au lanceur. Ne pas utiliser tool_input_sha256, réservé aux mandats write/edit, sur ce mandat Bash. Vérifier demande/identités/commande avant APPROVED, puis acquérir les accès et transmettre GO. Le modèle appelle shell natif avec cette seule command courte, sans recopier le payload.

Le contrôleur transmet once seulement pour la commande native exacte et les gardes existantes. L’enfant natif demande alors GET /runs/<run>/shell-stage/<stage>/payload : livraison liée à la même opération approuvée, contexte, accès EXECUTING et once acquittée, sans accès restauré/inconnu et avec ressources de test réconciliées. Une courte attente technique bornée à1s ne concerne que l’accusé once déjà en cours d’émission ; aucune décision ou acquisition n’est attendue ou réessayée automatiquement.

Le lanceur fixe utilise /usr/bin/python3 -I -S et la bibliothèque standard, sans proxy ou redirection HTTP implicites. Il vérifie status200, longueur, SHA256, UTF-8 et CWD puis remplace son processus par /bin/bash -c avec le corps exact. Stdin, environnement, répertoire et sortie/exit restent ceux de l’exécution native ; aucun fichier mutable de script n’est introduit. Ni le long corps ni sa recomposition ne sont confiés au modèle après revue.

## Refus, preuves et restauration

Une invocation courte divergente reste sans once. Si le transport/hash/contexte est refusé APRÈS la once du lanceur, celui-ci termine125/CAB_SHELL_PAYLOAD_REFUSED avant le payload : la once du lanceur est consommée, elle n’est pas rejouée. Conserver l’accès et les preuves jusqu’à réconciliation explicite, puis seulement une nouvelle proposition/identité si requise. Aucun retry réseau ou commande automatique.

La livraison HTTP ne prouve pas à elle seule l’exécution ou le succès du payload : vérifier call/commande native exacte, once corrélée, fin/exit, sorties et effets métier attendus, puis libérer l’accès. Après fin/libération, l’ancienne opération n’autorise plus de livraison. Après rechargement, les stages persistent pour audit mais ne réactivent pas une opération restaurée/inconnue ; réconcilier selon les gardes existantes, sans nouvel effet implicite.

Stockage privé0600 atomique,128 stages maximum,16Mio maximum de registre ; corps64Kio maximum. Le plafond commande existant en UTF-16 s’applique au corps ET au lanceur ; aucun plafond n’est relevé, aucun corps tronqué. Une capacité atteinte est signalée, jamais résolue par purge automatique. Le rangement/effacement de preuves est une opération distinctement autorisée.

Qualification exacte2.2.0 : payload9860octets absent des requêtes du fournisseur de modèle après préparation, invocation courte passée par vrai MCP/APPROVED/HELD/once et résultat exact. Corps de transport volontairement altéré dans le seul banc privé : refus125 avant payload et aucun marqueur de succès. Tests de métadonnées seules, substitution, stockage/restauration, cibles étrangères, allow refusé et livraison avant/après autorisation. SCM/publication/CABU puis information restent distincts de l’adoption réelle par les propriétaires.

### Examen du contenu

L’orchestrateur examine le corps et l’invocation avant approbation. Pour une décision automatique, CAB transmet au validateur `operation.shellPayload` : transport, stageId, SHA256, taille et corps, issus du stage privé exactement corrélé. Le modèle de codage ne fournit pas cette preuve par texte libre et ne recopie pas le corps dans ses arguments shell. Ne jamais approuver la seule apparence générique du lanceur sans examiner ses effets réels.
