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
│   └── scripts/
│       ├── cgpt-approval-bridge-controller.mjs
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

La version de projet actuelle est `0.84.4`. Le plugin utilise cette même version de base, complétée d'un cachebuster Codex pour les installations locales. L'implémentation Python utilise uniquement la bibliothèque standard.

Un verrou exclusif `flock` garantit une instance unique pour un même espace persistant.

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

Le plugin distribue le modèle de service utilisateur
`cgpt-approval-bridge-controller.service`. `/cab start` installe ou actualise
de façon différée le contrôleur, le fichier d'environnement non secret et
l'unité dans le profil utilisateur, exécute `systemctl --user daemon-reload`,
puis démarre explicitement le service. Il ne l'active jamais : l'installation
du plugin et l'ouverture de session ne démarrent donc aucun contrôleur.

L'unité applique `Restart=on-failure` tant qu'elle est en cours d'exécution.
`/cab stop` arrête explicitement ce service sans supprimer l'unité, sans
arrêter OpenCode et sans arrêter le broker MCP. Un RUN CAB ne doit pas le
remplacer par un processus éphémère : le service conserve la disponibilité du
contrôleur pendant les notifications et décisions corrélées.

L'interface locale écoute par défaut sur `127.0.0.1:8788`. La configuration
admet uniquement les adresses loopback `127.0.0.1` et `::1`. Ce port n'est pas
un transport MCP. Elle expose `GET /status`, `POST /broker/readiness`, `POST
/validation/request`, `POST /validation/reminder` et `GET` ou `POST /decision/<requestId>` ; les décisions
admises sont `approved`, `rejected` et `needs_clarification`.

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

Après ce contrôle, CAB crée ou réutilise une session de codage persistante par
`POST /session` et transmet les mandats uniquement par
`POST /session/<id>/message`. Le test de bout en bout et le travail ultérieur
restent dans cette session visible du développeur.

## 9. Readiness et healthcheck

`broker_readiness` expose `READY`, `DEGRADED`, `BLOCKED` ou `HUMAN_REQUIRED`, avec cause racine, action recommandée, disponibilité du contrôleur, compteurs d'approbations et disponibilité éventuelle d'une auto-récupération.

Le broker publie périodiquement cette readiness au contrôleur local.

Lorsqu'un mandat notifié reste PENDING sans décision, le broker adresse aussi
au contrôleur une relance corrélée toutes les trente secondes. Le contrôleur
transmet l'événement à sa tâche orchestratrice, planifie un heartbeat de
reprise si nécessaire et conserve une notification locale persistante lorsque
le réveil reste indisponible. Cette relance ne constitue jamais une décision
ni une permission OpenCode.

Le healthcheck vérifie la santé OpenCode, le contrôleur, Codex App Server, le SSE OpenCode et la fraîcheur de `broker_readiness`. Un état fonctionnel `BLOCKED` ou `HUMAN_REQUIRED` n'entraîne pas un redémarrage aveugle du contrôleur.

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
- `OC_Codex_READINESS_MAX_AGE_MS`
- `CODEX_COMMAND`

Les variables historiques équivalentes préfixées `OC_CGPT_` restent admises
par le contrôleur et le healthcheck pour préserver les installations existantes.

## 16. Commande `/cab`

La commande Codex `/cab`, définie dans `.codex/commands/cab.md`, orchestre le
cycle de vie des ressources de communication CAB. Elle ne remplace pas le
broker, ne rend pas de décision d'approbation et ne modifie pas le projet
piloté.

- `/cab start` vérifie `/mcp`, initialise ou reprend le contrôleur et la
  supervision, puis crée ou réutilise une session de codage persistante ;
- `/cab test` réalise un test non destructif du chemin de validation complet
  dans cette même session ;
- `/cab update` compare la version installée de `cab-approval-bridge` à la
  version publiée par le marketplace Git `cab_codex_plugins`, le migre de façon
  réversible depuis une source locale si nécessaire, puis compare la
  commande du profil Codex à `AzenorPixs/cab-codex-plugins` sur `main`. Elle met à
  niveau chaque élément seulement lorsqu'une version plus récente est disponible
  et restitue les versions GitHub et locales du plugin, du contrôleur, du broker
  actif et de la commande ;
- `/cab stop` retire uniquement les ressources CAB qu'elle a créées. Elle ne
  doit ni arrêter directement le broker géré par OpenCode ni fermer
  arbitrairement OpenCode.

## 17. Secrets

Les clés HMAC et autres secrets doivent être injectés par l'environnement et rester hors Git, des journaux, des diagnostics et des sorties utilisateur.
