# ORCHESTRATED_CODING.md — Sessions de codage pilotées

Version : 0.1

Projet : `cab`

## Champ d'application et autorité

Ce fichier est facultatif à l'échelle du projet. Il est uniquement présent
pour un projet qui nécessite des sessions pilotées par un agent orchestrateur
vers un agent de codage. Son absence est normale dans un projet sans besoin
de pilotage et n'empêche pas une session de codage directe.

Ce document est la référence locale des sessions de codage conduites par un
agent orchestrateur vers un agent de codage. Les deux agents doivent le lire
avant l'initialisation du pilotage, en complément d'AGENTS.md. Il ne modifie
ni les autorisations du développeur, ni la priorité des spécifications
OpenSpec validées, ni les permissions de la plateforme.

L'orchestrateur définit le périmètre et les critères, arbitre les demandes et
vérifie les preuves. L'agent de codage analyse et exécute seulement les
opérations autorisées. Le développeur conserve le contrôle des décisions qui
lui sont réservées. Aucun de ces rôles ne peut inventer une autorisation.

Le profil technique actuellement décrit est OpenCode comme agent de codage,
Codex/CGPT comme orchestrateur et CAB comme transport neutre. Les rôles ne
dépendent pas d'un modèle LLM particulier. Un autre agent ou transport exige
un contrat d'intégration explicitement validé ; les exemples CAB ne prouvent
pas sa compatibilité et ne déclenchent aucune adaptation implicite.

Une session directe SCM reste régie par son prompt et AGENTS.md. La présence
de ce fichier ne lance ni agent OpenCode, ni service CAB, ni compétence,
sonde ou télémétrie de session pilotée. Le rapport d'archivage éventuellement
requis par le projet reste une obligation distincte.

## Protocole de communication OpenCode ↔ CGPT via CAB

Ce protocole s'applique à tout agent de codage OpenCode piloté par CGPT pendant
une session de codage. Il complète les règles OpenSpec et ne les remplace pas.

### Rôles

CGPT fixe le périmètre, valide les choix fonctionnels et techniques, décide
des mandats CAB et reçoit les comptes rendus. Le broker CAB ne décide jamais :
il transporte et corrèle les demandes. Une décision est limitée à un
`requestId` unique et à une seule opération.

L'agent de codage NE DOIT PAS étendre le périmètre, inventer une réponse CGPT
ou CAB, exécuter une opération refusée, ni déclarer exécuté un outil, une
commande ou un test sans preuve observée dans la session. Il NE DOIT PAS lire,
afficher ou transmettre de secret.

### Initialisation de session

Avant tout accès au projet, l'agent DOIT :

1. confirmer le répertoire, le change OpenSpec et le périmètre reçus ;
2. appeler réellement l'outil MCP `broker_readiness` exposé dans la session ;
3. exiger le statut `READY` et l'absence d'approbation parasite ;
4. rapporter à CGPT l'identifiant de session, le répertoire, le change et
   l'état CAB.

Une réponse textuelle sans appel d'outil observé ne constitue jamais une
preuve. Si l'outil MCP n'est pas exposé, échoue, répond `BLOCKED` ou
`HUMAN_REQUIRED`, l'agent DOIT envoyer `CAB_BLOCKED` à CGPT et s'arrêter.

### États de session

L'agent suit exclusivement la séquence suivante :

```text
INIT → ANALYSE → WAIT_CGPT → WAIT_CAB → EXECUTION → REPORT
                                      ↑                 │
                                      └─────────────────┘
```

* `ANALYSE` : lecture et compréhension dans le seul périmètre validé ;
* `WAIT_CGPT` : une décision fonctionnelle, technique ou de périmètre est
  attendue ;
* `WAIT_CAB` : une autorisation technique unitaire est attendue ;
* `EXECUTION` : une seule opération autorisée est réalisée ;
* `REPORT` : preuve et résultat sont transmis ;
* `DONE` : la session ne peut être clôturée que par CGPT ou après exécution de
  tous les mandats validés.

Un changement d'état ne peut jamais être déduit d'un texte produit par
l'agent lui-même.

### Messages à destination de CGPT

Lorsqu'une décision est nécessaire, l'agent envoie l'un des messages suivants,
puis passe à `WAIT_CGPT` sans poursuivre.

```text
NDOC
change_id: <change>
objet: <question précise>
contexte: <faits observés>
impact du blocage: <ce qui ne peut pas continuer>
attente: réponse CGPT
```

```text
NFDOC
change_id: <change>
objectif: <objectif validé>
fichiers:
  - <chemin> : <modification minimale>
critères: <critères observables>
validations: <vérifications prévues>
limites: <éléments exclus>
attente: validation explicite CGPT
```

```text
NQCMOC
change_id: <change>
question: <choix à arbitrer>
A: <option et impact>
B: <option et impact>
recommandation: <option et justification>
attente: choix CGPT
```

Seule une réponse reçue dans la même session OpenCode est exploitable. Sans
réponse explicite de CGPT, l'agent reste à `WAIT_CGPT`.

### Mandats CAB

Avant toute écriture, commande Bash ou système nécessitant une permission,
commande OpenSpec mutante, test à effet de bord, opération Docker, correction
ou archivage, l'agent soumet un mandat CAB unitaire. Il contient un
`requestId` inédit, un `approval_id`, un `change_id`, l'identifiant de session,
le répertoire et un résumé lisible.

Le mandat désigne exactement l'une des cibles suivantes :

```text
Édition :   files: ["chemin/relatif"] ; commands: []
Commande :  files: [] ; commands: ["commande complète exacte"]
```

Les mandats à plusieurs fichiers, plusieurs commandes, glob, préfixe ou
commande implicite sont interdits. Un `requestId` ne peut jamais être réutilisé.

Après soumission :

* `APPROVED` : exécuter une seule fois l'opération strictement identique ;
* `REJECTED` : ne rien exécuter, rapporter le refus et passer à `WAIT_CGPT` ;
* `needs_clarification` : ne rien exécuter et envoyer un `NDOC` ;
* réponse absente, non corrélée, `BLOCKED` ou `HUMAN_REQUIRED` : envoyer
  `CAB_BLOCKED` et s'arrêter.

Une décision CAB ne couvre jamais une autre commande, même identique.

### Exécution, preuves et clôture

Les lectures natives ne nécessitant pas de permission peuvent être effectuées
pendant `ANALYSE`, dans le périmètre autorisé. L'agent distingue toujours les
faits observés, les déductions, les éléments non vérifiés, les refus et les
erreurs.

Après chaque mandat, l'agent envoie un `RAPPORT_OC` contenant le `requestId`,
l'opération, le résultat, les preuves réellement observées, les fichiers
modifiés, les validations exécutées, les écarts et la prochaine étape. Toute
correction, validation à effet de bord, modification OpenSpec ou archivage est
un nouveau mandat CAB.

L'agent ne coche une tâche OpenSpec qu'après preuve de son achèvement. Un
archivage OpenSpec reste un mandat distinct et exige une validation explicite
de CGPT après contrôle des critères, des tests et de la cohérence entre code,
spécifications et documentation.

### Statistiques d'archivage

Après chaque archivage OpenSpec autorisé et réussi, produire un rapport par
archive dans `openspec/changes/archive/<archive>/STATISTIQUES.md`, avec un
mandat d'édition distinct pour ce seul fichier lorsque le protocole CAB
s'applique. Vérifier les six sections, UTF-8/LF et les totaux ; afficher `N/A`
motivé pour les mesures absentes. Ne pas déclarer `TERMINÉ` sans preuve du
rapport. Si le rapport échoue, reprendre uniquement ce rapport, sans réarchiver.

## Architecture et interfaces techniques CAB

```text
Développeur
    │ objectif, périmètre et décisions réservées
    ▼
Agent orchestrateur ── HTTP natif ──► session persistante de l'agent OpenCode
    ▲                                         │
    │ HTTP local                              │ MCP stdio local
    │                                         ▼
Contrôleur CAB ◄────────────────────────── Broker CAB
    ▲
    └── SSE HTTP direct OpenCode
Superviseur CAB ──► état du job et relance technique de la même session
```

Le broker ne possède aucun serveur MCP réseau. Le contrôleur et le
superviseur écoutent uniquement en loopback. Les adresses ci-dessous sont
les valeurs par défaut du profil CAB ; les valeurs effectives sont résolues
dans le contexte autorisé, sans lire de secret.

| Composant | Interface | Usage |
|---|---|---|
| OpenCode | `http://127.0.0.1:4096/global/health` | Santé technique |
| OpenCode | `GET /mcp` | Connexion MCP native, dont `cgpt-validation` |
| OpenCode | `GET /global/event` | SSE direct en temps réel |
| OpenCode | `POST /session` | Nouvelle session native du RUN autorisé |
| OpenCode | `POST /session/<id>/message?directory=<racine encodée>` | Mandats dans la session persistante |
| OpenCode | `GET /session/status?directory=...` | Sessions occupées ou inactives |
| OpenCode | `GET /permission?directory=...` | Permissions natives à réconcilier |
| Contrôleur CAB | `http://127.0.0.1:8788/status` | État technique, compteurs et gate |
| Contrôleur CAB | `GET /runs/<run_id>/job` | Contrat durable courant |
| Contrôleur CAB | `POST /runs/<run_id>/job/arm`, `POST /runs/<run_id>/job/progress` | Armement et jalons prouvés |
| Contrôleur CAB | `POST /validation/request` | Notification par le broker |
| Contrôleur CAB | `GET /decision/<requestId>`, `POST /decision/<requestId>` | Décision explicite corrélée |
| Contrôleur CAB | `POST /broker/readiness` | Readiness publiée par le broker |
| Contrôleur CAB | `POST /runs/<run_id>/job/recover` | Récupération explicite en deux phases |
| Contrôleur CAB | `POST /runs/<run_id>/job/terminal-gate`, `POST /runs/<run_id>/job/disarm` | Clôture contrôlée |
| Superviseur CAB | `http://127.0.0.1:8789/status` | État de supervision et dernière relance |

Le SSE et les états HTTP ne remplacent pas un appel MCP réel de
`broker_readiness` dans la session de codage ciblée. L'état `connected` de
`GET /mcp` ne constitue ni une readiness métier ni une décision.

## Initialisation technique et identité du RUN

1. Fixer le projet, le répertoire absolu, le change, les critères, les limites
   et les conditions terminales. Identifier les deux sessions réellement
   pilotées ; signaler un identifiant non exposé sans l'inventer.
2. Vérifier la santé OpenCode et le MCP natif. La connexion CAB est gérée par
   OpenCode ; l'orchestrateur ne tue ni ne démarre directement le broker.
3. Avant une initialisation globale exclusive, appliquer le protocole autorisé
   de nouvelle session : propriété et inactivité prouvées, arrêt des seules
   ressources CAB, déconnexion native, purge bornée, puis reconnexion.
   Une reprise ordinaire du même RUN conserve ses preuves et son runtime.
4. Vérifier via les seules métadonnées API le fournisseur, le modèle et le
   raisonnement sélectionnés par le développeur. Le prévol temporaire est
   sans outil ni accès au projet. La réponse observée doit confirmer ces
   valeurs ; une divergence donne CAB_INACTIF sans session métier.
5. Créer la session persistante visible dans OpenCode pour le nouveau RUN,
   ou réutiliser celle du même RUN. Les mandats passent exclusivement par
   sa messagerie native ; aucun appel CLI éphémère ne remplace cette session.
6. Exiger le prévol MCP réel READY et l'absence de permission parasite.
   Le test CAB porte sur une seule commande autorisée, une réponse MCP
   corrélée, une permission consommée une fois, exit 0 et readiness finale.
7. Armer le contrat durable avant les mandats métier, puis maintenir le SSE
   et les contrôles décrits ci-dessous. Une session inactive ou un tour
   terminé ne clôture jamais, à lui seul, ce contrat.

Le contrôleur exige `OC_Codex_WORKSPACE` absolu et
`OC_Codex_OUTSIDE_SANDBOX=1` ; les alias `OC_CGPT_` restent compatibles.
Les installations et démarrages éventuels sont soumis au périmètre autorisé.
Les unités utilisateur utilisent `Restart=on-failure` sans activation au
login. Ces dispositions ne donnent aucune autorisation d'installation
système ni d'intervention sur un service existant.

## Contrat durable, mandat et preuve

Exemple de contrat transmis à `POST /runs/<run_id>/job/arm` :

```json
{
  "jobId": "<identifiant inédit du job>",
  "sessionId": "<session OpenCode persistante>",
  "directory": "<racine absolue du projet>",
  "changeId": "<change autorisé>",
  "criteria": ["<critère observable>", "<preuve du rapport après archivage>"],
  "strictCommands": true
}
```

`strictCommands` est booléen et vaut false par défaut dans CAB. Lorsqu'une
identité octet pour octet est exigée, notamment pour CISMP, le contrat doit
porter true. Le mode historique false conserve seulement l'instrumentation
de sortie déterministe reconnue ; il ne permet aucune transformation métier.

Exemple d'arguments du seul appel MCP `request_validation` pour une commande :

```json
{
  "requestId": "<identifiant inédit de requête>",
  "approval_id": "<identifiant inédit d'approbation>",
  "change_id": "<change autorisé>",
  "session_id": "<session ciblée>",
  "directory": "<racine absolue du projet>",
  "title": "<opération unitaire>",
  "summary": "<objectif, cible et critères>",
  "files": [],
  "commands": ["<commande complète exacte>"]
}
```

Pour une édition, remplacer la cible par un seul chemin relatif dans
`files` et laisser `commands` vide. Les deux listes ne sont jamais remplies
ensemble. La décision HTTP utilise `approved`, `rejected` ou
`needs_clarification` et reprend requestId, approval_id et change_id.
La réponse MCP terminale, la permission native et l'effet observé doivent
être corrélés à la même opération, session et racine.

Après un délai d'attente MCP, rechercher uniquement l'approbation déjà
soumise par son approval_id avec `poll_approval` ou `get_approval`.
Un délai ne vaut ni refus terminal ni approbation ; il n'autorise pas la
création d'une requête de remplacement ni le rejeu d'une opération prouvée.
Une décision déjà consommée ne couvre jamais une nouvelle permission.

Les jalons et le mandat courant sont transmis par `POST /runs/<run_id>/job/progress`.
L'orchestrateur conserve les preuves natives hors des seules affirmations
textuelles de l'agent : appels d'outils, réponses corrélées, sorties et codes
de retour, contenu ou empreintes des fichiers autorisés et effets réellement
observés. La corrélation et la propriété du contexte sont recontrôlées après
chaque interruption ou reconnexion.

## Verrou technique des mandats en lecture seule

Pour un inventaire ou une analyse en lecture seule, le message natif
OpenCode désactive explicitement les outils suivants :

```json
{
  "tools": {
    "bash": false,
    "edit": false,
    "write": false,
    "apply_patch": false,
    "task": false,
    "skill": false
  }
}
```

Les outils natifs de lecture et recherche autorisés restent utilisables.
Le champ tools ne modifie pas la configuration persistante. Un mandat
exécutable ultérieur réactive seulement ses outils nécessaires, avec
permissions natives `ask` et décision CAB unitaire. Une instruction
textuelle seule ne constitue pas ce verrou technique.

## Persistance et erreurs de démarrage

Le broker utilise par défaut le home du processus OpenCode qui le lance :
`$HOME/.opencode/state/cgpt-approval-bridge/`. Le contrôleur et le
superviseur utilisent par défaut l'espace du workspace :
`<racine projet>/.opencode/state/cgpt-approval-bridge/`.
Les chemins personnalisés doivent être réellement résolus ; ces exemples
ne désignent pas un espace à purger automatiquement.

Le contrat du contrôleur est conservé dans `controller-job.json`. Seul
ENOENT permet un démarrage sans job. Un JSON malformé ou une autre erreur
de lecture arrête le démarrage avant HTTP et les interactions externes,
avec un diagnostic sans contenu persistant ni chemin runtime.
Le fichier reste intact. Ni l'orchestrateur, ni le superviseur ne fabriquent
un contrat vide ou une clôture pour contourner cet échec.


## Cadences de pilotage et attente PLLM

Traite les événements SSE OpenCode en temps réel et contrôle les demandes et
les rapports toutes les 3 secondes dans la boucle de pilotage. Pendant
l'analyse ou la rédaction de l'agent de codage, utilise des pauses fixes de
7 secondes entre deux vérifications de progression. Ces pauses ne ralentissent
ni le SSE ni le contrôle CAB toutes les 3 secondes. Les temporisations
techniques du superviseur, des heartbeats et des rappels du broker restent
distinctes.

Après un échec du benchmark PLLM, conserve le même RUN en attente non terminale
et retente le benchmark toutes les 30 minutes (1 800 secondes), indéfiniment,
sans limite de tentatives, jusqu'à reprise sûre du RUN ou arrêt explicite du
développeur. Calcule la prochaine échéance depuis l'échec observé de la dernière
tentative. Conserve dans le checkpoint non secret le RUN, les horodatages,
causes, résultats et la prochaine échéance. Après interruption, conserve cette
échéance et réconcilie toute tentative en cours ou d'effet inconnu avant de
retenter. Ne lance jamais de tentatives simultanées ni ne duplique un essai
non réconcilié. Maintiens la supervision sans attente bloquante de trente
minutes ; ce seul échec ne clôture pas le RUN et ne ferme ni ne redémarre les
processus.

Après une réussite observée, réconcilie les contextes, la santé OpenCode, MCP,
la readiness CAB réelle et les permissions avant reprise. Si la reprise n'est
pas sûre, applique la récupération CAB et conserve sa cause observable.
La réussite du benchmark ne vaut jamais approbation, ne rejoue aucun mandat
consommé et ne contourne aucun blocage CAB distinct.

Prévois les sondes statistiques toutes les 30 minutes, en complément des
sondes initiale et finale. Poursuis le travail entre les échéances, sans
arrêter le travail pour attendre un créneau. Signale les relèves manquées
sans reconstruction rétroactive. Une sonde statistique échouée reste distincte
d'un échec du benchmark PLLM et ne suspend pas, à elle seule, le RUN.

## Récupération contrôlée de session dans le même RUN

Après un écart refusé sans effet, interrompre l'ancienne session, traiter son
rapport et clôturer le mandat courant avec `/runs/<run_id>/job/progress`. Ne pas réarmer le
job pour remplacer sa session : `/runs/<run_id>/job/arm` reste immuable. Créer la candidate
par l'API native OpenCode dans le même `directory`, avec permissions natives
`ask`, sans lui confier de travail métier.

Utiliser `POST /runs/<run_id>/job/recover` en deux phases. Le corps commun contient `jobId`,
`expectedSessionId` (ancienne session), `sessionId` (candidate), `recoveryId`
inédit et `preflightRequestId` inédit ; ajouter `phase: "prepare"`, puis
`phase: "complete"`. Le contrôleur vérifie par HTTP le contexte, MCP, les
sessions inactives et l'absence de permissions/demandes non résolues. Un mandat
indécis doit recevoir une décision explicite ; une transmission encore en
cours impose une réconciliation avant un nouvel essai.

Après prepare, le job et le superviseur sont gelés. Seul le prévol réservé de
la candidate est admis : `broker_readiness`, `request_validation` pour la
commande exacte `/usr/bin/true`, décision explicite corrélée, permission
native unique, exécution exit 0, puis `broker_readiness = READY` sans demande
en attente. Aucun suffixe ni autre outil natif. Le contrôleur vérifie les
preuves dans les messages OpenCode avant complete ; une déclaration de
réussite ne suffit pas. Aucun appel de récupération ne vaut décision CAB.

Après complete, relire `/job` et `/status` : même job, même change et critères,
dernier jalon conservé, nouvelle session, `strictCommands` préservé et gate
OPEN. Les anciennes autorisations exécutables sont invalidées et l'historique
non secret est conservé. Le superviseur suit désormais la session transférée.
Un échec conserve le gel ; la récupération ordinaire ne purge pas le RUN et
n'invente aucun gate terminal. La seule exception de purge est définie dans
« Nouvelle session CAB après prévol de récupération divergent » ci-dessous.
Un redémarrage conserve ce gel mais ne recrée pas la décision ou la preuve
locale du prévol : si elles sont perdues, la récupération reste refusée et
nécessite une décision humaine. L'API ne remplace ni une session révoquée ni
un prévol échoué par une nouvelle tentative implicite.

## Prévol de récupération divergent dans la même session

Après un prévol divergent ou incomplet prouvé et refusé avant exécution sans
effet, conserver la session candidate où le prévol a divergé, le même job,
le RUN et le runtime. Ne créer aucune autre session ni aucun job de remplacement,
ne purger aucun état et ne pas revenir à l'ancienne session révoquée.
Le remplacement initial prévu par CISMP reste inchangé ; cette règle concerne
les échecs du prévol dans sa candidate. OpenCode reste ouvert.

Comparer les appels natifs au mandat réellement prescrit, notamment
`requestId`, `approval_id`, `change_id`, `session_id`, `directory`, `files`,
`commands`, `title`, `summary`, `timeout_seconds` et `interval_seconds`.
Un champ omis, `true` au lieu de `/usr/bin/true`, un suffixe ou un change erroné
reste refusé sans normalisation. Un paramètre non prescrit ne devient pas une
divergence inventée. Un HTTP 409 seul ou un texte de l'agent ne prouve pas le
refus sans effet. Après un délai MCP seul, interroger uniquement le même
`approval_id` par `poll_approval` ou `get_approval`, sans nouvelle demande.

Geler le travail, traiter les rapports, refuser les permissions divergentes,
clôturer les demandes restantes sans les approuver et réconcilier les effets.
Exiger santé, contexte, MCP connecté, sessions inactives, aucun mandat actif
ou en attente, aucune permission non résolue et aucun effet inconnu.
Une décision `approved`, consommée ou une preuve incertaine interdit retry.

Demander explicitement `POST /job/recover` avec `phase: "retry"`, les mêmes
`jobId`, `expectedSessionId`, `sessionId` candidate et `recoveryId`,
`previousPreflightRequestId` égal à la réservation actuelle et un
`preflightRequestId` inédit. Ne pas réarmer, désarmer ou abandonner le job.
Le contrôleur exige un refus natif `REJECTED` corrélé à la décision locale
`rejected` non consommée, ou une erreur native MCP `-32602` avant enregistrement.
Une erreur générique, un timeout, une commande ou un autre outil natif laisse
le gel conservé et exige la réconciliation ou l'autorité indispensable.

Le contrôleur conserve les identifiants antérieurs et l'empreinte du préfixe
des parties natives, sans contenu de message. Il vérifie ce préfixe à chaque
retry et complete ; une preuve modifiée ou perdue interdit la transition.
Le nouvel essai utilise des `requestId` et `approval_id` neufs ; les anciennes
décisions restent intactes et ne sont jamais réutilisées. Une perte de preuves
locales après redémarrage ne permet pas leur reconstruction implicite.

Dans la même candidate, exiger exactement `/usr/bin/true`, sans suffixe, avec
le `change_id` attendu, une décision explicite, une réponse MCP corrélée, une
permission native unique, exit 0 puis `broker_readiness = READY` sans demande
ni permission parasite. Appeler complete avec la nouvelle réservation et
relire `/job` et `/status` avant tout mandat métier. Le superviseur reste gelé
jusqu'à complete ; il suit ensuite cette candidate devenue session du job.

Un nouvel écart sûr reprend cette procédure dans la même candidate, sans
concurrence ni doublon d'une tentative non réconciliée, jusqu'au prévol exact
ou arrêt explicite. Conserver le RUN en attente non terminale, le checkpoint
métier non secret, numéro, identifiants, horodatages, cause, arguments attendus
et observés et références des preuves natives. Maintenir le suivi à la cadence
existante sans boucle serrée. Reprendre au premier jalon non prouvé, sans
rejouer les écritures validées ni les autorisations consommées.

## Compactage coordonné et continuité

Prévoir un cycle commun de compactage toutes les 1 h 30 (5 400 secondes),
à une frontière entre mandats après traitement du rapport et sauvegarde du
checkpoint. Utiliser uniquement les API natives des sessions réellement
actives : OpenCode `POST /session/<id>/summarize` et, lorsqu'elle est exposée
par la connexion propriétaire, Codex App Server `thread/compact/start`.

Un accusé de lancement ne prouve pas la fin. Pour Codex, observer l'item
natif `contextCompaction` achevé et corrélé au bon thread ; une session
auxiliaire ne remplace pas l'orchestrateur principal. Consigner identifiant
du cycle, sessions, horodatages, retards et résultats sans secret.

Une API absente ou un échec avec contexte préservé laisse le cycle incomplet,
sans fabriquer une réussite conjointe ni bloquer à lui seul le RUN.
Après réconciliation sûre des contextes, OpenCode, MCP, CAB et permissions,
poursuivre les mandats autorisés. Un compactage encore en cours, un effet
inconnu ou une réconciliation impossible suspend les opérations concernées.
Ce cycle ne ferme ni ne redémarre les agents et ne rejoue aucune opération.

## Clôture et bilan documentaire

L'orchestrateur vérifie les critères, les tâches, les tests, la cohérence
documentaire et les rapports d'archive avant de demander une clôture normale.
La présence de STATISTIQUES.md, ses six sections, UTF-8/LF et les totaux
doivent être prouvés pour chaque archive ; les mesures absentes sont N/A
motivées. Un rapport échoué est repris sans réarchiver.

Le gate local est demandé par `POST /runs/<run_id>/job/terminal-gate` avec un état explicite
TERMINÉ ou BLOQUÉ. Un refus laisse le job ouvert avec sa cause. Un gate validé
permet le désarmement du seul job correspondant. Seulement après libération et quiescence de tous les RUN, il permet l'arrêt autorisé du
superviseur avant le contrôleur. Le broker reste géré par OpenCode.

Le compte rendu distingue résultat livré, préparation, attente, refus,
erreur et blocage. Il indique les opérations réellement exécutées, les
limites de preuve, les fichiers touchés et le premier jalon restant.
Une fin de tour, un délai, une réponse textuelle ou une relance technique
ne remplace jamais un état terminal prouvé.

## Pilotage concurrent CAB 1.0.0

### CAB 1.0.0 — pilotage concurrent dans un contexte OpenCode commun

Un processus OpenCode et un broker MCP stdio servent plusieurs sessions.
Le contrôleur et le superviseur isolent leurs jobs par RUN. Le profil initial
utilise un même répertoire ; les worktrees exigent une qualification distincte.

#### Identité et sélection

Le RUN parent conserve runId et ownerId pendant son cycle. Chaque change
emploie une nouvelle session OpenCode et un jobId inédit. Consulter GET /runs
et OpenSpec avant sélection. Un change présent n'est pas nécessairement pris
en charge ; une réservation RESERVED appartient exclusivement à son RUN.

Avant création ou préparation, soumettre POST /runs/reserve avec :

```json
{
  "runId": "cismp-example",
  "ownerId": "codex-example",
  "sessionId": "ses_example",
  "directory": "/racine/autorisee",
  "changeId": "change-example",
  "selectionKey": "capacite-exigence-version",
  "resources": [{"key": "file:src/component.py", "mode": "write"}],
  "dependsOn": []
}
```

La clé de sélection représente l'intention avant création du change. Examiner
les dépendances sémantiques, capacités OpenSpec, contrats, lectures, écritures,
migrations, ports, builds et services partagés. Utiliser des clés file:,
capability:, contract: ou resource:, avec mode read ou write. Les chemins sont
relatifs et un répertoire couvre ses descendants. project:* en écriture réserve
les effets inconnus à l'échelle du projet. Aucune indépendance n'est déduite
des seuls fichiers. dependsOn identifie les changes livrés dans le registre ;
Codex vérifie séparément les prérequis historiques établis hors registre.

La réservation atomique retourne version et contextId. Un conflit ne donne
aucune permission : sélectionner un autre candidat compatible ou attendre.
Un RUN ne possède qu'un change réservé à la fois. Après libération contrôlée,
le même RUN peut réserver son change suivant avec une nouvelle session et une
version fraîche ; l'historique et les requestId restent conservés.

#### Mandats et routage

Les routes sont /runs/<runId>/status, /runs/<runId>/job/arm, progress, recover,
terminal-gate, disarm et /runs/<runId>/decision/<requestId>. L'armement reprend
exactement session, change et racine de la réservation ; strictCommands=true.
Les décisions restent explicites, unitaires, corrélées et consommables une fois.

Chaque request_validation inclut les champs habituels et run_id,
reservation_version ; une commande déclare aussi resources. Un fichier exige
une ressource file: en écriture. Une commande shell n'est pas analysée pour
deviner ses effets. Codex examine son manifeste avant décision. Une réservation
ne vaut jamais approbation. Garder les permissions natives ask et ne transmettre
aucun outil mutable sans le mandat exact.

broker_readiness accepte run_id. Les compteurs ciblés ne couvrent que ce RUN ;
les défaillances du magasin, du journal ou du transport commun restent communes.
Les requêtes et permissions d'une autre session ne sont ni consommées ni closes.
Après redémarrage, une ancienne demande sans décision restaurable reste à
réconcilier ; ne pas la rejouer, changer son identité ou inventer son résultat.

#### Cycle, extension et intégration

Le checkpoint est output/cismp/<run_id>/state.json pour CISMP et
output/<prompt>/<run_id>/state.json pour les autres orchestrateurs. Un sous-job
hérite de celui de son parent. Le registre CAB attribue les changes ; le
checkpoint conserve les preuves et ne modifie jamais les réservations.

Si le fichier scopé manque lors d'une reprise, lire l'ancien
output/<prompt>-state.json en lecture seule, réconcilier RUN, propriété et
preuves natives, puis migrer seulement ce RUN sans écraser l'état d'un autre.
Un ancien job armé reste en mode historique sous les interfaces sans RUN
jusqu'à clôture réconciliée ; l'ajout de RUN concurrents est alors refusé.
Les anciennes permissions consommées ne sont jamais transposées.

Avant élargissement, fermer le mandat courant puis POST /runs/<runId>/extend
avec version et resources supplémentaires. Réutiliser la version retournée.
Une extension conflictuelle suspend le nouveau périmètre sans toucher aux autres.

Dans le répertoire partagé, chaque RUN déclare un jalon stable après ses
validations locales par POST /runs/<runId>/ready avec version et evidence.
L'intégration attend que tous les RUN réservés soient stables, sans mandat,
récupération ou effet en attente. Les validations globales portent sur l'état
combiné de ces changes stables ; chaque RUN conserve ses preuves locales.

Pour publier dans la référence commune, obtenir POST /runs/<runId>/integration
avec version et acquire=true. Revalider la base courante et les résultats
combinés, synchroniser et archiver sous autorisations explicites, puis vérifier
STATISTIQUES.md. Les opérations Git restent soumises à une autorisation distincte.
Pendant l'exclusion, les nouvelles opérations des autres RUN sont suspendues.
Le propriétaire peut déclarer project:* en lecture pour ses tests globaux.
Libérer avec acquire=false, published (booléen) et, si true, evidence après
publication prouvée ou abandon réconcilié. La version referenceVersion évolue
à chaque libération ; les autres RUN attendent la réconciliation par POST
/runs/<runId>/reconcile avec version, referenceVersion et evidence. Recontrôler
les empreintes et validations affectées sans rejouer les effets déjà prouvés,
puis utiliser la nouvelle version de réservation retournée. Une réservation
avec écritures ne peut être livrée sans publication sous cette barrière.
Ni CAB ni le superviseur ne valident les preuves à la place de Codex.

Après gate individuel, désarmement et réconciliation, POST /runs/<runId>/release
porte version, delivered (booléen) et evidence (références non secrètes des
preuves). delivered=true exige un gate TERMINÉ, la livraison et le rapport
prouvés. Une attente ou un effet inconnu ne libère jamais le change.

Sans candidat disponible, distinguer attente de dépendance, conflit de ressources
et absence de travail restant prouvée. Seul ce dernier constat, sans autre RUN
actif ni exigence restante, permet une fin globale. Les sous-jobs rendent le
contrôle au cycle parent et n'arrêtent pas l'infrastructure commune.

#### Récupération, purge et arrêt

Un démarrage rejoint l'infrastructure saine sans purge ni reconnexion globale.
Une récupération conserve le RUN, le change, les preuves et la candidate après
prévol divergent refusé sans effet ; utiliser prepare/retry/complete du même job.
Après transfert, relire GET /runs pour la nouvelle version avant tout mandat.
Une autre session réservée ne peut servir de candidate. Le prévol /usr/bin/true
doit être couvert par un manifeste sans effet, par exemple une lecture de la
capacité concernée ; il reste soumis à la décision CAB et à once.

/cab stop cible le RUN et ne ferme pas OpenCode. Arrêter les services communs,
déconnecter le broker, utiliser /instance/dispose ou purger exige la quiescence
et la réconciliation de tous les RUN affectés. Le script de purge refuse un
registre RESERVED ou invalide même si ses processus sont arrêtés. Le healthcheck
ne redémarre aucun service ; une action de cycle de vie reste coordonnée.

La sélection ne dépasse pas les spécifications et autorisations déjà validées.
Les sondes et compactages restent attribués à chaque RUN ; les quotas partagés
ne sont jamais présentés comme sa consommation exclusive sans preuve.
CISM, CAISM et les prompts directs ne participent pas à ce pilotage et ne sont
pas lancés en concurrence avec les sessions pilotées.
<!-- CAB-CONCURRENT-END -->
