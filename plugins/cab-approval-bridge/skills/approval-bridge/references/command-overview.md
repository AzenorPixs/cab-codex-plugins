# Syntaxe et transport — CAB 2.2.18

## RUN concurrents CAB 2.2.18

Lire [le contrat concurrent](concurrent-runs.md) et le noyau protocol-core.md avant pilotage. Un OpenCode et un broker stdio restent partagés ; change/intention, session, job, décisions, preuves et gates sont propres au RUN. Réserver par POST /runs/reserve avant préparation et armer POST /runs/<run_id>/job/arm ; garder le checkpoint output/<prompt>/<run_id>/state.json.

Le manifeste déclare la portée ; les accès actifs sont temporaires. Les lectures compatibles coexistent, les écritures recouvrantes attendent et /locks/acquire attribue l'ensemble entier ou WAITING sans acquisition partielle. Les fichiers privés prouvés peuvent éviter l'appel de verrou partagé ; leur promotion est coordonnée si un pair les déclare.

Chaque request_validation inclut coordination_protocol=resource-scoped-v1, run_id, reservation_version, operation_id, operation_digest, resources et expected_revisions. Préparer le contenu exact, obtenir la décision, acquérir juste avant effet et conserver ask/once. Une base périmée exige une nouvelle demande. Terminer les effets natifs corrélés avant /locks/release ; aucun timeout ni idle ne libère un effet inconnu.

### Réservation d’un environnement de test avec accès disjoints — CAB 2.2.18

`/test-resources/acquire` ne doit pas être bloqué par les seuls accès actifs
HELD, EXECUTING, UNKNOWN ou WAITING du même RUN lorsque leurs ressources sont
disjointes de l’environnement demandé. Un accès recouvrant continue de bloquer
l’acquisition. Conserver sans modification chaque accès, notamment UNKNOWN ;
garder les contrôles de phase, génération, suspension, conflits FIFO et toute
réservation de test déjà active du RUN. La progression disjointe ne permet
aucune permission `once` sans son bail et ses accès natifs corrélés.

CAB 2.1.70 peut aussi normaliser un wrapper `execute` terminé et non exécuté
qui appelle directement `request_validation` une seule fois : seul un identifiant
nu dans le champ racine `requestId` est lié à l’input du call natif unique.
Tous les autres champs doivent être littéraux et correspondre à cet input.
L’ordre des clés d’objets ne change pas l’identité ; les valeurs et l’ordre des
tableaux restent exacts. Une variable dans un autre champ, une troncature, un
call ajouté ou un wrapper exécuté reste refusé. Cette corrélation n’accorde ni
décision, ni accès, ni permission, ni `once`.

Après un redémarrage, utiliser le GET snapshot-only `/runs/<runId>/operations`,
filtré par `operationId` lorsque disponible, pour lire l’état durable et
`onceAcknowledged`. Cette projection n’expose ni jeton, ni commande, ni chemin,
ni contenu. `onceAcknowledged=false` ne prouve pas l’absence d’effet si un
crash a interrompu l’accusé. Le croiser aux GET natifs de permission et
d’historique ; garder l’accès protégé et n’émettre aucune réponse, retry ou
nouvelle demande tant que l’état natif n’établit pas une frontière sûre.

Si le payload d'acquisition d'un accès `HELD` restauré est perdu et que ses
opérations sont terminales, lire le prévol snapshot-only
`/runs/<runId>/locks/reconcile-preview?operationId=...`. Après vérification du
RUN, de l'accès, des ressources, des révisions, des décisions durables et du
digest exact, le propriétaire peut envoyer
`POST /runs/<runId>/locks/reconcile-restored` avec la version, le fencing, un
reçu neuf et les références de preuve. CAB relit l'historique natif, exige deux
observations identiques, une session inactive, aucune permission et aucun
conflit. Le reçu renouvelle token/fencing sur le même accès `HELD`, sans
réacquisition, nouvelle permission ni rejeu `once`. Une opération incertaine,
une activité, un conflit ou une divergence garde l'accès protégé.

Pour un timeout shell foreground sans shellID ni exit, lire le prévol
`/runs/<runId>/locks/timeout-quarantine-preview?operationId=...`, puis envoyer
`POST /runs/<runId>/locks/quarantine-timeout` avec version, fencing, digest et
un reçu neuf. La preuve exige le tool part natif exact, deux transcript/snapshots
stables, une session inactive et aucune permission. La quarantine conserve
l’opération `EXECUTING`, `once` acquitté et le verrou port write `HELD`. Elle
permet seulement au même RUN d’acquérir une lecture du port sous une nouvelle
décision ; elle n’autorise ni écriture concurrente, ni autre RUN, ni gate, ni
libération.

Pour un timeout shell foreground sans shellID ni exit, lire le prévol
`/runs/<runId>/locks/timeout-quarantine-preview?operationId=...`, puis envoyer
`POST /runs/<runId>/locks/quarantine-timeout` avec version, fencing, digest et
un reçu neuf. La preuve exige le tool part natif exact, deux transcript/snapshots
stables, une session inactive et aucune permission. La quarantine conserve
l’opération `EXECUTING`, `once` acquitté et le verrou port write. Elle permet
seulement au même RUN d’acquérir une lecture du port sous une nouvelle décision ;
elle n’autorise ni écriture concurrente, ni autre RUN, ni gate, ni libération.

Pour un diagnostic après redémarrage, utiliser le GET snapshot-only
`/runs/<runId>/operations`, éventuellement filtré par `operationId`. Il expose
l’état durable et `onceAcknowledged`, sans bearer token, commande, chemin ou
contenu natif. `onceAcknowledged=false` n’établit pas à lui seul l’absence
d’effet. Le rapprocher de la permission et du transcript natifs en lecture
seule. Si la permission a disparu, lire le journal durable V2 de la session en
mode fini et exiger `log.synced`. Un unique `session.tool.success` exactement
corrélé clôt `COMPLETED` sans répondre à la permission ni rejouer `once` ; une
erreur, une absence ou une divergence reste `UNKNOWN` avec les ressources
protégées. Le journal ne prouve pas `permission.replied`.

Valider et publier sur les ressources utiles avec /publish, sans /ready de cohorte ni réconciliation générale des pairs. Le reçu est durable ; REPORT est limité au STATISTICS.md propre au change. Rapport vérifié, gate, POST /runs/<run_id>/job/disarm puis /release restent requis. /CAB pause|stop --run <run_id> reste ciblé ; --all demande un gel exceptionnel pour réconciliation commune, maintenance, pause ou arrêt globaux.

Installer ensemble les scripts controller, job-context, model-policy, prepare-model-policy, run-steps, monitor-events, monitor-management, runs, resource-coordination, supervisor, supervisor-context, statistics, observation-statistics, statistics-maintenance, import-observations, registry-lock, SSE, healthcheck, reset, source-read, update et prompts, avec leurs noms complets cgpt-approval-bridge-*. Un jeu mixte est refusé avant permission. Le registre schéma 4 conserve ses règles de migration dans les procédures métier ; `/CAB update` ne consulte ni ne migre le registre, et ne purge ni ne reprend aucun RUN.

## Étapes du cycle et observation web

Charger la référence distribuée `run-lifecycle.md` du skill
approval-bridge pour le catalogue des onze étapes. Après armement, lire la
séquence courante du job puis déclarer chaque étape examinée par
`POST /runs/<run_id>/job/progress` avec stepId, stepStatus et
expectedStepSequence. Un retour de Vérifications ou Revue vers Implémentation
est autorisé et historisé. Les étapes non renseignées ne sont jamais déduites
du texte libre, du mandat ou de la phase. ETAT, étape, phase technique et
cases de tâches restent distincts ; aucune déclaration ne vaut permission ou
gate terminal. Les jobs anciens sans lifecycle restent compatibles.

## Continuité du job

Après `/CAB start`, conserver la session de codage active jusqu’aux critères de fin explicitement définis dans le contexte initial du job.

Ne jamais clore la réponse, arrêter le pilotage ou déclarer le travail terminé après un jalon intermédiaire : healthcheck, test POC, lot documentaire, diff, test unitaire ou réponse OpenCode.

Conserver le contexte initial du job comme source de vérité pendant toute la session : objectif, périmètre, spécifications OpenSpec, critères de validation, interdictions et délégations.

Un tour OpenCode achevé n’est jamais une fin de job. Tant que le job n’est ni
terminé, ni bloqué, ni explicitement arrêté, lire son dernier résultat dans la
session persistante et transmettre le mandat suivant dans cette même session.
Ne jamais envoyer de réponse finale au développeur pendant cet état RUN.

Voir [cadences](protocol-cadences.md), [PLLM](protocol-model.md) et [compaction](protocol-compaction.md) selon le besoin.

## Syntaxe

Les seules sous-commandes admises sont :

- `/CAB start`
- `/CAB run`
- `/CAB stop`
- `/CAB test`
- `/CAB update` (ou `/CABU` sans argument)
- `/CAB status`
- `/CAB status --run <run_id>`
- `/CAB source --run <run_id> --operation read --path <relative_file>`
- `/CAB source --run <run_id> --operation list [--path <relative_directory>]`
- `/CAB source --run <run_id> --operation find --query <text> [--type file|directory] [--limit <1..200>]`
- `/CAB stats`, `/CAB statslast`, `/CAB stats 24`, `/CAB stats7`, `/CAB stats30` (option --run <run_id>)
- `/CAB pause --run <run_id>`, `/CAB resume --run <run_id>`, `/CAB stop --run <run_id>`
- `/CAB pause --all`, `/CAB resume --all`, `/CAB stop --all`

Sans argument ou avec un argument inconnu, affiche cette syntaxe et n’effectue aucune action.

## Invariant de transport

Le flux normal est strictement le suivant :

```text
OpenCode ↔ cgpt-validation : MCP stdio local
cgpt-validation ↔ contrôleur Codex : HTTP/SSE local
OpenCode → contrôleur Codex : SSE HTTP direct
```

OpenCode lance `cgpt-validation` comme serveur MCP local `stdio`.

Le broker ne possède ni port MCP réseau, ni serveur MCP HTTP, ni SSE MCP exposé.

Le contrôleur Codex est local et s’exécute hors sandbox.

Le broker :
- corrèle les demandes par `requestId` ;
- persiste leur état ;
- ne remplace jamais une décision corrélée déjà enregistrée, y compris par
  une décision automatique postérieure ;
- notifie le contrôleur ;
- récupère les décisions ;
- restitue à OpenCode une réponse MCP corrélée ;
- ne décide jamais à la place de Codex ;
- ne modifie jamais le projet.

`broker_readiness` est l’interface synthétique de supervision.
`broker_health` reste réservé au diagnostic détaillé.
