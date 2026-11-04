# Précisions mandates — CAB 2.2.29

Pour choisir sans relecture globale : [grille de décision](pilot-state-matrix.md) ;
pour une unité ordinaire : [soumission, décision et acquisition](validation-submission.md).

## RUN concurrents CAB 2.1.75

Lire [le contrat concurrent](concurrent-runs.md) et le noyau protocol-core.md avant pilotage. Un OpenCode et un broker stdio restent partagés ; change/intention, session, job, décisions, preuves et gates sont propres au RUN. Réserver par POST /runs/reserve avant préparation et armer POST /runs/<run_id>/job/arm ; garder le checkpoint output/<prompt>/<run_id>/state.json.

Le manifeste déclare la portée ; les accès actifs sont temporaires. Les lectures compatibles coexistent, les écritures recouvrantes attendent et /locks/acquire attribue l'ensemble entier ou WAITING sans acquisition partielle. Les fichiers privés prouvés peuvent éviter l'appel de verrou partagé ; leur promotion est coordonnée si un pair les déclare.

Chaque request_validation inclut coordination_protocol=resource-scoped-v1, run_id, reservation_version, operation_id, operation_digest, resources et expected_revisions. Préparer le contenu exact, obtenir la décision, acquérir juste avant effet et conserver ask/once. Une base périmée exige une nouvelle demande. Terminer les effets natifs corrélés avant /locks/release ; aucun timeout ni idle ne libère un effet inconnu.

### Réservation d’un environnement de test avec accès disjoints — CAB 2.1.75

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

Le broker peut notifier le contrôleur avant la fin du wrapper Code Mode `execute`
qui contient `request_validation`. Il corrèle aussi l’appel MCP natif unique
visible comme `running`, avec un wrapper `executed=false`, des identités exactes
et des métadonnées complètes non tronquées. Une recherche `search` unique et
terminée peut précéder l’appel. Un wrapper divergent, tronqué, exécuté ou avec
tout appel additionnel est refusé. Cette admission ne crée aucune décision,
permission ou `once`; les règles d’acquisition atomique gardent les écritures
recouvrantes en attente.

Après un redémarrage, diagnostiquer l’état durable avec
`GET /runs/<runId>/operations`, filtré si possible par `operationId`. Ce GET
est snapshot-only et ne retourne ni bearer token, ni cible, ni commande, ni
contenu. `onceAcknowledged` est l’accusé durable CAB : `false` ne prouve pas
qu’aucune réponse native n’a été traitée avant un crash. Le croiser aux GET
natifs de permission et d’historique. Pour `ISSUING`, `EXECUTING`, `UNKNOWN`,
permission encore présente ou preuve incomplète, garder l’accès protégé et ne
pas répondre, rejouer, libérer ou créer une nouvelle demande ; appliquer la
réconciliation dédiée et attendre la frontière native prouvée.

Pour diagnostiquer une opération après redémarrage, `GET /runs/<runId>/operations`
retourne une projection bornée du ledger du seul RUN, avec `onceAcknowledged`,
permissionId/callID, état natif et accès sans jeton, commande, chemin ni contenu.
Un filtre `operationId` cible une opération exacte. `onceAcknowledged=false`
signifie qu’aucun accusé durable n’est prouvé ; ce n’est pas une preuve que le
serveur natif n’a pas reçu une réponse. Croiser l’instantané avec les GET natifs
de permission et d’historique. Ne pas répondre à la permission ou créer une
nouvelle demande si l’état de l’effet reste indéterminé ; garder l’accès protégé
jusqu’à une frontière native prouvée.

Si le payload d'acquisition d'un accès `HELD` restauré a été perdu mais que
toutes ses opérations sont terminales, consulter
`GET /runs/<runId>/locks/reconcile-preview?operationId=...`, puis utiliser
`POST /runs/<runId>/locks/reconcile-restored` avec la version, le fencing, le
digest exact et un reçu neuf. Cette voie owner/RUN-scoped revalide les décisions
durables, deux lectures natives identiques, la session inactive, zéro permission,
les révisions et les conflits avant de renouveler token/fencing sur le même
accès `HELD`. Ne pas réessayer `/locks/acquire` ni rejouer `once`. Toute
opération incertaine, activité, permission ou divergence garde l'accès protégé.

Pour un shell foreground timeouté sans shellID ni exit, utiliser
`GET /runs/<runId>/locks/timeout-quarantine-preview?operationId=...` puis
`POST /runs/<runId>/locks/quarantine-timeout` si la preuve native double,
l’identité durable, l’inactivité et l’absence de permission concordent. CAB
conserve l’opération `EXECUTING`, `once` et le verrou port write. Le même RUN
peut alors acquérir un accès `read` à ce port avec une nouvelle décision ; les
écritures, les autres RUN, le gate et la libération restent bloqués.

Pour un shell foreground timeouté sans shellID ni exit, utiliser
`GET /runs/<runId>/locks/timeout-quarantine-preview?operationId=...` puis
`POST /runs/<runId>/locks/quarantine-timeout` si la preuve native double,
l’identité durable, l’inactivité et l’absence de permission concordent. CAB
conserve l’opération `EXECUTING`, `once` et le verrou port write. Le même RUN
peut alors acquérir un accès `read` à ce port avec une nouvelle décision ; les
écritures, les autres RUN, le gate et la libération restent bloqués.

CAB 2.1.70 persiste chaque décision terminale avant l’appel natif. Après
redémarrage, il restaure une décision seulement depuis la demande et la réponse
natives terminées, avec les mêmes RUN, session, mandat, empreintes et révisions.
Il continue le même `once` uniquement après deux lectures stables montrant la
permissionId et le callID exacts toujours pendants, l’outil correspondant
`running` avec `executed=false`, et l’accès réacquis sans conflit. Ce cas prouve
que la permission native d’origine attend toujours sa première réponse ; il ne
crée ni demande ni permission. Si la permission a disparu, le contrôleur lit le
journal durable V2 fini de la session et exige `log.synced`. Un unique
`session.tool.success` corrélé à la session, au callID, à l’outil, à l’entrée,
au mandat et aux empreintes clôt `COMPLETED` sans répondre à la permission ni
rejouer `once`. Une erreur ambiguë, l’absence d’événement, un outil démarré ou
une preuve incomplète conserve `UNKNOWN` et les ressources protégées. Ce journal
ne prouve jamais `permission.replied`. Les accès compatibles sans recouvrement
continuent ; aucune incertitude locale ne déclenche un gel global.

Après un échec de notification locale, le contrôleur peut réconcilier un rejet
déjà terminal uniquement si deux lectures identiques prouvent la demande
enregistrée, le rejet natif `CGPT`, les identités complètes et `REJECTED`.
Vérifier la session inactive, l’absence de permission et d’accès, puis persister
le rejet et `CANCELLED` atomiquement avec l’empreinte du transcript. Après
redémarrage, le même reçu est idempotent ; un transcript divergent, un autre
outil ou un effet possible conserve l’opération indécise. Ne jamais rejouer le
rejet, créer un accès ou transmettre `once` pour cette réconciliation.

Après redémarrage, le contrôleur peut aussi réconcilier la même validation
annulée par OpenCode lorsque `request_validation` et `cancel_approval` sont
visibles dans des wrappers Code Mode complets, non tronqués et
`executed=false`. Le wrapper d’annulation doit porter le code littéral exact de
découverte `cancel_approval`, puis un appel unique avec l’`approval_id` exact ;
sa sortie doit confirmer `CANCELLED`, `cancelled_by=OC` et toutes les identités
de la demande. Deux lectures identiques du transcript, une session inactive et
l’absence de permission ou d’accès restent obligatoires. Tout code, résultat,
wrapper ou ensemble d’appels divergent garde l’opération `PREPARED` ; aucune
décision, permission, nouvelle demande ou `once` n’est créé ou rejoué.

Valider et publier sur les ressources utiles avec /publish, sans /ready de cohorte ni réconciliation générale des pairs. Le reçu est durable ; REPORT est limité au STATISTICS.md propre au change. Rapport vérifié, gate, POST /runs/<run_id>/job/disarm puis /release restent requis. /CAB pause|stop --run <run_id> reste ciblé ; --all demande un gel exceptionnel pour réconciliation commune, maintenance, pause ou arrêt globaux.

Pour toute récupération de session adossée à un RUN, appliquer [le prévol natif de récupération](native-coding-recovery.md) avant `phase: "prepare"`. La candidate doit disposer de `shell: ask` et `edit: ask`, et le schéma natif exact de `request_validation` doit être découvert et scellé avant le gel. Après `prepare`, aucune nouvelle discovery n'est admise dans une récupération courante. Seule la complétion d'une recovery historique déjà préparée sans signature scellée peut réconcilier une discovery unique, exacte et read-only dans son transcript, sans rejouer de demande, décision ou permission ; toutes les autres restent refusées. Fournir un timeout fini explicite et conserver le même approval ID pour les polls. Le job historique sans RUN conserve son protocole existant.

Installer ensemble les scripts controller, job-context, model-policy, prepare-model-policy, run-steps, monitor-events, monitor-management, runs, resource-coordination, supervisor, supervisor-context, statistics, observation-statistics, statistics-maintenance, import-observations, registry-lock, SSE, healthcheck, client OpenCode V2, reset, source-read, update et prompts, avec leurs noms complets cgpt-approval-bridge-*. Le manifeste doit référencer le répertoire skills distribué ; approval-bridge doit porter `component-update.md`, la référence utilisée par l'updater. Un jeu mixte est refusé avant permission.


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


## Invariants

- `cgpt-validation` est un serveur MCP local `stdio` lancé par OpenCode.
- Le broker ne possède ni port MCP réseau ni serveur MCP HTTP exposé.
- Le broker relaie et persiste les demandes ; il ne décide jamais.
- Une demande porte un `requestId` stable et unique.
- Une deuxième décision pour le même `requestId` est refusée.
- Ne déclarer une étape validée qu’avec une preuve observée dans la session courante.
- `broker_readiness` est l’interface synthétique de supervision.
- `broker_health` reste réservé au diagnostic détaillé.
- Le contrôleur `../../scripts/cgpt-approval-bridge-controller.mjs` (chemin relatif à ce `SKILL.md`) s’exécute exclusivement hors sandbox avec `OC_Codex_OUTSIDE_SANDBOX=1`. L’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1` reste accepté.
- Le contrôleur est géré par le service utilisateur `cgpt-approval-bridge-controller.service`, avec `Restart=on-failure` pendant son exécution. `/CAB start` installe ses ressources sans l'activer, puis le démarre explicitement ; `/CAB stop` l'arrête. Ne pas utiliser un processus éphémère ou un `nohup` pour un RUN CAB.
- Le contrôleur n'écoute que `127.0.0.1` ou `::1`, avec `127.0.0.1` par défaut.
- OpenCode est observé indépendamment via son SSE HTTP direct.
- Après reconnexion SSE ou divergence, réconcilier l’état réel par HTTP auprès d’OpenCode.
- Les validations normales passent par MCP stdio.
- L’état `GET /api/mcp` du serveur OpenCode est la source de vérité de connexion MCP pour les sessions persistantes ; une sortie CLI ne peut pas s’y substituer.
- Une réinitialisation globale exclusive CAB purge entièrement son ancien état technique et crée une nouvelle session maîtresse après confirmation de `cgpt-validation: connected`. La réutilisation d'une session concerne seulement la reprise du même RUN. Tous les mandats passent par `POST /api/session/<id>/prompt` et restent observables dans OpenCode.
- Chaque opération OpenCode nécessitant une permission native constitue un mandat unitaire. Avant cette opération, l’agent soumet `request_validation` avec l’identifiant de session, le répertoire cible et exactement un fichier relatif ou une commande complète. Le contrôleur ne transmet `once` qu’après une décision CAB `approved` explicite et corrélée à ce mandat unique ; la réponse V2 est scoped avec `x-opencode-directory` sur la location exacte de la session, jamais sur la seule location par défaut du client ; cette décision est consommée après une seule permission native correspondante.
- La fin d’un tour OpenCode ne constitue pas la fin du job : conserver la boucle de pilotage et transmettre le mandat suivant dans la même session jusqu’à un état terminal explicite.
- Ne jamais lire, journaliser ou afficher de secret.
- Une interdiction de fermer ou redémarrer OpenCode vise son processus et
  l’interface visible. Le protocole V2 ne s'appuie pas sur `/instance/dispose`.
  Le secret Basic Auth reste hors du broker, du modèle, des sorties et des
  sources. Préserver le processus et la session, puis réconcilier `/api/info`,
  `/api/mcp`, `broker_readiness` réel et test CAB avant de reprendre le pilotage.


## Rôle non déléguable de l’orchestrateur

L’orchestrateur Codex pilote la session de codage persistante depuis `/CAB start`
jusqu’à son état terminal explicite. Il fixe les mandats, observe leur exécution,
contrôle leurs résultats et décide de la poursuite, de la correction, du refus,
de la suspension ou de la clôture du job.

Il est l’unique validateur opérationnel de chaque décision de la session. Toute
édition, commande Bash ou système, commande OpenSpec, test à effet de bord,
correction ou opération d’archivage OpenSpec fait l’objet d’un mandat unitaire
soumis à son examen et à sa décision explicite, corrélée et visible dans la
session persistante. Le feu vert initial du développeur autorise ce pilotage ;
il ne remplace jamais les décisions de l’orchestrateur.

L’agent de codage réalise les mandats validés, mais ne les autorise pas lui-même
et ne décide ni d’un élargissement de périmètre ni d’un archivage OpenSpec.
CAB est un transport neutre : il ne décide jamais. Après une décision
`approved` de l’orchestrateur, il ne fait que transmettre cette décision à
l’unique permission native OpenCode corrélée.

L’archivage OpenSpec est un mandat distinct. L’orchestrateur ne l’approuve
qu’après avoir vérifié les critères d’acceptation, les validations applicables,
la cohérence entre implémentation, spécifications et cadrages, ainsi que
l’absence de blocage connu. Cette décision clôt le cycle OpenSpec ciblé ; elle
ne vaut jamais autorisation d’archiver un autre changement.


## Mandats unitaires d’un job piloté

Le contrat de job fixe seulement l’objectif, les critères de fin et les
limites fonctionnelles. Il ne vaut jamais approbation d’écriture ou de
commande.

Avant chaque action qui déclenche une permission native OpenCode, soumettre un
nouveau `request_validation` avec un `requestId`, un `approval_id`, un
`change_id`, l’identifiant de la session, son répertoire cible et un résumé
compréhensible. Le mandat contient exactement l’un des deux objets suivants :

- un seul chemin relatif dans `files` et une liste `commands` vide pour une édition ;
- une liste `files` vide et une seule commande complète dans `commands` pour Bash ou OpenSpec.

Ne jamais grouper plusieurs fichiers, commandes, glob, préfixe ou commande
implicite. Attendre la décision explicite et corrélée de Codex. Si elle est
`approved`, CAB transmet cette unique décision à la permission native
correspondante et la consomme. Une seconde permission, même identique, exige
un nouveau mandat. Une demande non corrélée, `rejected`,
`needs_clarification`, `BLOCKED`, `HUMAN_REQUIRED` ou divergente suspend le
job et reste signalée dans la session persistante.

## Permission shell décomposée — CAB2.2.29

La garde d’exécution reste stricte. La procédure canonique de rejet journalisé
est dans [la reprise autonome](autonomous-recovery.md), section «Permission
shell décomposée» ;elle ne transforme pas un refus natif en décision de mandat.
