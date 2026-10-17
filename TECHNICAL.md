# TECHNICAL.md — Codex Approval Bridge (CAB)

## 1. Objet

Ce document décrit le fonctionnement technique de CAB. Il complète `PROJECT.md` sans reprendre son cadrage fonctionnel et `BUILD.md` sans traiter du packaging ou de la publication.

Le déroulement d'une session orchestrateur–agent de codage et ses contrats
de pilotage sont regroupés dans `ORCHESTRATED_CODING.md` à la racine du projet.
AGENTS.md conserve les règles générales et impose cette référence aux sessions
pilotées ; le présent document reste le cadrage technique des composants CAB.

## 2. Arborescence technique

```text
CAB/
├── .agents/plugins/marketplace.json
├── plugins/cab-approval-bridge/
│   ├── .codex-plugin/plugin.json
│   ├── skills/approval-bridge/SKILL.md
│   ├── skills/coding-session-statistics/SKILL.md
│   └── scripts/
│       ├── cgpt-approval-bridge-controller.mjs
│       ├── cgpt-approval-bridge-job-context.mjs
│       ├── cgpt-approval-bridge-runs.mjs
│       ├── cgpt-approval-bridge-import-observations.mjs
│       ├── cgpt-approval-bridge-observation-statistics.mjs
│       ├── cgpt-approval-bridge-resource-coordination.mjs
│       ├── cgpt-approval-bridge-statistics.mjs
│       ├── cgpt-approval-bridge-registry-lock.py
│       ├── cgpt-approval-bridge-supervisor.mjs
│       ├── cgpt-approval-bridge-supervisor-context.mjs
│       ├── cgpt-approval-bridge-prompts.py
│       ├── cgpt-approval-bridge-reset.py
│       ├── cgpt-approval-bridge-healthcheck.mjs
│       └── cgpt-approval-bridge-opencode-sse-client.mjs
├── src/
│   ├── cgpt_approval_bridge_server.py
│   ├── cgpt_approval_bridge_router.py
│   └── cgpt_approval_bridge_journal.py
└── .codex/commands/cab.md
```

`.codex/commands/cab.md` est la définition versionnée de la commande Codex
`/cab`. Elle n'est ni un serveur MCP ni un mécanisme de décision métier.

## 3. Broker MCP

Le broker utilise MCP `stdio` et JSON-RPC 2.0. Il est lancé localement par OpenCode et n'expose aucun port MCP réseau.

La version de projet actuelle est `1.3.0` pour le broker, le contrôleur et le
superviseur. Le plugin utilise cette même version de base, complétée d'un
cachebuster Codex pour les installations locales. L'implémentation Python
utilise uniquement la bibliothèque standard.

Un verrou exclusif `flock` garantit une instance unique pour un même espace persistant.

Après un arrêt non propre, la récupération reste synchrone avant la lecture
MCP. Sa première boucle de réparation utilise un index temporaire des couples
`(approval_id, event_type)`, construit depuis une lecture du journal et mis à
jour après chaque écriture durable réussie. Les contrôles de cohérence et
d'intégrité ainsi que les autres réparations conservent leur fonctionnement.

Les appels de liste d'approbations utilisent aussi un index temporaire local
à l'appel, construit depuis une seule lecture initiale du journal lorsque le
magasin n'est pas vide. Toutes les approbations sont réparées avant filtrage,
sans relecture du journal pour chaque recherche de présence. Les append
nécessaires conservent leurs contrôles et actualisent l'index après succès.
Le verrou du magasin, la sauvegarde des expirations avant journalisation,
le tri, le compte total, le filtre et la limite restent inchangés. Un magasin
vide n'entraîne aucune lecture du journal ; aucun cache global n'est ajouté.

## 4. Persistance

### 4.1 État courant

```text
/workspace/.opencode/state/cgpt-approval-bridge/approvals.json
```

### 4.2 Journal append-only

```text
/workspace/.opencode/state/cgpt-approval-bridge/events.ndjson
```

Le journal NDJSON est durable, ordonné et chaîné par SHA-256.

### 4.3 Checkpoint d'intégrité

Un checkpoint HMAC-SHA256 optionnel peut authentifier la tête du journal :

```text
/workspace/.opencode/state/cgpt-approval-bridge/journal.checkpoint.json
```

Les clés ne sont jamais exposées dans les interfaces de statut.

### 4.4 Durée de vie et purge d'une nouvelle session

La persistance et le journal append-only s'appliquent pendant le RUN et sa
reprise. Avant chaque nouvelle session CAB, `/cab start` applique la procédure
`references/session-reset.md` du skill distribué : inactivité prouvée, arrêt
des ressources CAB, déconnexion native du broker, purge complète puis
reconnexion et nouveau prévol. La cohérence de l'ancien état n'est pas une
précondition de sa purge ; aucune ancienne décision n'est restaurée.

Le script distribué `cgpt-approval-bridge-reset.py` reçoit
`--confirm-new-session` et un `--state-dir` absolu par espace CAB réellement
résolu. Le broker utilise par défaut le home OpenCode et les autres composants
le workspace ; les chemins ci-dessus sont des exemples, pas une résolution
de ces emplacements. Tous les chemins personnalisés doivent être couverts.
L'outil refuse les cibles non dédiées, symboliques, imbriquées ou les verrous
occupés/non ordinaires/à liens matériels avant toute suppression. Il ne lit
aucun ancien contenu et ne suit pas les liens internes.

La purge efface également les checkpoints, anciens jobs, rappels, états de
remédiation et conflits Syncthing. Seul l'inode de `broker.instance.lock` reste
vide, verrouillé jusqu'à la fin de la purge. Un état recréé ou une erreur
interdit le démarrage. Sources, secrets, configurations, rapports et historiques
natifs des agents restent hors purge. Une reprise ne purge rien, y compris
après prévol divergent : candidate, job et preuves sont conservés selon la
section 7.

## 5. États d'approbation

```text
PENDING
APPROVED
REJECTED
NEEDS_CLARIFICATION
CANCELLED
EXPIRED
```

`PENDING` est l'état décidable. Les autres sont terminaux.

## 6. Cycle de validation

```text
OpenCode
  → request_validation pour un mandat unitaire
  → broker : validation + requestId + persistance PENDING
  → POST local vers le contrôleur
  → décision explicite Codex
  → GET /decision/<requestId> par le broker
  → corrélation + persistance + journal
  → réponse MCP corrélée vers OpenCode
  → une permission native OpenCode correspondante, consommée une fois
```

Une absence de décision ne vaut jamais approbation.

Un mandat qui attend une permission native contient l’identifiant de session,
le répertoire cible et exactement un fichier relatif pour une édition, ou une
commande complète pour Bash, système ou OpenSpec. Après une décision
`approved`, le contrôleur ne répond `once` qu’à cette permission corrélée et
consomme le mandat. Un second fichier, une seconde commande ou une seconde
permission exige un nouveau `request_validation` et une nouvelle décision
Codex.

## 7. Contrôleur Codex

Le contrôleur est un programme Node.js exécuté hors sandbox. Il exige
`OC_Codex_OUTSIDE_SANDBOX=1` et un workspace de projet absolu fourni au
démarrage, lance `codex app-server`, crée un thread Codex en
lecture seule, reçoit les demandes du broker, obtient une décision structurée,
conserve les décisions pour le sondage du broker, expose une interface HTTP
locale et supervise le SSE direct OpenCode.

Codex y assume le rôle d’orchestrateur et de validateur de bout en bout : il
évalue chaque mandat, sans déléguer sa décision au broker ni à une portée de
job. L’archivage OpenSpec est traité comme un mandat distinct, approuvé
seulement après contrôle de son éligibilité, des validations et de la
cohérence finale.

`OC_CGPT_OUTSIDE_SANDBOX=1` reste un alias de compatibilité.

Au démarrage, le contrôleur restaure `controller-job.json` depuis son espace
runtime. Seule l'absence du fichier (`ENOENT`) permet un démarrage sans job.
Un JSON malformé ou une autre erreur de lecture arrête le démarrage avec un
code non nul avant l'ouverture HTTP et les interactions OpenCode ou Codex App
Server. Le diagnostic distingue JSON invalide et lecture impossible sans
reprendre le contenu, le message brut de l'erreur ou le chemin runtime.
Le fichier reste intact ; aucune réparation ou réinitialisation automatique
n'est effectuée. Les contrats valides, leurs jalons, leur gate et leurs
métadonnées de récupération conservent leur comportement de restauration.

Un JSON syntaxiquement valide est également contrôlé comme contrat : racine
objet non nulle et non tableau, identités, répertoire absolu, critères et types
persistés attendus. Une racine scalaire, un contrat incomplet ou un type
incompatible refuse le démarrage avec le diagnostic distinct « contrat
invalide ». Les champs historiques facultatifs et les extensions compatibles
restent acceptés ; le chargement ne réinitialise pas les dates, jalons, gate,
récupérations ou sessions révoquées et ne réécrit pas le fichier.

Le plugin distribue les modèles de services utilisateur
`cgpt-approval-bridge-controller.service` et
`cgpt-approval-bridge-supervisor.service`. `/cab start` installe ou actualise
de façon différée le contrôleur, le superviseur, le fichier d'environnement
non secret et les unités dans le profil utilisateur, exécute
`systemctl --user daemon-reload`, puis démarre explicitement les services. Il
ne les active jamais : l'installation du plugin et l'ouverture de session ne
démarrent donc aucun service CAB.

Les unités appliquent `Restart=on-failure` tant qu'elles sont en cours
d'exécution. `/cab stop` arrête explicitement le superviseur, puis le
contrôleur, sans supprimer les unités, arrêter OpenCode ou arrêter le broker
MCP. Un RUN CAB ne doit pas les remplacer par des processus éphémères.

Le gate terminal contrôle également les demandes locales sans décision,
indépendamment du compteur actif et de la dernière readiness broker. En mode
manuel, le retrait d'une demande du compteur actif ne la rend pas décidée :
un ancien `pending_count: 0` ne permet pas de clôturer tant qu'elle reste
indécise. Ce contrôle ne crée ni décision ni permission.

L'interface du contrôleur écoute par défaut sur `127.0.0.1:8788`. La
configuration admet uniquement les adresses loopback `127.0.0.1` et `::1`. Ce
port n'est pas un transport MCP. Elle expose `GET /status`, `GET /job`, `POST
/job/arm`, `POST /job/progress`, `POST /job/recover`, `POST /job/disarm`, `POST
/job/terminal-gate`, `POST /broker/readiness`, `POST /validation/request`,
`POST /validation/reminder` et `GET` ou `POST /decision/<requestId>` ; les
décisions admises sont `approved`, `rejected` et `needs_clarification`.

Le contrat de job accepte `strictCommands`, booléen facultatif valant `false`
par défaut. À `true`, les permissions Bash de sa session et de son répertoire
doivent contenir exactement la commande approuvée, sans suffixe ni
instrumentation de sortie. Cette option est persistée et exposée par
`GET /job` ; le comportement existant est conservé pour les autres jobs.

La récupération explicite `POST /job/recover` remplace une session dans le
même RUN, sans utiliser `/job/arm` ni désarmer le job. Son corps porte `phase`
(`prepare`, `retry`, `reconcile` ou `complete`), `jobId`, `expectedSessionId`, `sessionId`,
`recoveryId` et `preflightRequestId`. prepare contrôle le contexte OpenCode,
MCP, l'inactivité des deux sessions et l'absence de mandat indécis ou de
permission non résolue ; il persiste le gel et invalide les autorisations
exécutables de l'ancienne session sans réécrire leurs décisions.

Pendant ce gel, seule la commande exacte `/usr/bin/true` du prévol réservé
est admise, avec décision explicite et consommation unique. complete vérifie
la décision locale et les messages natifs : réponse MCP APPROVED corrélée,
commande exit 0 puis broker_readiness READY pending_count 0. Le transfert
conserve le job, le change, les critères, le dernier jalon et strictCommands,
avec historique des récupérations et sessions révoquées, gate OPEN. Les
mutations concurrentes sont refusées pendant les contrôles et la persistance.
Un échec conserve le gel ; les sessions révoquées restent interdites après
redémarrage. Les décisions locales du prévol ne sont pas reconstruites après
redémarrage : leur absence interdit complete ordinaire et requiert une décision humaine.
La reprise humaine ciblée de complete accepte developerAuthorization et
restoredPreflightProof seulement pour le même job désarmé avec gate persistant
VALIDATED/BLOQUÉ attestant sa consommation préalable. Le préfixe des parties
natives est vérifié par empreinte canonique SHA-256 et count ; décision originale,
identités, APPROVED/reviewer CGPT, commande exacte exit 0 et READY postérieur
sont recontrôlés. tools.bash=true pendant le prévol est interdit. La décision
est restaurée comme déjà consommée après persistance du transfert ; aucun once,
Bash ou message natif n'est rejoué. Référence humaine, empreintes et gate source
restent dans recoveryHistory ; le même job est réarmé, avec gate OPEN.
prepare capture aussi une frontière count/SHA des diagnostics MCP techniques
préalables ; aucun outil natif ni approve/reject n'y est admis. Les récupérations
héritées n'excluent que les diagnostics terminés avant preparedAt et avant la
demande réservée. Les frontières et contrôles retry/reconcile restent inchangés.
Le prévol admet un polling MCP corrélé après délai de request_validation ;
la réponse APPROVED réelle, l'exécution unique et la readiness finale restent
requises. Aucune installation ni migration du broker n'est nécessaire au
correctif source.

### Retry après prévol de récupération divergent

Après refus sans effet, conserver la candidate, le job et le runtime. Aucun
renouvellement de session, abandon technique ni purge n'est autorisé par cet
incident. POST /job/recover accepte phase retry avec jobId, expectedSessionId,
sessionId candidate et recoveryId inchangés, previousPreflightRequestId égal
à la réservation courante et preflightRequestId inédit. Les préconditions de
contexte, santé, MCP, inactivité et absence de permissions ou demandes non
résolues restent obligatoires.

Le contrôleur exige un refus natif REJECTED corrélé à une décision locale
rejected non consommée, ou une erreur native MCP -32602 avant enregistrement.
Un délai seul, une erreur générique, une décision approved, une commande ou
un autre outil natif interdit retry. Le polling ordinaire conserve approval_id.

retry persiste les identifiants antérieurs et une empreinte SHA-256 du préfixe
des parties tool natives, sans contenu de message. retry et complete vérifient
ce préfixe ; seules les nouvelles preuves après cette frontière composent le
nouveau prévol. Un historique altéré ou perdu conserve le gel. Les anciennes
requêtes et approbations ne sont pas réutilisables ; décisions, critères,
jalons et strictCommands restent intacts. Le superviseur attend complete.

Le nouveau prévol exige /usr/bin/true exact avec le change attendu, décision
explicite, réponse MCP corrélée, permission once, exit 0 puis READY sans demande
ni permission parasite. complete conserve la candidate et le job. Un nouvel
écart sûr autorise seulement un nouveau retry explicite dans cette même
candidate, sans concurrence ni rejeu du travail prouvé. Le checkpoint métier
conserve les tentatives et leurs références natives. Une preuve locale perdue
après redémarrage n'est pas recréée implicitement. OpenCode reste ouvert.

Depuis CAB 1.0.2, retry accepte aussi le REJECTED obtenu par poll_approval ou
get_approval après timeout de request_validation, pour la même approbation,
avec décision locale rejected non consommée et identités/opération exactes.
Un timeout seul ou PENDING seul reste insuffisant ; chaque demande enregistrée
doit avoir un refus terminal. Un arrêt ciblé explicitement demandé par le
développeur reste distinct de retry : gate BLOQUÉ et réconciliation avant
désarmement et libération, sans purge ni interruption des autres RUN.

### Réconciliation humaine du prévol exécuté sans once

La phase distincte `reconcile` traite uniquement un prévol `/usr/bin/true`
approuvé et exécuté sous `tools.bash=true`, sans permission native `once`.
Elle exige `developerAuthorization`, référence non secrète de l'accord humain
spécifique, les identités de récupération conservées, `previousPreflightRequestId`
et un `preflightRequestId` neuf. Les préconditions techniques restent requises.
La règle finale de permission `bash` de la candidate doit être `ask` avec
pattern `*`. Le message natif parent doit prouver `tools.bash=true`, la réponse
MCP doit être APPROVED corrélée avec reviewer CGPT, et la seule commande exacte
doit être terminée exit 0 après cette réponse, puis READY sans attente.

Toute consommation locale connue, autre outil, commande divergente ou preuve
absente refuse cette réconciliation. L'ancienne tentative reste invalide :
`EXECUTED_WITHOUT_NATIVE_ONCE`, référence d'autorisation, date, identifiants et
empreinte native sont persistés. Sa décision ne change pas ; son autorisation
exécutable locale est invalidée seulement après persistance. Après redémarrage
coordonné, les mêmes preuves natives et l'accord humain permettent de conserver
cette frontière sans reconstruire la décision locale perdue. Le nouveau prévol
exige sa propre décision et consommation `once` avant `complete`. Le `retry`
ordinaire n'est pas assoupli.

OpenCode 1.19.0 transforme `tools.bash=true` en permission native `allow`.
Pour réactiver un outil, envoyer le message de cadrage avec `noReply`, rétablir
ensuite explicitement les permissions `ask` par PATCH de session, les relire,
puis lancer le message exécutable sans champ `tools`. Ne pas utiliser `true`
pour réactiver Bash dans un message qui déclenche immédiatement la génération.

Pour les mandats lecture seule, le protocole distribué désactive explicitement
bash, edit, write, apply_patch, task et skill via le champ tools du message.
Un mandat exécutable réactive seulement ses outils nécessaires avec permissions
natives ask et décision CAB unitaire. Ce verrou ne modifie pas la configuration
persistante OpenCode.

### Garde des permissions natives — CAB 1.0.1

Pour un job armé, l'admission d'une validation exécutable, l'enregistrement
d'une décision `approved` manuelle ou automatique et la transmission native
de `once` vérifient par HTTP la session, son répertoire et ses règles. La
dernière règle couvrant le type `bash` ou `edit` doit avoir pattern `*` et
action `ask`, y compris lorsqu'un nom de permission contient des jokers.
Une règle spécifique en dernière position est refusée de façon conservatrice.
La candidate est également contrôlée pendant prepare, retry, reconcile et
complete. Une transition ou décision concurrente est recontrôlée après
chaque attente avant mutation ; un refus explicite reste possible sous allow.

Les diagnostics sont `native-permission-ask-required`,
`native-permission-control-unavailable`, `native-permission-context-divergent`
et `preflight-native-ask-required` pour la candidate. Le contrôle HTTP est
borné à dix secondes. Il n'écrit pas de permission, ne consomme pas de mandat
en cas d'échec et préserve les usages historiques sans job armé.
La réactivation suit `noReply`, PATCH `ask`, lecture native puis génération
sans nouveau champ `tools`. CAB ne peut rendre une modification externe des
règles atomique avec l'exécution native ; leur stabilité reste requise.

Le superviseur écoute par défaut sur `127.0.0.1:8789`. Il conserve son état
dans `.opencode/state/cgpt-approval-bridge/`, observe le contrat de job et la
session OpenCode, puis adresse une reprise à la même session après 60 secondes
par défaut si le gate terminal est ouvert. Il ne crée ni session de
remplacement, ni mandat, ni décision CAB. Lorsqu’une récupération est préparée,
il suspend les relances ; après complete, il suit la session transférée.

L'activité SSE est corrélée au job, à sa session et au répertoire lorsqu'il
est fourni par l'événement. Les événements d'autres sessions ou répertoires,
les heartbeats de transport et les trames sans identité exploitable ne
repoussent pas la reprise. Un JSON SSE invalide reste observable sans contenu
brut dans `lastEventError`, sans actualiser l'activité. Un changement de job,
session ou répertoire invalide l'ancienne horloge ; les états déjà enregistrés
restent lisibles sans migration. Le gel de récupération reste prioritaire.

Le statut public du superviseur expose `lastProvenMilestone` et `terminalGate`
depuis le dernier contrat observé ; ils sont indisponibles sans job armé.
`lastReconciliationAt` et la cause courante distinguent une observation passée
d'une réconciliation échouée. `resumeAttemptCount` compte les émissions de
reprise du job, séparément du résultat de `lastResumeAttempt`. L'incrément
est persisté avant émission ; un échec de cette persistance interdit la
requête et publie `resume-persistence-failed`. Un refus ou une préparation
abandonnée avant émission ne compte pas, contrairement à un échec réseau
après émission. Le compteur est conservé au redémarrage et lors du transfert
de session du même job ; un autre job commence à zéro. Un ancien état sans
compteur publie `null` tant que ce job reste surveillé, sans reconstruction
de son historique. Aucun paramètre de configuration supplémentaire n'est requis.

## 8. Supervision OpenCode

```text
OpenCode : http://127.0.0.1:4096
Health   : /global/health
MCP      : /mcp
SSE      : /global/event
```

Après reconnexion ou divergence, le contrôleur réconcilie l'état via HTTP et consulte les permissions OpenCode.

L'état `GET /mcp` du serveur OpenCode est l'autorité de connexion du broker
pour les sessions persistantes. Si `cgpt-validation` n'est pas `connected`, CAB
réinitialise l'instance OpenCode par `POST /instance/dispose`, attend une
nouvelle healthcheck et ne crée aucune session avant le rétablissement. CAB ne
termine ni ne démarre directement le broker, qui est détenu par OpenCode.

Après la purge d'un nouveau RUN et ce contrôle, CAB crée une nouvelle session
maîtresse persistante par `POST /session` ; seule une reprise du même RUN
réutilise sa session, sauf remplacement explicitement vérifié par /job/recover. CAB transmet les mandats uniquement par
`POST /session/<id>/message`. Le test de bout en bout et le travail ultérieur
restent dans cette session visible du développeur.

### Cadences de la boucle de pilotage

L'orchestrateur consomme le SSE en temps réel et contrôle les demandes et les
rapports toutes les 3 secondes. Pendant l'analyse ou la rédaction de l'agent
de codage, les vérifications de progression sont espacées de 7 secondes fixes,
sans ralentir le contrôle CAB. Ces cadences ne changent pas les délais
techniques du superviseur, les heartbeats ou les rappels du broker.

Après un échec du benchmark PLLM, le même RUN reste en attente non terminale.
Le benchmark est retenté toutes les 30 minutes (1 800 secondes), sans limite
de tentatives, jusqu'à reprise sûre ou arrêt explicite du développeur. Chaque
échec fixe la prochaine échéance ; le checkpoint non secret conserve RUN,
horodatages, causes, résultats et échéance. Une interruption conserve cette
échéance et impose la réconciliation des tentatives en cours ou d'effet inconnu,
sans essais simultanés ni duplication. La supervision reste active, sans
attente bloquante de trente minutes ni fermeture ou redémarrage des processus.

Une réussite exige la réconciliation des contextes, santé OpenCode, MCP,
readiness CAB réelle et permissions avant reprise. Un blocage distinct suit
la récupération CAB ; le benchmark ne vaut jamais approbation et ne rejoue
aucun mandat consommé. Les sondes statistiques restent prévues toutes les
30 minutes sans arrêter le travail pour attendre un créneau ; une sonde
échouée seule ne suspend pas le RUN.

Ces obligations appartiennent au protocole de l'orchestrateur distribué dans
la commande et les skills. Elles n'ajoutent pas un ordonnanceur autonome de
benchmark PLLM au broker, au contrôleur ou au superviseur.

## 9. Readiness et healthcheck

### Compactage coordonné des contextes

Le protocole impose un cycle commun toutes les 1 h 30 (5 400 secondes), piloté
par l'orchestrateur à une frontière entre mandats. Après traitement du rapport
et sauvegarde du checkpoint, il vérifie les API natives réellement exposées.
Si les deux sont disponibles, il déclenche les compactages en parallèle ;
sinon, il compacte les seules sessions accessibles et trace les opérations
non exécutées. Les deux preuves natives sont requises pour déclarer une
réussite conjointe, pas pour reprendre un RUN dont l'état reste exploitable.
Une API absente ou un échec avec contexte préservé laisse le cycle incomplet
avec sa cause. Après réconciliation sûre des contextes, santé OpenCode, MCP,
readiness CAB et permissions, les mandats déjà autorisés se poursuivent.
Ce seul écart ne bloque pas le RUN, n'arrête pas CAB, ne requiert pas de
dérogation et ne diffère pas les statistiques. Un compactage encore en cours,
un effet inconnu ou une réconciliation impossible suspend les opérations
concernées, sans rejeu aveugle. Une API absente est réexaminée à la prochaine
échéance, calculée depuis le déclenchement du cycle courant. L'horloge,
les sessions disponibles ou non exposées, les résultats et les éventuels
retards de fin de mandat sont conservés dans le checkpoint.

OpenCode expose `POST /session/<id>/summarize`. Codex App Server expose
`thread/compact/start` sur la connexion qui possède la session active : sa
réponse immédiate est seulement un accusé de lancement ; la fin doit être
observée via l'item natif `contextCompaction` achevé, corrélé au bon thread.
Le thread auxiliaire de décision créé par le contrôleur ne remplace pas celui
de l'orchestrateur principal. Une API non exposée doit rester une limite
signalée, pas une preuve fabriquée. `POST /instance/dispose` recharge un
contexte interne et ne constitue pas un compactage de conversation.

Cette règle décrit le pilotage attendu ; elle ne prétend pas qu'un automate
de compactage conjoint est déjà implémenté dans le contrôleur.

`broker_readiness` expose `READY`, `DEGRADED`, `BLOCKED` ou `HUMAN_REQUIRED`, avec cause racine, action recommandée, disponibilité du contrôleur, compteurs d'approbations et disponibilité éventuelle d'une auto-récupération.

Le broker publie périodiquement cette readiness au contrôleur local.

Lorsqu'un mandat notifié reste PENDING sans décision, le broker adresse aussi
au contrôleur une relance corrélée toutes les trente secondes. En mode
manuel, le contrôleur signale le rappel dans son statut sans créer de thread
ni de tour Codex ; seul l'orchestrateur principal publie la décision HTTP.
La même garde protège les heartbeats de relance. En mode automatique, le
contrôleur conserve la transmission à sa tâche orchestratrice, le heartbeat
de reprise et la notification locale persistante en cas d'indisponibilité.
Cette relance ne constitue jamais une décision ni une permission OpenCode.

Le healthcheck vérifie la santé OpenCode, le contrôleur, le superviseur, Codex
App Server, le SSE OpenCode et la fraîcheur de `broker_readiness`. Un état
fonctionnel `BLOCKED` ou `HUMAN_REQUIRED` n'entraîne pas un redémarrage
aveugle des services CAB.

## 10. Watchdogs et diagnostic

CAB sépare le watchdog des approbations `PENDING` et le watchdog de progression globale. Ce dernier distingue activité MCP, activité du contrôleur et progression métier réelle.

CAB synthétise une `root_cause` et une `recommended_action` couvrant notamment magasin, journal, intégrité, cohérence, workers, contrôleur, notifications, décisions, réconciliation et progression de session.

## 11. Remédiation contrôlée

Classes : `OBSERVE`, `DIAGNOSTIC`, `CONTROLLED`, `MANUAL`.

Les remédiations `CONTROLLED` utilisent préconditions, budget de tentatives, cooldown, idempotence, condition de succès, conditions d'abandon et escalade vers `HUMAN_REQUIRED`.

Actions actuellement exécutables :

```text
RECOVER_NOTIFICATION_LEASE
RECONCILE_PENDING_APPROVALS
RETRY_RECONCILIATION
REPAIR_CONSISTENCY
```

## 12. Auto-remédiation

L'auto-remédiation est désactivée par défaut et fonctionne en `default deny`. L'ordonnanceur automatique est actuellement limité à `RECOVER_NOTIFICATION_LEASE`.

Il est protégé par un circuit breaker persistant : `CLOSED`, `OPEN`, `HALF_OPEN`.

## 13. Reprise après crash

CAB détecte un arrêt non propre et peut, lorsque l'état est non ambigu, libérer des leases techniques abandonnées, traiter des tentatives orphelines, rechercher une décision déjà disponible, reprendre une notification ou réparer une divergence sûre.

Une divergence ambiguë conduit à `HUMAN_REQUIRED`.

## 14. Variables de configuration du broker

### Persistance et journal

- `CGPT_APPROVAL_STORE`
- `CGPT_APPROVAL_JOURNAL`
- `CGPT_BROKER_INSTANCE_LOCK`
- `CGPT_JOURNAL_HMAC_KEY`
- `CGPT_JOURNAL_HMAC_KEY_ID`
- `CGPT_JOURNAL_HMAC_PREVIOUS_KEYS`
- `CGPT_JOURNAL_CHECKPOINT_PATH`

### Contrôleur

- `CGPT_CONTROLLER_URL`

### Watchdogs

- `CGPT_PENDING_WATCHDOG_INTERVAL`
- `CGPT_PENDING_WATCHDOG_WARNING`
- `CGPT_PENDING_WATCHDOG_STALLED`
- `CGPT_SESSION_WATCHDOG_INTERVAL`
- `CGPT_SESSION_WATCHDOG_WARNING`
- `CGPT_SESSION_WATCHDOG_STALLED`

### Remédiation

- `CGPT_REMEDIATION_ORPHAN_TIMEOUT`
- `CGPT_AUTO_REMEDIATION_ENABLE`
- `CGPT_AUTO_REMEDIATION_ACTIONS`
- `CGPT_AUTO_REMEDIATION_INTERVAL`
- `CGPT_AUTO_REMEDIATION_CB_FAILURE_THRESHOLD`
- `CGPT_AUTO_REMEDIATION_CB_FAILURE_WINDOW`
- `CGPT_AUTO_REMEDIATION_CB_OPEN_SECONDS`
- `CGPT_AUTO_REMEDIATION_CB_STATE_PATH`

## 15. Variables du contrôleur et du healthcheck

- `OC_Codex_WORKSPACE` : racine absolue du projet à piloter ; aucune liste de
  projets n'est codée dans CAB
- `OC_Codex_OUTSIDE_SANDBOX`
- `OC_Codex_OPENCODE_URL`
- `OC_Codex_STATUS_HOST` : `127.0.0.1` ou `::1` uniquement
- `OC_Codex_STATUS_PORT`
- `OC_Codex_RECONNECT_MS`
- `OC_Codex_DECISION_MODE` : `manual` par défaut ou `automatic` pour
  utiliser le chemin de décision existant via Codex App Server ; en mode
  manuel, les demandes restent PENDING jusqu'à une décision HTTP explicite,
  et les rappels ne lancent aucun thread ni tour Codex auxiliaire
- `OC_Codex_CONTROLLER_URL` : URL commune au healthcheck et au superviseur ;
  accepte la base HTTP du contrôleur ou son endpoint `/status`, avec slash
  final éventuel. Les deux clients résolvent `/status` une seule fois ; le
  superviseur retrouve la base pour `/job`
- `OC_Codex_SUPERVISOR_URL`
- `OC_Codex_SUPERVISOR_STATUS_HOST` : `127.0.0.1` ou `::1` uniquement
- `OC_Codex_SUPERVISOR_STATUS_PORT`
- `OC_Codex_SUPERVISOR_RESUME_DELAY_MS` : 60 secondes par défaut
- `OC_Codex_SUPERVISOR_POLL_INTERVAL_MS`
- `OC_Codex_SUPERVISOR_STATE_PATH`
- `OC_Codex_READINESS_MAX_AGE_MS`
- `CODEX_COMMAND`

Les variables historiques équivalentes préfixées `OC_CGPT_` restent admises
par le contrôleur et le healthcheck pour préserver les installations existantes.

## 16. Commande `/cab`

La commande Codex `/cab`, définie dans `.codex/commands/cab.md`, orchestre le
cycle de vie des ressources de communication CAB. Elle ne remplace pas le
broker, ne rend pas de décision d'approbation et ne modifie pas le projet
piloté.

- `/cab status` et `/cab status --run <run_id>` consultent les vues GET CAB,
  les états natifs accessibles et les checkpoints/tâches ciblés. Le tableau
  indique explicitement activité, attente du pair nommé et sa cause, attente
  interne, arrêt, clôture ou statut indéterminé. Une ancienne attente levée ne
  prime pas sur une reprise prouvée ; codeur idle et orchestrateur actif sont
  distincts. La réponse se termine après le rapport, sans boucle de pilotage,
  message, écriture ni opération de cycle de vie. La commande distribuée
  définit le format exact et les règles de collecte ;
- `/cab start` purge les seuls anciens états CAB après contrôle d'inactivité,
  vérifie `/mcp`, initialise la supervision et crée une nouvelle session
  maîtresse ; la reprise conserve son état, y compris après prévol divergent
  dans la candidate selon la section 7 ;
- `/cab run` arme un contrat de job durable et actualise ses jalons avant de
  transmettre les mandats ; le superviseur reprend cette même session tant que
  le gate terminal reste ouvert ;
- `/cab test` réalise un test non destructif du chemin de validation complet
  dans cette même session ;
- `/cab update` compare la version installée de `cab-approval-bridge` à la
  version publiée par le marketplace Git `cab_codex_plugins`, le migre de façon
  réversible depuis une source locale si nécessaire, puis compare la
  commande du profil Codex à `AzenorPixs/cab-codex-plugins` sur `main`. Elle met à
  niveau chaque élément seulement lorsqu'une version plus récente est disponible
  et restitue les versions GitHub et locales du plugin, du contrôleur, du broker
  actif, du superviseur déployé et de la commande. Elle installe ou actualise
  atomiquement le script et l'unité du superviseur sans l'activer ni le
  démarrer ;
- `/cab stop` retire uniquement les ressources CAB qu'elle a créées. Elle ne
  doit ni arrêter directement le broker géré par OpenCode ni fermer
  arbitrairement OpenCode.

## 17. Statistiques à l'archivage

Le protocole charge le skill embarqué `coding-session-statistics` dès le début
de chaque change. Après chaque archivage autorisé et réussi, l'orchestrateur
fait générer `openspec/changes/archive/<archive>/STATISTIQUES.md` sous un mandat
d'édition distinct. Le relevé de quota final et la fin de l'intervalle suivent
l'archivage et précèdent la synthèse. Un lot exige un rapport par archive.

La preuve du rapport (existence, six sections, UTF-8/LF et totaux cohérents)
est un critère de fin du job avant toute clôture normale `TERMINÉ`. Le
contrôle est assuré par l'orchestrateur ; le gate HTTP existant ne lit pas
le projet. Si la publication échoue, le cycle reste incomplet et seul le
rapport est repris, sans réarchivage. Les mesures absentes restent `N/A`
motivées. Le contrôleur peut fournir un brouillon déterministe depuis ses
agrégats filtrés ; seul l'orchestrateur vérifie et fait publier le rapport.
Le service n'écrit jamais dans l'archive et ne décide aucune approbation.

Le profil optimisé prépare les agrégats pendant le travail. Après publication
et archive prouvées, la phase /closing limite la réservation au rapport et
libère les ressources métier. Le rapport et le gate restent obligatoires avant
livraison ; une nouvelle référence ne défait pas cette publication figée.

### Statistiques natives, fenêtres et coordination 1.3.0

SessionStatistics conserve ses agrégats et son brouillon individuel à six sections. Son snapshot schéma 2 lit le schéma 1 ; les métriques de ressources portent leur borne availableFrom sans reconstruction rétroactive. ObservationStatistics conserve séparément, dans son magasin schéma 2 lié au projet exact, segments, événements et imports filtrés dans controller-observations.json privé. Les sources se recouvrant ne sont pas additionnées ; busy et issuedEffectMs ne prouvent pas du codage productif.

GET /statistics/view et /runs/<runId>/statistics/view acceptent selection=current|last|24h|7d|30d, runId/contextId et format=markdown. La dernière livraison exige un passage DELIVERED observé, pas une publication ou une lecture. POST /statistics/import reçoit seulement {bundle}, limité à 64 MiB, pour le projet exact ; l'import est durable, idempotent et neutre sur les décisions, permissions et réservations. Les données natives gardent au plus 30 jours et 200000 éléments par famille ; l'absence de couverture reste INCONNU.

cgpt-approval-bridge-import-observations.mjs lit uniquement les chemins explicites --samples, --config, --monitor, --quota et --proof ; il produit --output sans écraser un fichier existant. --samples est répétable pour des journaux successifs ordonnés, jusqu'à 32 fichiers. L'audit doit déclarer l'arrêt de son collecteur. La lecture JSONL est progressive, limitée à 512 MiB par fichier et 2 MiB par ligne, avec contrôle de stabilité, fichiers ordinaires et refus des liens. Aucun chemin présent dans le contenu n'est suivi. Les quotas restent partagés ; une différence exige même compte, fenêtre et reset.

La référence concurrent-runs.md détaille accès, révisions, publication, supervision et gel exceptionnel. Le contrôleur distribué utilise ResourceRunRegistry ; le lecteur RunRegistry historique conserve la qualification des anciens formats et ne fournit plus une barrière métier dans le profil courant.

## 18. Secrets

Les clés HMAC et autres secrets doivent être injectés par l'environnement et rester hors Git, des journaux, des diagnostics et des sorties utilisateur.

## Contextes concurrents 1.3.0

Le registre controller-runs.json schéma 4 persiste sous autorité flock les identités, portées, accès actifs, files incompatibles, opérations, révisions, reçus et exceptions. Les schémas 1/2/3 sont restaurés en mode migration requise, sans nouvelle permission. Le magasin d'approbations broker conserve son schéma extensible 2 ; les champs d'opération nouveaux sont persistés/corrélés et la capacité resource-scoped-v1 empêche un jeu mixte d'autoriser un effet.

POST /runs/reserve attribue change/intention ; resources déclare la portée et exclusiveResources demande l'optimisation privée vérifiée. /extend et /resources changent la génération à une frontière sûre. GET /runs/<runId>/locks expose révisions et accès du RUN. /locks/acquire attribue un ensemble complet ou WAITING sans verrou partiel. /locks/attach rattache une correction approuvée dans le même ensemble ; aucune extension de ressources n'attend en détention.

Les notifications concurrentes du broker utilisent /validation/resource-request et /validation/resource-reminder, absentes des anciens contrôleurs. Les routes historiques restent disponibles sur le contrôleur 1.3.0 sous les mêmes gardes ; aucun repli vers leur chemin ancien ne transporte un RUN vers un ancien contrôleur. Les modules chargés vérifient leurs versions cohérentes avant démarrage.

Chaque request_validation ajoute coordination_protocol, operation_id, operation_digest, expected_revisions et access_id optionnel, en plus de run_id, reservation_version et resources. La décision reprend ces identités et le manifeste. Le contenu est préparé hors détention d'écriture inutile ; avant once, le contrôleur recontrôle les accès, révisions, session et règles natives ask. Un jeton restauré ou libéré ne donne pas une nouvelle permission. /locks/reconcile exige la frontière native prouvée et renouvelle token/fencing sans relâcher les fichiers ; une correction utilise une identité neuve.

La fin native est corrélée par session, type, empreinte de cible, callID disponible et dates. /locks/release persiste effets connus, révisions et libération avec COMPLETED, NO_EFFECT ou RECONCILED. Une fin inconnue garde sa protection et bloque le gate normal. Une correction a son mandat et once propres. Les alias physiques de fichiers sont refusés et les révisions de sous-arbre remarquent les créations.

POST /runs/<runId>/publish vérifie toutes les écritures à publier, protections et proofRevisions puis persiste un reçu idempotent, séquence de publication, génération et éventuel REPORT. referenceVersion reste un ordre observable sans invalider automatiquement les pairs. /reconcile porte expectedRevisions et evidence pour les seules ressources affectées. Les anciennes /integration et /integration-request sont refusées ; /integration-status conserve une consultation ciblée sans lecture de cohorte.

POST /runs/<runId>/suspend reçoit PAUSE, STOP ou RESUME avec version/evidence. /coordination/global/request n'admet que GLOBAL_RECONCILIATION, SHARED_MAINTENANCE, GLOBAL_PAUSE ou GLOBAL_STOP, scope=all et référence d'autorité. /confirm vérifie la cohorte native avant HELD ; /release exige les preuves et une reprise explicite. Une défaillance commune de magasin/journal peut fermer conservatoirement l'admission pour réconciliation, sans réparer ni purger. Le superviseur distingue attentes légitimes et reprend seulement après recontrôle ; le healthcheck reste diagnostique.

/coordination/migrate est réservé à une maintenance autorisée et quiescente. Une sauvegarde privée synchronisée précède la conversion ; les identités, demandes consommées, historiques et reçus restent conservés. Les RUN restent en PAUSE et maintenancePreflightRequired interdit le métier jusqu’à un prévol exact /usr/bin/true en read, once acquittée, exit 0 et accès libéré, après levée explicite du gel pour le seul RUN cible. /coordination/rollback avant nouvel usage restaure la sauvegarde exacte sous quiescence. Après nouvelles opérations ou effets, une réconciliation/conversion explicite est requise ; aucun état récent n'est effacé. Les procédures détaillées et exemples sont dans la référence distribuée. Aucune variable d'environnement nouvelle n'est requise.

Les usages historiques uniques sans RUN restent compatibles, mais leurs sessions/racines mutables sont enregistrées dans legacySources. Aucune réservation Multi-RUN ne les dépasse. /coordination/legacy/reconcile n'efface cette trace qu'après clôture historique, quiescence native et preuves examinées sous HELD pour réconciliation/maintenance ; legacyHandoffs conserve le reçu. Cette transition exceptionnelle ne réintroduit pas de barrière ordinaire entre RUN coordonnés.
