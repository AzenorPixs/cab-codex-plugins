# TECHNICAL.md — Codex Approval Bridge (CAB)

## 1. Objet

Ce document décrit le fonctionnement technique de CAB. Il complète `PROJECT.md` sans reprendre son cadrage fonctionnel et `BUILD.md` sans traiter du packaging ou de la publication.

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

La version de projet actuelle est `0.86.6` pour le broker, le contrôleur et le
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
natifs des agents restent hors purge. Une reprise du même RUN ne purge rien.

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

L'interface du contrôleur écoute par défaut sur `127.0.0.1:8788`. La
configuration admet uniquement les adresses loopback `127.0.0.1` et `::1`. Ce
port n'est pas un transport MCP. Elle expose `GET /status`, `GET /job`, `POST
/job/arm`, `POST /job/progress`, `POST /job/disarm`, `POST
/job/terminal-gate`, `POST /broker/readiness`, `POST /validation/request`,
`POST /validation/reminder` et `GET` ou `POST /decision/<requestId>` ; les
décisions admises sont `approved`, `rejected` et `needs_clarification`.

Le contrat de job accepte `strictCommands`, booléen facultatif valant `false`
par défaut. À `true`, les permissions Bash de sa session et de son répertoire
doivent contenir exactement la commande approuvée, sans suffixe ni
instrumentation de sortie. Cette option est persistée et exposée par
`GET /job` ; le comportement existant est conservé pour les autres jobs.

Le superviseur écoute par défaut sur `127.0.0.1:8789`. Il conserve son état
dans `.opencode/state/cgpt-approval-bridge/`, observe le contrat de job et la
session OpenCode, puis adresse une reprise à la même session après 60 secondes
par défaut si le gate terminal est ouvert. Il ne crée ni session de
remplacement, ni mandat, ni décision CAB.

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
réutilise sa session. CAB transmet les mandats uniquement par
`POST /session/<id>/message`. Le test de bout en bout et le travail ultérieur
restent dans cette session visible du développeur.

## 9. Readiness et healthcheck

### Compactage coordonné des contextes

Le protocole impose un cycle commun toutes les 1 h 30 (5 400 secondes), piloté
par l'orchestrateur à une frontière entre mandats. Après checkpoint, il vérifie
les API exposées et compacte en parallèle les deux sessions actives lorsque
c'est possible, sinon les seules sessions accessibles. Les deux preuves sont
requises pour déclarer une réussite conjointe. L'horloge, les retards, les
opérations non exécutées et les échecs sont conservés dans le checkpoint.

OpenCode expose `POST /session/<id>/summarize`. Codex App Server expose
`thread/compact/start` sur la connexion qui possède la session active : sa
réponse immédiate est seulement un accusé de lancement ; la fin doit être
observée via l'item natif `contextCompaction` achevé, corrélé au bon thread.
Le thread auxiliaire de décision créé par le contrôleur ne remplace pas celui
de l'orchestrateur principal. Une API non exposée doit rester une limite
signalée, pas une preuve fabriquée ni un blocage automatique du RUN.
Après réconciliation sûre des contextes, de la santé OpenCode, de MCP, de la
readiness et des permissions, le pilotage continue sans dérogation ni report
des statistiques, même si le compactage reste incomplet. Un compactage encore
en cours ou une réconciliation impossible suspend les opérations concernées ;
une opération d'effet inconnu n'est pas répétée aveuglément. Les API absentes
sont réexaminées à l'échéance suivante du cycle, sans attente bloquante.
`POST /instance/dispose` recharge un
contexte interne et ne constitue pas un compactage de conversation.

Cette règle décrit le pilotage attendu ; elle ne prétend pas qu'un automate
de compactage conjoint est déjà implémenté dans le contrôleur.

`broker_readiness` expose `READY`, `DEGRADED`, `BLOCKED` ou `HUMAN_REQUIRED`, avec cause racine, action recommandée, disponibilité du contrôleur, compteurs d'approbations et disponibilité éventuelle d'une auto-récupération.

Le broker publie périodiquement cette readiness au contrôleur local.

Lorsqu'un mandat notifié reste PENDING sans décision, le broker adresse aussi
au contrôleur une relance corrélée toutes les trente secondes. Le contrôleur
transmet l'événement à sa tâche orchestratrice, planifie un heartbeat de
reprise si nécessaire et conserve une notification locale persistante lorsque
le réveil reste indisponible. Cette relance ne constitue jamais une décision
ni une permission OpenCode.

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
  conserver les demandes PENDING jusqu'à une décision corrélée sur l'interface
  HTTP locale
- `OC_Codex_CONTROLLER_URL`
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

- `/cab start` purge les seuls anciens états CAB après contrôle d'inactivité,
  vérifie `/mcp`, initialise la supervision et crée une nouvelle session
  maîtresse ; la reprise du même RUN conserve son état ;
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
motivées. Le broker et le contrôleur ne rédigent ni n'approuvent le rapport.

## 18. Secrets

Les clés HMAC et autres secrets doivent être injectés par l'environnement et rester hors Git, des journaux, des diagnostics et des sorties utilisateur.
