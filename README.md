# Codex Approval Bridge — CAB

**CAB - Codex-Approval-Bridge** relie OpenCode et Codex pour fournir un cycle de validation explicite, persistant, observable et résilient.

Le bridge transporte les demandes de validation d'OpenCode vers Codex, conserve leur état, récupère la décision correspondante et restitue une réponse MCP corrélée à OpenCode.

Il ne décide jamais à la place de Codex et ne modifie pas le projet piloté.

```text
                    Développeur
                        │
            interaction / validation
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
         OpenCode               Codex
      Agent de codage        Orchestrateur
             ▲                     │
             └──── Bridge MCP ─────┘
                                   │
                                   ▼
                                  GPT
                     Analyse / Revue / Validation
```

## Architecture

```text
OpenCode
   │ MCP stdio
   ▼
CAB Broker
   │ HTTP local
   ▼
Contrôleur Codex ──► Codex App Server

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
- contrôleur Codex local ;
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

`/cab test` réalise un test non destructif du chemin complet OpenCode → MCP → CAB → Codex → CAB → OpenCode.

`/cab stop` arrête uniquement les ressources CAB qu'elle a créées, sans fermer
OpenCode ni arrêter le broker MCP géré par OpenCode.

## Organisation du dépôt

```text
CAB/
├── src/                       # bridge Python initié par OpenCode
├── .codex/commands/cab.md     # commande /cab pour Codex
├── .agents/plugins/marketplace.json # marketplace Codex
├── plugins/cab-approval-bridge/     # plugin Codex
│   ├── .codex-plugin/plugin.json
│   ├── skills/approval-bridge/SKILL.md
│   └── scripts/
├── PROJECT.md                 # architecture générale
├── TECHNICAL.md               # fonctionnement technique
├── BUILD.md                   # construction et distribution
└── CHANGELOG.md               # Suivi de versions
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
| `Codex_CONTROLLER_URL` | URL locale du contrôleur |
| `Codex_APPROVAL_STORE` | magasin persistant des approbations |
| `Codex_APPROVAL_JOURNAL` | journal append-only |
| `Codex_BROKER_INSTANCE_LOCK` | verrou d'instance |
| `Codex_JOURNAL_HMAC_KEY` | clé optionnelle du checkpoint HMAC |
| `Codex_JOURNAL_HMAC_KEY_ID` | identifiant de la clé HMAC |
| `Codex_JOURNAL_HMAC_PREVIOUS_KEYS` | anciennes clés autorisées en vérification |
| `Codex_JOURNAL_CHECKPOINT_PATH` | chemin du checkpoint |

### Watchdogs

| Variable | Rôle |
|---|---|
| `Codex_PENDING_WATCHDOG_INTERVAL` | fréquence du watchdog PENDING |
| `Codex_PENDING_WATCHDOG_WARNING` | seuil de dégradation PENDING |
| `Codex_PENDING_WATCHDOG_STALLED` | seuil de blocage PENDING |
| `Codex_SESSION_WATCHDOG_INTERVAL` | fréquence du watchdog session |
| `Codex_SESSION_WATCHDOG_WARNING` | seuil de dégradation session |
| `Codex_SESSION_WATCHDOG_STALLED` | seuil de blocage session |

### Auto-remédiation

| Variable | Rôle |
|---|---|
| `Codex_AUTO_REMEDIATION_ENABLE` | activation globale, désactivée par défaut |
| `Codex_AUTO_REMEDIATION_ACTIONS` | allowlist des actions |
| `Codex_AUTO_REMEDIATION_INTERVAL` | fréquence de l'ordonnanceur |
| `Codex_AUTO_REMEDIATION_CB_FAILURE_THRESHOLD` | seuil d'ouverture du circuit breaker |
| `Codex_AUTO_REMEDIATION_CB_FAILURE_WINDOW` | fenêtre des échecs |
| `Codex_AUTO_REMEDIATION_CB_OPEN_SECONDS` | durée OPEN |
| `Codex_AUTO_REMEDIATION_CB_STATE_PATH` | état persistant du circuit breaker |
| `Codex_REMEDIATION_ORPHAN_TIMEOUT` | délai des tentatives orphelines |

### Contrôleur et supervision

| Variable | Rôle |
|---|---|
| `OC_Codex_WORKSPACE` | workspace CAB autorisé : `/workspace` ou `/home/devops/datas/cab` |
| `OC_Codex_OUTSIDE_SANDBOX` | impose l'exécution hors sandbox |
| `OC_Codex_OPENCODE_URL` | URL locale OpenCode |
| `OC_Codex_STATUS_HOST` | adresse loopback du contrôleur : `127.0.0.1` ou `::1` |
| `OC_Codex_STATUS_PORT` | port local du contrôleur |
| `OC_Codex_RECONNECT_MS` | délai de reconnexion SSE |
| `OC_Codex_CONTROLLER_URL` | endpoint de statut utilisé par le healthcheck |
| `OC_Codex_READINESS_MAX_AGE_MS` | fraîcheur maximale de la readiness |
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

Le dépôt contient directement les sources du bridge et du plugin Codex. La
marketplace est définie dans `.agents/plugins/marketplace.json` et référence
le plugin situé dans `plugins/cab-approval-bridge/`.

Pour une marketplace GitHub privée, publiez le dépôt avec ce catalogue à sa
racine, puis importez et synchronisez-le depuis l'administration de votre
espace de travail Codex. Le compte GitHub connecté doit pouvoir lire le dépôt.

La version de base actuelle du broker et du plugin est `0.61.0`. Le plugin ajoute un cachebuster Codex pour les installations locales.

## Documentation

- **PROJECT.md** — but, architecture et périmètre ;
- **TECHNICAL.md** — protocoles, persistance, supervision et configuration ;
- **BUILD.md** — installation, packaging et distribution ;
- **CHANGELOG.md** — historique des versions.
- **openspec/specs/** — contrats normatifs des capacités CAB.
