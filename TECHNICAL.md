# TECHNICAL.md — CGPT Approval Bridge (CAB)

## 1. Objet

Ce document décrit le fonctionnement technique de CAB. Il complète `PROJECT.md` sans reprendre son cadrage fonctionnel et `BUILD.md` sans traiter du packaging ou de la publication.

## 2. Arborescence technique

```text
CAB/
├── src/
│   ├── cgpt_approval_bridge_server.py
│   ├── cgpt_approval_bridge_router.py
│   └── cgpt_approval_bridge_journal.py
├── cab-codex-plugins/
│   ├── .agents/plugins/marketplace.json
│   └── plugins/cab-approval-bridge/
│       ├── .codex-plugin/plugin.json
│       ├── skills/approval-bridge/SKILL.md
│       └── scripts/
│           ├── cgpt-approval-bridge-controller.mjs
│           ├── cgpt-approval-bridge-healthcheck.mjs
│           └── cgpt-approval-bridge-opencode-sse-client.mjs
└── codex/commands/cab.md
```

## 3. Broker MCP

Le broker utilise MCP `stdio` et JSON-RPC 2.0. Il est lancé localement par OpenCode et n'expose aucun port MCP réseau.

La version de projet actuelle est `0.61.0`. Le plugin utilise cette même version de base, complétée d'un cachebuster Codex pour les installations locales. L'implémentation Python utilise uniquement la bibliothèque standard.

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
  → request_validation
  → broker : validation + requestId + persistance PENDING
  → POST local vers le contrôleur
  → décision CGPT
  → GET /decision/<requestId> par le broker
  → corrélation + persistance + journal
  → réponse MCP corrélée vers OpenCode
```

Une absence de décision ne vaut jamais approbation.

## 7. Contrôleur CGPT

Le contrôleur est un programme Node.js exécuté hors sandbox. Il exige `OC_CGPT_OUTSIDE_SANDBOX=1` et un workspace autorisé, lance `codex app-server`, crée un thread Codex en lecture seule, reçoit les demandes du broker, obtient une décision structurée, conserve les décisions pour le sondage du broker, expose une interface HTTP locale et supervise le SSE direct OpenCode.

L'interface locale écoute par défaut sur `127.0.0.1:8788`. Ce port n'est pas un transport MCP. Elle expose `GET /status`, `POST /broker/readiness`, `POST /validation/request` et `GET` ou `POST /decision/<requestId>` ; les décisions admises sont `approved`, `rejected` et `needs_clarification`.

## 8. Supervision OpenCode

```text
OpenCode : http://127.0.0.1:4096
Health   : /global/health
SSE      : /global/event
```

Après reconnexion ou divergence, le contrôleur réconcilie l'état via HTTP et consulte les permissions OpenCode.

## 9. Readiness et healthcheck

`broker_readiness` expose `READY`, `DEGRADED`, `BLOCKED` ou `HUMAN_REQUIRED`, avec cause racine, action recommandée, disponibilité du contrôleur, compteurs d'approbations et disponibilité éventuelle d'une auto-récupération.

Le broker publie périodiquement cette readiness au contrôleur local.

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

- `OC_CGPT_WORKSPACE`
- `OC_CGPT_OUTSIDE_SANDBOX`
- `OC_CGPT_OPENCODE_URL`
- `OC_CGPT_STATUS_HOST`
- `OC_CGPT_STATUS_PORT`
- `OC_CGPT_RECONNECT_MS`
- `OC_CGPT_CONTROLLER_URL`
- `OC_CGPT_READINESS_MAX_AGE_MS`
- `CODEX_COMMAND`

## 16. Commande `/cab`

- `/cab start` initialise et vérifie le dispositif ;
- `/cab test` réalise un test non destructif ;
- `/cab stop` retire les ressources CAB sans arrêter directement le broker géré par OpenCode ni fermer arbitrairement OpenCode.

## 17. Secrets

Les clés HMAC et autres secrets doivent être injectés par l'environnement et rester hors Git, des journaux, des diagnostics et des sorties utilisateur.
