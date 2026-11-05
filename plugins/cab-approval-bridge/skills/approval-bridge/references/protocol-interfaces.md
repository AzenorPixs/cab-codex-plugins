# Interfaces et persistance — CAB 2.2.37

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
| OpenCode | `http://127.0.0.1:4096/api/info` | Santé technique |
| OpenCode | `GET /api/mcp` | Connexion MCP native, dont `cgpt-validation` |
| OpenCode | `GET /api/event` | SSE direct en temps réel |
| OpenCode | `POST /api/session` | Nouvelle session native du RUN autorisé |
| OpenCode | `POST /api/session/<id>/prompt?directory=<racine encodée>` | Mandats dans la session persistante |
| OpenCode | `GET /api/session/active?directory=...` | Sessions occupées ou inactives |
| OpenCode | `GET /api/permission/request?directory=...` | Permissions natives à réconcilier |
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
`GET /api/mcp` ne constitue ni une readiness métier ni une décision.

Une page demandant un appairage relève de la surface navigateur. Avant de
solliciter l’hôte, vérifier le client authentifié ci-dessous ; une API accessible
permet le pilotage autorisé du même SID. Voir [la reprise autonome](owner-reconciliation.md).

## HTTP401 et client authentifié du pilote

Une requête GET sans Authorization vers OpenCode peut retourner401 alors que
le serveur, son MCP et le SID existant sont accessibles. Ce seul résultat
ne prouve ni panne du serveur ni session inutilisable. Un nouveau SID ne
répare pas un chemin d’authentification absent.

Résoudre le module `scripts/cgpt-approval-bridge-opencode-client.mjs` du plugin
actuellement installé ;ne pas conserver un chemin de cache d’ancienne version.
L’orchestrateur utilise le client distribué depuis son outil d’exécution local :

```javascript
const { createOpenCodeV2ClientFromEnv } = await import(clientModuleUrl);
const client = createOpenCodeV2ClientFromEnv({ directory: workspace, baseUrl });
const server = await client.info(true);
const session = await client.session(existingSessionId, workspace);
```

Ces deux contrôles sont des GET, sans prompt, nouveau SID ou effet métier.
Le client fournit l’authentification en consommant localement le credential
privé du profil d’exécution. Sa valeur n’est ni demandée au développeur,
ouverte par l’agent, affichée, copiée dans un prompt ou transmise au modèle.
Utiliser ce mécanisme ne signifie pas transmettre le secret au LLM.
Ne pas remplacer le client par un curl avec secret en argument ni ajouter
une nouvelle configuration lorsque le credential existant fonctionne.

Si le client authentifié échoue aussi, conserver son code filtré et vérifier
la configuration/identité du service selon technical-startup.md. Ne pas
supposer que tout401 vient d’un header absent. Si l’outil d’exécution local
est réellement absent, nommer cette capacité manquante ;l’absence d’un outil
MCP nommé CAB dans Codex ne suffit pas à établir ce manque. Ne pas désactiver
l’authentification, changer le credential ou migrer le SID sur ce seul constat.

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
4. Appliquer les préconditions techniques et prévols du présent profil et du
   contrat CAB en vigueur, après les barrières métier du prompt. Vérifier leurs preuves observables
   avant le démarrage métier. Une divergence suspend ce démarrage ; ne pas
   inventer de réussite ni substituer une autre configuration.
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
superviseur utilisent un espace privé hors projet, exposé par
`runtimeStateDirectory` dans `/status` :
`<home exécution>/.local/state/cab-approval-bridge/<SHA256 workspace>/cgpt-approval-bridge/`.
Les fichiers du projet restent en0775 ; les checkpoints privés sont0600.
Les chemins personnalisés doivent être réellement résolus ; ces exemples
ne désignent pas un espace à purger automatiquement.

Le contrat du contrôleur est conservé dans `controller-job.json`. Seul
ENOENT permet un démarrage sans job. Un JSON malformé ou une autre erreur
de lecture arrête le démarrage avant HTTP et les interactions externes,
avec un diagnostic sans contenu persistant ni chemin runtime.
Le fichier reste intact. Ni l'orchestrateur, ni le superviseur ne fabriquent
un contrat vide ou une clôture pour contourner cet échec.


## Instrumentation technique et compte rendu des incidents

Les cadences, sondes natives et formats techniques appartiennent à ce profil.
Pour les situations définies par « Statistiques des sessions pilotées », appliquer
le skill `coding-session-statistics` disponible et son contrat réel. Réaliser le relevé
initial `/cgpt 7u` avant les mandats et les sondes, puis le relevé final avant
le rapport. Les sondes de performance sont initiale, toutes les trente minutes
pendant l'activité et finale, dans des sessions jetables sans outil, fichier
ni réseau, avec la configuration réelle de l'agent mesuré et le même prompt
déterministe. Une mesure manquée ou absente reste absente, sans estimation
ni reconstruction rétroactive. Ces opérations ne donnent aucun droit de
lecture supplémentaire ni autorisation de rapport hors du périmètre du prompt.

Avant tout outil natif, l'agent vérifie la corrélation du mandat, de sa cible,
de l'identité de session et de sa permission. Le verrou technique de lecture
seule interdit les mutations et les outils désactivés ; une commande native,
même diagnostique, conserve son mandat exact. Ne pas transformer une demande
ou utiliser un autre exécutable que celui approuvé. Un écart détecté avant
effet est rapporté sans tentative d'exécution, avec session, mandat, opération
non exécutée, raison et absence d'effet. L'agent attend l'orchestrateur.

Une commande dont l'exécutable est introuvable peut être qualifiée
`ENV_RECOVERABLE` seulement si l'absence d'écriture, de test commencé, d'effet
externe et de permission non corrélée est prouvée. Rapporter l'identité de
session, le `requestId`, la commande, l'erreur sans secret, les effets et
le chemin candidat déclaré dans `DEVOPS.md`. Geler et clôturer le mandat
échoué, réconcilier les effets et préparer une nouvelle demande exacte avec
un identifiant inédit. Une autre erreur conserve sa qualification réelle ;
aucune substitution ou réexécution automatique n'est autorisée.

## Compatibilité des checkpoints des prompts

Conserver les chemins de checkpoint autorisés par les prompts et le RUN
parent. Le champ métier générique `mandat_courant` remplace la désignation
historique `mandat_cab_courant`. À la reprise d'un ancien checkpoint, lire
l'ancien champ sans perte, réconcilier ses demandes et conserver leurs
identifiants et preuves avant toute mise à jour du seul état autorisé.
Ne pas supprimer ni réinitialiser un état, migrer le runtime ou remplacer
une permission consommée pour adapter ce nom de champ. Une préparation
documentaire n'exécute aucune migration d'une session active.

ASK nominal sans permission réelle, grant sauvegardé ou terminal de lecture
sans once avec parent seulement référencé : suivre [le contrat ciblé](native-permission-grants.md).
