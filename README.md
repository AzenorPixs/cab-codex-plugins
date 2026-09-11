# CGPT Approval Bridge — CAB

**CAB** relie OpenCode et CGPT pour fournir un cycle de validation explicite, persistant, observable et résilient.

Le bridge transporte les demandes de validation d'OpenCode vers CGPT, conserve leur état, récupère la décision correspondante et restitue une réponse MCP corrélée à OpenCode.

Il ne décide jamais à la place de CGPT et ne modifie pas le projet piloté.

## Architecture

```text
OpenCode
   │ MCP stdio
   ▼
CAB Broker
   │ HTTP local
   ▼
Contrôleur CGPT ──► Codex App Server

OpenCode ── SSE HTTP direct ──► supervision CAB
```

Le broker MCP est **local en stdio** : aucun serveur MCP réseau n'est exposé.

## Ce que fournit CAB

- broker MCP persistant ;
- corrélation par `requestId` ;
- journal append-only et contrôle d'intégrité ;
- reprise après interruption ;
- watchdogs de validation et de session ;
- readiness `READY / DEGRADED / BLOCKED / HUMAN_REQUIRED` ;
- diagnostic avec cause racine ;
- remédiations techniques contrôlées ;
- circuit breaker d'auto-remédiation ;
- contrôleur CGPT local ;
- supervision SSE OpenCode ;
- plugin et skill Codex ;
- commande `/cab`.

## Commande `/cab`

`/cab` est une commande de l'agent Codex versionnée avec CAB. Elle orchestre
la communication entre le broker MCP et l'agent Codex ; elle ne prend jamais
de décision d'approbation.

```text
/cab start
/cab test
/cab stop
```

`/cab start` initialise ou reprend le contrôleur et la supervision CAB, puis
vérifie le dispositif.

`/cab test` réalise un test non destructif du chemin complet OpenCode → MCP → CAB → CGPT → CAB → OpenCode.

`/cab stop` arrête uniquement les ressources CAB qu'elle a créées, sans fermer
OpenCode ni arrêter le broker MCP géré par OpenCode.

## Organisation du dépôt

```text
CAB/
├── src/                       # bridge Python
├── .codex/commands/cab.md     # commande /cab
├── cab-codex-plugins/         # marketplace et plugin Codex
│   ├── .agents/plugins/marketplace.json
│   └── plugins/cab-approval-bridge/
│       ├── .codex-plugin/plugin.json
│       ├── skills/approval-bridge/SKILL.md
│       └── scripts/
├── PROJECT.md                 # architecture générale
├── TECHNICAL.md               # fonctionnement technique
├── BUILD.md                   # construction et distribution
└── CHANGELOG.md
```

## Prérequis

Le fonctionnement actuel repose sur :

- Python 3 ;
- OpenCode avec MCP local `stdio` ;
- Node.js ;
- Codex App Server ;
- accès local à OpenCode ;
- environnement Unix pour les mécanismes de persistance/verrouillage ;
- `systemctl --user` pour le mécanisme actuel de redémarrage automatique du contrôleur.

Le broker Python n'utilise actuellement aucune dépendance Python tierce.

## Configuration principale

### Broker

| Variable | Rôle |
|---|---|
| `CGPT_CONTROLLER_URL` | URL locale du contrôleur |
| `CGPT_APPROVAL_STORE` | magasin persistant des approbations |
| `CGPT_APPROVAL_JOURNAL` | journal append-only |
| `CGPT_BROKER_INSTANCE_LOCK` | verrou d'instance |
| `CGPT_JOURNAL_HMAC_KEY` | clé optionnelle du checkpoint HMAC |
| `CGPT_JOURNAL_HMAC_KEY_ID` | identifiant de la clé HMAC |
| `CGPT_JOURNAL_HMAC_PREVIOUS_KEYS` | anciennes clés autorisées en vérification |
| `CGPT_JOURNAL_CHECKPOINT_PATH` | chemin du checkpoint |

### Watchdogs

| Variable | Rôle |
|---|---|
| `CGPT_PENDING_WATCHDOG_INTERVAL` | fréquence du watchdog PENDING |
| `CGPT_PENDING_WATCHDOG_WARNING` | seuil de dégradation PENDING |
| `CGPT_PENDING_WATCHDOG_STALLED` | seuil de blocage PENDING |
| `CGPT_SESSION_WATCHDOG_INTERVAL` | fréquence du watchdog session |
| `CGPT_SESSION_WATCHDOG_WARNING` | seuil de dégradation session |
| `CGPT_SESSION_WATCHDOG_STALLED` | seuil de blocage session |

### Auto-remédiation

| Variable | Rôle |
|---|---|
| `CGPT_AUTO_REMEDIATION_ENABLE` | activation globale, désactivée par défaut |
| `CGPT_AUTO_REMEDIATION_ACTIONS` | allowlist des actions |
| `CGPT_AUTO_REMEDIATION_INTERVAL` | fréquence de l'ordonnanceur |
| `CGPT_AUTO_REMEDIATION_CB_FAILURE_THRESHOLD` | seuil d'ouverture du circuit breaker |
| `CGPT_AUTO_REMEDIATION_CB_FAILURE_WINDOW` | fenêtre des échecs |
| `CGPT_AUTO_REMEDIATION_CB_OPEN_SECONDS` | durée OPEN |
| `CGPT_AUTO_REMEDIATION_CB_STATE_PATH` | état persistant du circuit breaker |
| `CGPT_REMEDIATION_ORPHAN_TIMEOUT` | délai des tentatives orphelines |

### Contrôleur et supervision

| Variable | Rôle |
|---|---|
| `OC_CGPT_WORKSPACE` | workspace CAB autorisé : `/workspace` ou `/home/devops/datas/cab` |
| `OC_CGPT_OUTSIDE_SANDBOX` | impose l'exécution hors sandbox |
| `OC_CGPT_OPENCODE_URL` | URL locale OpenCode |
| `OC_CGPT_STATUS_HOST` | adresse loopback du contrôleur : `127.0.0.1` ou `::1` |
| `OC_CGPT_STATUS_PORT` | port local du contrôleur |
| `OC_CGPT_RECONNECT_MS` | délai de reconnexion SSE |
| `OC_CGPT_CONTROLLER_URL` | endpoint de statut utilisé par le healthcheck |
| `OC_CGPT_READINESS_MAX_AGE_MS` | fraîcheur maximale de la readiness |
| `CODEX_COMMAND` | commande utilisée pour Codex App Server |

Les secrets doivent rester hors du dépôt Git et des journaux.

## Persistance

Par défaut, CAB utilise :

```text
/workspace/.opencode/state/cgpt-approval-bridge/
```

pour ses états runtime. Ce répertoire n'est pas une source du projet et ne doit pas être publié avec une release.

## Readiness

CAB expose quatre états :

- **READY** — fonctionnement nominal ;
- **DEGRADED** — fonctionnement possible mais dégradé ;
- **BLOCKED** — progression bloquée ;
- **HUMAN_REQUIRED** — intervention humaine nécessaire.

## Distribution

Le dépôt contient directement les sources du bridge et du plugin Codex.

Aucun paquet Debian ni image Docker CAB n'est actuellement défini. Ces modes pourront être ajoutés ultérieurement après spécification.

Aucun catalogue marketplace n'est actuellement distribué. Le canal de publication du plugin devra être choisi et validé contre le mécanisme Codex retenu avant une release publique.

La version de base actuelle du broker et du plugin est `0.61.0`. Le plugin ajoute un cachebuster Codex pour les installations locales.

## Documentation

- **PROJECT.md** — but, architecture et périmètre ;
- **TECHNICAL.md** — protocoles, persistance, supervision et configuration ;
- **BUILD.md** — installation, packaging et distribution ;
- **CHANGELOG.md** — historique des versions.
- **openspec/specs/** — contrats normatifs des capacités CAB.
