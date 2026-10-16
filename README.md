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

## Cadences de pilotage

Le protocole CAB prévoit les événements SSE en temps réel et le contrôle des
demandes et rapports toutes les **3 secondes**. Pendant l'analyse ou la
rédaction de l'agent de codage, les vérifications de progression sont espacées
de **7 secondes** fixes, indépendamment du contrôle CAB.

Après échec du benchmark PLLM, l'orchestrateur conserve le même RUN en attente
et retente toutes les **30 minutes**, sans limite de tentatives, jusqu'à
reprise sûre ou arrêt explicite du développeur. La reprise conserve les
contrôles CAB et les mandats unitaires. Les sondes statistiques sont prévues
toutes les **30 minutes**, sans arrêter le travail pour attendre le créneau.
Ces obligations du protocole distribué ne constituent pas un nouvel automate
de benchmark dans les composants CAB.

## Statistiques après archivage

CAB prépare désormais des statistiques dans son contrôleur, sans RUN
d'observation supplémentaire : `GET /statistics` et
`GET /runs/<runId>/statistics?format=markdown` donnent les agrégats et un
brouillon à six sections. `contextId` sélectionne un ancien change du RUN.
Les corps de messages, commandes, URL et sorties ne sont pas collectés ;
les métriques absentes restent `N/A`. L'orchestrateur vérifie le brouillon,
le complète depuis les preuves autorisées et mandate sa publication.

Le profil optimisé ajoute une file FIFO `/integration-request`, une réduction
quiescente `/resources` et une phase `/closing` après publication, limitée au
rapport de sa propre archive. Le rapport est préparé en continu puis finalisé
hors exclusion globale, avec décisions explicites et permission native `once`.
La livraison exige toujours le rapport vérifié et le gate. Les anciennes
interfaces restent disponibles. Voir [le protocole](ORCHESTRATED_CODING.md).
La préparation précède la file et les pairs rejoignent leur prochain jalon
stable prouvé. `GET /runs/<runId>/integration-status` explique les obstacles
techniques sans contenu. L'option `completion` de `/integration` réunit
publication, libération et passage en `REPORT` avec reçu durable idempotent.
Les lectures natives de cohorte sont regroupées et toute divergence est refusée.
Le registre schéma 3 de cette option nécessite les nouvelles sources ; aucun
rapport, relevé final ou gate ne prolonge la fenêtre critique de publication.
Ces fonctions sont préparées dans les sources ; l'installation active nécessite
une mise à jour coordonnée distincte.

Le plugin CAB embarque `coding-session-statistics`. Son protocole impose un
rapport `STATISTIQUES.md` dans chaque dossier d'archive OpenSpec après un
archivage autorisé et réussi, avant la clôture normale du travail. La collecte
est préparée dès le début du change ; les données absentes sont signalées
`N/A` sans estimation. Le suivi des quotas utilise l'outil natif Codex, sans
installation de `cgpt` ou de Tools Codex. Une erreur de publication doit être
résolue ou déclarée comme blocage, sans réarchiver le change.

## Architecture

```text
OpenCode unique : sessions A, B, … — un RUN par session
   │ MCP stdio commun
   ▼
Broker CAB unique — corrélation et readiness par RUN
   │ HTTP local
   ▼
Contrôleur unique ──► contextes A, B, … ──► Codex / Codex App Server
   │
   └── Registre : réservations exclusives et intégration coordonnée

OpenCode ── SSE HTTP commun ──► superviseur unique ──► suivi par RUN
```

Le broker MCP est **local en stdio** : aucun serveur MCP réseau n'est exposé.

## Architecture technique détaillée

Cette vue détaille le profil concurrent CAB 1.0.0 : un processus OpenCode,
un broker MCP stdio, un contrôleur et un superviseur communs, avec des
contextes isolés par RUN. A et B illustrent deux sessions ; le même modèle
s'applique aux autres RUN admis. Les contextes et la barrière sont des
éléments internes, pas des services supplémentaires.

```mermaid
flowchart TB
    D["Développeur"]
    C["Codex — orchestrateur / validateur<br/>Pilotage et décisions corrélés par RUN"]

    subgraph OC["Un processus OpenCode — répertoire commun"]
        subgraph RUN1["Session A — RUN A — change réservé A"]
            O1["Agent de codage A"]
            P1["Permission native A<br/>une opération : once"]
            X1["Exécution A<br/>rapport et preuves"]
            O1 -->|"Demande de permission"| P1
            P1 -->|"Autorisation unique"| X1
            X1 -->|"Résultat"| O1
        end
        subgraph RUN2["Session B — RUN B — change réservé B"]
            O2["Agent de codage B"]
            P2["Permission native B<br/>une opération : once"]
            X2["Exécution B<br/>rapport et preuves"]
            O2 -->|"Demande de permission"| P2
            P2 -->|"Autorisation unique"| X2
            X2 -->|"Résultat"| O2
        end
        M["Connexion MCP stdio commune<br/>demandes identifiées par RUN et session"]
        F["Flux SSE commun<br/>événements natifs par session"]
        O1 <--> M
        O2 <--> M
        O1 -.-> F
        O2 -.-> F
    end

    subgraph CAB["Infrastructure CAB 1.0.0 partagée"]
        B["Un broker MCP local<br/>corrélation et readiness par RUN / session"]
        E[("Approbations persistantes<br/>journal et intégrité")]
        subgraph CTRL["Un contrôleur Codex — API HTTP locale"]
            T["Routage et contrôle d'identité<br/>session, répertoire, RUN, change, génération"]
            R[("Registre durable des réservations<br/>changes, intentions, ressources, dépendances<br/>écriture atomique et verrou flock")]
            I["Barrière d'intégration exclusive<br/>jalons stables et quiescence de tous les RUN<br/>publication puis réconciliation de référence"]
            T1["Contexte RUN A<br/>décisions, mandats, gate, récupération"]
            T2["Contexte RUN B<br/>décisions, mandats, gate, récupération"]
            T <-->|"Réserver, étendre, vérifier, libérer"| R
            R <-->|"Propriétaire et version de référence"| I
            T <-->|"Routes /runs/A/..."| T1
            T <-->|"Routes /runs/B/..."| T2
        end
        subgraph SUP["Un superviseur durable"]
            S["Répartition des événements SSE"]
            S1["Suivi et reprise RUN A"]
            S2["Suivi et reprise RUN B"]
            S --> S1
            S --> S2
        end
        J1[("États persistants RUN A<br/>job, jalons, gate et supervision")]
        J2[("États persistants RUN B<br/>job, jalons, gate et supervision")]
        B <-->|"Persistance"| E
        B <-->|"HTTP : demande et décision corrélées"| T
        T1 <-->|"Persistance"| J1
        T2 <-->|"Persistance"| J2
        S1 <-->|"Persistance"| J1
        S2 <-->|"Persistance"| J2
        S1 <-->|"HTTP : statut, progression, gate"| T
        S2 <-->|"HTTP : statut, progression, gate"| T
    end

    A["Codex App Server — mode automatique<br/>validation isolée et corrélée par RUN"]
    W[("Répertoire de projet partagé<br/>opérations limitées aux ressources réservées")]

    D -->|"Objectifs, périmètres et validations"| C
    C <-->|"HTTP : registre et pilotage par RUN"| T
    C -->|"Mode manuel par défaut : décision explicite"| T
    M <-->|"MCP stdio local"| B
    F -.->|"SSE HTTP direct"| T
    F -.->|"SSE HTTP direct"| S
    S1 -.->|"Reprise de la session A si admissible"| O1
    S2 -.->|"Reprise de la session B si admissible"| O2
    T1 -->|"approved corrélé : once pour A"| P1
    T2 -->|"approved corrélé : once pour B"| P2
    T1 -.->|"Demande de validation automatique"| A
    T2 -.->|"Demande de validation automatique"| A
    A -.->|"Décision structurée corrélée"| T
    X1 -->|"Ressources couvertes par A"| W
    X2 -->|"Ressources couvertes par B"| W
```

- **Un mandat = une opération** : un fichier ou une commande, avec
  corrélation de `requestId`, `approval_id`, `change_id`, `run_id`,
  `reservation_version`, de la session et du répertoire.
- Le broker transporte et persiste ; **Codex décide**. Le contrôleur transmet
  l'approbation à la permission native correspondante avec une réponse
  `once`, consommable une seule fois.
- Les événements SSE et les relances techniques ne donnent aucune
  autorisation. Une décision absente ne vaut jamais approbation.
- Le gate terminal contrôle la clôture du job ; il reste distinct des
  décisions unitaires et ne remplace pas une permission OpenCode.
- Le mode manuel, utilisé par défaut, attend une décision HTTP explicite de
  l'orchestrateur sur `POST /decision/<requestId>`. Le mode automatique
  sollicite une session Codex de validation via Codex App Server.
- Le broker notifie le contrôleur sur `POST /validation/request` et récupère
  la décision sur `GET /decision/<requestId>`. La readiness est publiée
  séparément ; `READY` ne vaut jamais approbation.
- Avant de travailler, chaque RUN réserve atomiquement son change, son
  intention de sélection et ses ressources, après examen des dépendances.
  Les lectures peuvent coexister ; un recouvrement impliquant une écriture
  est refusé. Codex examine aussi les dépendances sémantiques.
- Le contrôleur vérifie la couverture de chaque mandat et sa génération
  avant de transmettre `once` à la permission native de la bonne session.
  Les décisions, gates, reprises et checkpoints restent propres au RUN.
- L'intégration attend des jalons stables et la quiescence de tous les RUN
  réservés. Un seul RUN contrôle et publie l'état combiné ; les autres
  suspendent leurs opérations puis réconcilient la nouvelle référence.
  Une libération exige les contrôles et preuves applicables.
- Ajouter un RUN ne purge ni ne reconnecte le broker. Les opérations
  globales de cycle de vie exigent une réconciliation coordonnée.

Les cylindres représentent les états persistants des composants, sans
imposer un fichier ou un emplacement partagé. Les flèches en pointillés
identifient les voies SSE, les reprises techniques et le chemin de décision
du mode automatique. La publication désigne l'intégration dans la référence
commune du projet ; elle n'autorise pas un commit ou un déploiement.

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
/cab status
/cab status --run <run_id>
/cab stop
```

`/cab status` produit ponctuellement le tableau **RUN / Nom du change — Actions
réalisées — Actions en cours — Actions restant à réaliser**. Chaque ligne
affiche **ACTIF**, **EN ATTENTE DE RUN** avec le pair et sa cause, ou l’état
interne/terminal/indéterminé prouvé. La collecte recoupe CAB, les états natifs
accessibles et les checkpoints/tâches ; une ancienne attente déjà levée est
écartée. Aucune activité, dépendance ou réussite de test n’est inventée. Le
filtre `--run` vise un identifiant exact. Cette consultation ne démarre aucun
service, n’envoie aucun message et ne modifie aucun projet.

Chaque nouvelle session `/cab start` purge entièrement l'ancien état technique
CAB, y compris ses conflits Syncthing, sans le restaurer. Elle vérifie d'abord
l'inactivité du contexte, arrête les ressources CAB et déconnecte le broker
par OpenCode ; sources, secrets, rapports et historiques natifs restent hors
purge. Le plugin fournit l'outil de purge et son protocole. Une reprise
conserve son état, y compris après prévol de récupération divergent dans la
candidate, selon la procédure ci-dessous.

`/cab start` reconnecte et vérifie le MCP actif par `/mcp`, installe de façon différée les
services utilisateur du contrôleur et du superviseur sans les activer au
login, les démarre explicitement, initialise la supervision CAB, puis crée
une nouvelle session maîtresse persistante visible dans OpenCode.

`/cab test` réalise, dans cette même session, un test non destructif du chemin
complet OpenCode → MCP → CAB → Codex → CAB → OpenCode.

`/cab run` arme un contrat durable et maintient le job dans cette session. Tant
que son gate terminal reste ouvert, le superviseur réexamine la même session
après 60 secondes par défaut ; il ne crée ni session de remplacement ni
décision CAB. Chaque édition, commande Bash,
commande système, commande OpenSpec ou opération d’archivage est soumise par
OpenCode comme mandat unitaire, puis exécutée seulement après une décision
Codex corrélée. Une décision consommée ne déverrouille aucune autre action.

Le statut du superviseur publie le dernier jalon et le gate observés ainsi
qu'un compteur persistant des tentatives de reprise, distinct de leur succès.
Un ancien compteur absent reste inconnu ; un nouveau job commence à zéro.
Le contrôleur refuse au démarrage un contrat persistant invalide, même si sa
syntaxe JSON est correcte, sans réécrire le fichier ni perdre silencieusement
le job. Les diagnostics distinguent lecture, syntaxe et contrat invalide.

En cas de récupération sans effet non maîtrisé, l'orchestrateur peut remplacer
la session par `POST /job/recover` (`prepare`, puis `complete`) après contrôles
techniques et prévol CAB réservé. Le RUN reste ouvert ; le job, le périmètre et
le dernier jalon sont conservés. Le superviseur suspend les relances pendant
le gel et suit ensuite la nouvelle session. Les anciennes autorisations
exécutables ne sont jamais réutilisées. Un échec ou une preuve locale perdue
après redémarrage conserve le gel sans fabriquer de réussite. Voir
`TECHNICAL.md` et le protocole de la skill pour le contrat détaillé.

Les mandats lecture seule désactivent explicitement les outils natifs et
d'écriture dans le message OpenCode. Les opérations suivantes gardent leurs
permissions natives et décisions CAB unitaires.

Depuis 1.0.1, les jobs armés vérifient les règles natives avant admission,
approbation et transmission de `once`. Une règle finale globale `ask` est
requise pour le type `bash` ou `edit` concerné ; une preuve absente ou
permissive est refusée. Pour réactiver les outils, utiliser `noReply`, rétablir
`ask` par PATCH et le vérifier, puis générer sans nouveau champ `tools`.
Ce garde ne modifie pas les permissions et exige leur stabilité pendant
l'exécution. Le détail et les diagnostics sont dans `TECHNICAL.md`.

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

Après un prévol de récupération divergent ou incomplet refusé sans effet,
conserver la session candidate où le prévol a divergé, le même job et leurs
preuves, sans purge ni renouvellement. L'orchestrateur réconcilie puis demande
retry explicite à /job/recover avec requête et approbation neuves. Le contrôleur
vérifie le refus et l'absence d'effet, préserve l'historique et impose un nouveau
prévol exact avant complete. Un timeout MCP seul conserve le polling de la même
approbation. Effet inconnu ou preuve absente suspend la reprise. Le superviseur
reste gelé jusqu'à complete ; OpenCode reste ouvert. Le remplacement initial
prévu par CISMP et la purge avant un nouveau RUN restent inchangés.

Depuis CAB 1.0.2, retry accepte aussi le REJECTED obtenu par poll_approval ou
get_approval après timeout de request_validation, pour la même approbation,
avec décision locale rejected non consommée et identités/opération exactes.
Un timeout seul ou PENDING seul reste insuffisant ; chaque demande enregistrée
doit avoir un refus terminal. Un arrêt ciblé explicitement demandé par le
développeur reste distinct de retry : gate BLOQUÉ et réconciliation avant
désarmement et libération, sans purge ni interruption des autres RUN.

## Organisation du dépôt
terme
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
| `OC_Codex_CONTROLLER_URL` | base HTTP du contrôleur ou endpoint `/status`, avec slash final éventuel, communs au healthcheck et au superviseur |
| `OC_Codex_READINESS_MAX_AGE_MS` | fraîcheur maximale de la readinessterme |
| `OC_Codex_SUPERVISOR_URL` | endpoint de statut du superviseur utilisé par le healthcheck |
| `OC_Codex_SUPERVISOR_STATUS_HOST` | adresse loopback du superviseur |
| `OC_Codex_SUPERVISOR_STATUS_PORT` | port local du superviseur, `8789` par défaut |
| `OC_Codex_SUPERVISOR_RESUME_DELAY_MS` | délai de reprise, 60 secondes par défaut |
| `OC_Codex_SUPERVISOR_POLL_INTERVAL_MS` | fréquence de réconciliation du superviseur |
| `OC_Codex_SUPERVISOR_STATE_PATH` | état runtime non versionné du superviseur |
| `CODEX_COMMAND` | commande utilisée pour Codex App Server |

Les noms historiques équivalents préfixés `OC_CGPT_` restent acceptés pour la
compatibilité avec les installations existantes.

Le mode `OC_Codex_DECISION_MODE=manual`, utilisé par défaut, conserve les
demandes en attente d'une décision HTTP explicite de l'orchestrateur
principal. Les rappels corrélés restent observables sans créer de thread ni
de tour Codex auxiliaire. Le mode `automatic` conserve son fonctionnement.

Une demande locale indécise bloque le gate terminal même si le dernier
compteur broker était nul. Pour la supervision, seule l'activité SSE de la
session du job, sans répertoire divergent, repousse la reprise ; le trafic
étranger et les heartbeats ne constituent pas une activité de cette session.
Un changement de contexte invalide l'ancienne horloge d'activité.

Les secrets doivent rester hors du dépôt Git et des journaux.

## Persistance

Par défaut, le broker utilise le home du processus OpenCode qui le lance :

```text
$HOME/.opencode/state/cgpt-approval-bridge/
```

Le contrôleur et le superviseur utilisent par défaut l'espace situé dans le
workspace du projet piloté :

```text
<workspace>/.opencode/state/cgpt-approval-bridge/
```

Les variables de configuration peuvent personnaliser les chemins du broker
et celui de l'état du superviseur. Les espaces runtime doivent être résolus
depuis la configuration effective ; `/workspace` est seulement un exemple de
racine de projet. Ces espaces ne sont pas des sources du projet et ne doivent
pas être publiés avec une release.

Le contrôleur démarre sans job uniquement si son fichier de contrat est
absent. Un JSON malformé ou une autre erreur de lecture interrompt son
démarrage avec un diagnostic sans contenu persistant. Le fichier est conservé
pour une intervention autorisée ; aucun état n'est réparé automatiquement.

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
plugin est `1.2.1`. Le plugin ajoute un cachebuster Codex pour les
installations locales.

## Documentation

- **ORCHESTRATED_CODING.md** — document facultatif, réservé aux projets
  nécessitant des sessions pilotées ; AGENTS.md impose alors sa lecture aux
  deux agents concernés pour le protocole et ses contrats techniques.
- **PROJECT.md** — but, architecture et périmètre ;
- **TECHNICAL.md** — protocoles, persistance, supervision et configuration ;
- **BUILD.md** — installation, packaging et distribution ;
- **CHANGELOG.md** — historique des versions.
- **openspec/specs/** — contrats normatifs des capacités CAB.

## Plusieurs sessions CISMP — CAB 1.0.0

Un seul OpenCode et un seul broker stdio peuvent servir plusieurs RUN dans
un même contexte de répertoire. Chaque change est réservé atomiquement par
son RUN ; les ressources et dépendances sont contrôlées avant mandat. Les
jobs, décisions, permissions et récupérations restent séparés. La présence
de plusieurs changes OpenSpec n'est plus une ambiguïté lorsque leur attribution
est explicite. L'intégration commune reste exclusive et la livraison exige
les validations, l'archive et son rapport.

Consulter GET /runs puis utiliser les routes /runs/<runId>/... ; les anciens
endpoints restent réservés au contexte historique unique. Lire
ORCHESTRATED_CODING.md et la référence du skill approval-bridge avant activation.
Le démarrage d'un second RUN ne purge pas le broker. CISM, CAISM et les prompts
directs restent exclus. Les worktrees nécessitent une qualification distincte.
