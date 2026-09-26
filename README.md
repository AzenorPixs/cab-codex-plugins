# Codex Approval Bridge — CAB - 100% IA

**CAB - Codex-Approval-Bridge** relie OpenCode et Codex pour fournir un cycle de validation explicite, persistant, observable et résilient.

Le bridge transporte les demandes de validation d'OpenCode vers Codex, conserve leur état, récupère la décision correspondante et restitue une réponse MCP corrélée à OpenCode.

Il ne décide jamais à la place de Codex et ne modifie pas le projet piloté.

Codex est l’orchestrateur et le validateur de la session : il pilote les
mandats du démarrage à la clôture et rend une décision explicite pour chaque
opération nécessitant une permission OpenCode. CAB transmet cette décision,
mais ne l’invente jamais. L’archivage OpenSpec est un mandat séparé, décidé
après contrôle de la cohérence et des validations.

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
- watchdogs de validation et de session, avec relance corrélée du contrôleur
  toutes les trente secondes pour une décision PENDING ;
- readiness `READY / DEGRADED / BLOCKED / HUMAN_REQUIRED` ;
- diagnostic avec cause racine ;
- remédiations techniques contrôlées ;
- circuit breaker d'auto-remédiation ;
- contrôleur Codex local ;
- supervision SSE OpenCode ;
- superviseur durable de job et relance de la même session tant que le gate
  terminal reste ouvert ;
- plugin et skill Codex ;
- commande `/cab`.

## Commande `/cab`

`/cab` est une commande de l'agent Codex versionnée avec CAB. Elle orchestre
la communication entre le broker MCP et l'agent Codex ; elle ne prend jamais
de décision d'approbation.

```text
/cab start
/cab test
/cab run
/cab update
/cab stop
```

`/cab start` vérifie le MCP actif par `/mcp`, installe de façon différée les
services utilisateur du contrôleur et du superviseur sans les activer au
login, les démarre explicitement, initialise la supervision CAB, puis crée ou
réutilise une session de codage persistante visible dans OpenCode.

`/cab test` réalise, dans cette même session, un test non destructif du chemin
complet OpenCode → MCP → CAB → Codex → CAB → OpenCode.

`/cab run` arme un contrat durable et maintient le job dans cette session. Tant
que son gate terminal reste ouvert, le superviseur réexamine la même session
après 60 secondes par défaut ; il ne crée ni session de remplacement ni
décision CAB. Chaque édition, commande Bash,
commande système, commande OpenSpec ou opération d’archivage est soumise par
OpenCode comme mandat unitaire, puis exécutée seulement après une décision
Codex corrélée. Une décision consommée ne déverrouille aucune autre action.

`/cab stop` exige un gate terminal validé, arrête explicitement le superviseur
puis le contrôleur et les ressources CAB qu'elle a créées, sans fermer OpenCode
ni arrêter le broker MCP géré par OpenCode. Les unités utilisateur restent
installées mais inactives jusqu'au prochain
`/cab start`.

`/cab update` compare la version SemVer de base de `cab-approval-bridge` à
celle publiée par le marketplace Git `cab_codex_plugins`. Elle peut migrer de
façon réversible une source locale CAB vers `AzenorPixs/cab-codex-plugins`,
puis compare la commande CAB du profil Codex à celle de la branche `main`.
Elle installe ou actualise atomiquement le script et l'unité du superviseur
depuis le plugin installé, sans activer ni démarrer le service. Le remplacement
de la commande de profil est également atomique ; la configuration et les
ressources CAB en cours restent inchangées.
À la fin, elle récapitule les versions GitHub et locales du plugin, du
contrôleur, du superviseur déployé, du broker actif et de la commande CAB.

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
| `OC_Codex_WORKSPACE` | racine absolue du projet à piloter, sans liste de projets codée dans CAB |
| `OC_Codex_OUTSIDE_SANDBOX` | impose l'exécution hors sandbox |
| `OC_Codex_OPENCODE_URL` | URL locale OpenCode |
| `OC_Codex_STATUS_HOST` | adresse loopback du contrôleur : `127.0.0.1` ou `::1` |
| `OC_Codex_STATUS_PORT` | port local du contrôleur |
| `OC_Codex_RECONNECT_MS` | délai de reconnexion SSE |
| `OC_Codex_CONTROLLER_URL` | endpoint de statut utilisé par le healthcheck |
| `OC_Codex_READINESS_MAX_AGE_MS` | fraîcheur maximale de la readiness |
| `OC_Codex_SUPERVISOR_URL` | endpoint de statut du superviseur utilisé par le healthcheck |
| `OC_Codex_SUPERVISOR_STATUS_HOST` | adresse loopback du superviseur |
| `OC_Codex_SUPERVISOR_STATUS_PORT` | port local du superviseur, `8789` par défaut |
| `OC_Codex_SUPERVISOR_RESUME_DELAY_MS` | délai de reprise, 60 secondes par défaut |
| `OC_Codex_SUPERVISOR_POLL_INTERVAL_MS` | fréquence de réconciliation du superviseur |
| `OC_Codex_SUPERVISOR_STATE_PATH` | état runtime non versionné du superviseur |
| `CODEX_COMMAND` | commande utilisée pour Codex App Server |

Les noms historiques équivalents préfixés `OC_CGPT_` restent acceptés pour la
compatibilité avec les installations existantes.

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

La version de base actuelle du broker, du contrôleur, du superviseur et du
plugin est `0.85.1`. Le plugin ajoute un cachebuster Codex pour les
installations locales.

## Documentation

- **PROJECT.md** — but, architecture et périmètre ;
- **TECHNICAL.md** — protocoles, persistance, supervision et configuration ;
- **BUILD.md** — installation, packaging et distribution ;
- **CHANGELOG.md** — historique des versions.
- **openspec/specs/** — contrats normatifs des capacités CAB.
