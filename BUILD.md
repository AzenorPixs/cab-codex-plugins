# BUILD.md — Codex Approval Bridge (CAB)

## 1. Objet

Ce document définit le cadrage de construction, d'installation, de packaging et de distribution de CAB. Il complète `PROJECT.md` et `TECHNICAL.md` sans reprendre leur contenu.

### Distribution courante 2.1.5

Le paquet, les trois modules broker, tous les modules Node/Python, unités systemd et commandes partagent la version 2.1.5. `/CABU` délègue à `/CAB update`, qui valide le paquet, arrête systématiquement les trois unités systemd CAB, remplace les fichiers des quatre briques puis redémarre les unités. L'absence d'OpenCode n'empêche pas le remplacement des fichiers broker ; leur version runtime est rapportée `INDISPONIBLE` si elle ne peut être vérifiée.

OpenCode V2 est la seule version prise en charge. Les appels HTTP utilisent
`/api/...` avec Basic Auth sous l'utilisateur fixe `opencode`. Configurer le
serveur V2 avec `OPENCODE_PASSWORD`. Avant le démarrage des unités CAB, provisionner
le même mot de passe configuré sur OpenCode dans
`~/.config/cab-approval-bridge/opencode.password`, fichier régulier détenu
par l'utilisateur et accessible uniquement à celui-ci (`0600`). Les unités
le reçoivent par `LoadCredential`; le secret n'est pas une variable d'unité.
Le client vise `127.0.0.1:4096` ; `0.0.0.0` est uniquement une adresse de
bind du serveur.

## 2. État actuel de la distribution

CAB est actuellement un dépôt source autonome comprenant le broker Python, les
plugins Codex `CAB` et `CABU`, leurs skills, les commandes
versionnées `/CAB`, `/CABU` et `/cab`, ainsi que les scripts Node.js de contrôle
et de supervision.

Aucun Dockerfile ni format de paquet système n'est actuellement défini dans les sources CAB. Une image Docker ou un paquet Debian ne constitue donc pas encore un mode de distribution du projet.

## 3. Arborescence de distribution

```text
CAB/
├── .agents/plugins/marketplace.json # marketplace Codex distribuable
├── plugins/cab-approval-bridge/      # plugin Codex distribuable
│   ├── .codex-plugin/plugin.json
│   ├── skills/approval-bridge/SKILL.md
│   ├── skills/coding-session-statistics/SKILL.md
│   ├── systemd/cgpt-approval-bridge-controller.service
│   └── scripts/
│       ├── cgpt-approval-bridge-controller.mjs
│       ├── cgpt-approval-bridge-job-context.mjs
│       ├── cgpt-approval-bridge-model-policy.mjs
│       ├── cgpt-approval-bridge-runs.mjs
│       ├── cgpt-approval-bridge-import-observations.mjs
│       ├── cgpt-approval-bridge-observation-statistics.mjs
│       ├── cgpt-approval-bridge-statistics-maintenance.mjs
│       ├── cgpt-approval-bridge-resource-coordination.mjs
│       ├── cgpt-approval-bridge-statistics.mjs
│       ├── cgpt-approval-bridge-registry-lock.py
│       ├── cgpt-approval-bridge-supervisor.mjs
│       ├── cgpt-approval-bridge-supervisor-context.mjs
│       ├── cgpt-approval-bridge-prompts.py
│       ├── cgpt-approval-bridge-reset.py
│       ├── cgpt-approval-bridge-healthcheck.mjs
│       ├── cgpt-approval-bridge-opencode-sse-client.mjs
│       └── cgpt-approval-bridge-opencode-client.mjs
├── plugins/cabu/                     # plugin Codex d'entrée CABU
│   ├── .codex-plugin/plugin.json
│   └── skills/cabu/SKILL.md
├── src/                 # bridge Python
├── .codex/
│   └── commands/        # commandes /CAB, /CABU et /cab
├── PROJECT.md
├── TECHNICAL.md
├── BUILD.md
├── README.md
└── CHANGELOG.md
```

Les caches d'installation Codex ne font pas partie des sources du projet.

## 4. Prérequis d'exécution

### 4.1 Broker

- Python 3 ;
- système Unix compatible avec le verrouillage utilisé par CAB ;
- accès en lecture/écriture à l'espace persistant CAB ;
- OpenCode capable de lancer un serveur MCP local `stdio`.

Le broker n'utilise actuellement aucune dépendance Python tierce.

### 4.2 Plugin, contrôleur et superviseur

- Node.js avec les API Web utilisées par les scripts ;
- commande `codex` permettant `codex app-server` ;
- accès local à OpenCode ;
- possibilité d'exécuter le contrôleur hors sandbox.

### 4.3 Statistiques de session

Installer le jeu source complet CAB 1.10.6, notamment resource-coordination.mjs, statistics.mjs, observation-statistics.mjs, statistics-maintenance.mjs et import-observations.mjs avec leurs noms cgpt-approval-bridge-*. Le registre utilise le schéma 4 ; les schémas 1/2/3 restent lisibles en mode migration requise. Les snapshots statistiques cumulatifs lisent 1/2 et les observations ont leur stockage privé distinct schéma 2 lié au projet (les bundles importés restent schéma 1). Le magasin broker extensible 2 et le transport MCP sont conservés ; les capacités du nouveau protocole sont vérifiées avant permission.

Une conversion de runtime exige maintenance explicitement autorisée, quiescence, sauvegarde privée et qualification du jeu complet. Les RUN, jobs, candidates, demandes consommées et reçus sont conservés. Les RUN restent en pause ; le transport est vérifié en lecture, puis le prévol d’un seul RUN est autorisé après levée explicite du gel, en maintenant les pairs suspendus. Le métier reste interdit jusqu’à once, exit 0 et libération prouvés. Avant nouvel usage, /coordination/rollback et la sauvegarde permettent le retour exact ; après de nouveaux effets, une réconciliation/conversion est requise. Les anciennes acquisitions globales ordinaires sont refusées dans le nouveau profil. Une préparation source n'installe rien, ne propage aucun prompt et ne migre aucun RUN actif.

L'importeur est distribué sans dépendance tierce. Il transforme uniquement les fichiers d'audit explicitement désignés, en lecture progressive et filtrée, puis produit un jeu privé. Il ne suit aucun chemin issu du contenu et ne démarre aucun collecteur. Les consultations courant/dernier/24 h/7 j/30 j restent ponctuelles et neutres.

Le skill `coding-session-statistics` est embarqué dans le plugin CAB avec
ses métadonnées. Il utilise l'historique persistant et l'outil natif Codex
`mcp__codex_app__get_usage_limits` pour le quota hebdomadaire. Il ne nécessite
ni plugin Tools Codex ni skill `cgpt`. Une source indisponible produit `N/A`
motivé ; aucune donnée de session ou de quota n'est embarquée dans le paquet.
Les rapports sont produits dans les archives du projet piloté, jamais dans
le cache du plugin.

### 4.4 Supervision système

Le healthcheck 1.0.0 observe le contrôleur et le superviseur sans les redémarrer.
Les actions de cycle de vie restent pilotées après réconciliation. Une distribution sans systemd utilisateur devra fournir un
mécanisme équivalent ou adapter ces composants.

## 5. Installation du broker dans OpenCode

OpenCode doit déclarer CAB comme serveur MCP local `stdio`.
En OpenCode V2, la déclaration est un membre de `mcp.servers` nommé
`cgpt-validation`, avec `type: "local"` et le point d'entrée du broker dans
`command`. La forme V1 qui place directement le nom sous `mcp` n'est pas prise
en charge. Ne pas copier de secret dans la configuration du projet.

Le point d'entrée source est :

```text
src/cgpt_approval_bridge_server.py
```

Les trois modules Python CAB doivent être installés dans un même emplacement importable :

```text
cgpt_approval_bridge_server.py
cgpt_approval_bridge_router.py
cgpt_approval_bridge_journal.py
```

Le broker doit disposer d'un espace persistant en écriture pour son magasin, son journal, ses verrous, son checkpoint et l'état du circuit breaker.

## 6. Installation du plugin Codex

La source de la marketplace et du plugin se trouve à la racine du dépôt :

```text
.agents/plugins/marketplace.json
plugins/cab-approval-bridge/
```

Le plugin publié se trouve sous :

```text
plugins/cab-approval-bridge/
.codex-plugin/plugin.json
skills/approval-bridge/SKILL.md
skills/coding-session-statistics/SKILL.md
skills/coding-session-statistics/agents/openai.yaml
scripts/cgpt-approval-bridge-controller.mjs
scripts/cgpt-approval-bridge-reset.py
scripts/cgpt-approval-bridge-healthcheck.mjs
scripts/cgpt-approval-bridge-opencode-sse-client.mjs
```

Le catalogue `.agents/plugins/marketplace.json` référence ce plugin.

Le plugin embarque aussi la référence `skills/approval-bridge/references/session-reset.md`
et l'outil Python de purge, sans dépendance tierce. `/CAB start` les résout
depuis le plugin installé avant toute nouvelle session. Ils ne doivent pas
être copiés depuis un ancien cache divergent. L'outil reste dans le paquet ;
ses cibles sont seulement les espaces runtime CAB résolus, jamais le paquet
ou les sources du projet piloté.

Le plugin distribue aussi un modèle d'unité systemd utilisateur. Son
installation effective est différée au premier `/CAB start` : la commande
copie les ressources dans le profil Codex, écrit la configuration non secrète
du workspace, recharge systemd puis démarre explicitement le service. Elle ne
doit jamais appeler `systemctl --user enable`. `/CAB stop` arrête le service
mais conserve son unité inactive pour un démarrage ultérieur.

Les commandes `/CAB`, `/CABU` et `/cab` sont distribuées ensemble : `CAB.md` porte la procédure
canonique `/CAB`, `CABU.md` fournit `/CABU` sans argument et `cab.md` conserve
l'ancienne entrée avec transmission inchangée. Tous les fichiers ont le même
frontmatter de version. `/CABU` délègue à `/CAB update`, qui mène le déploiement
jusqu'au rapport terminal. Les commandes du profil sont remplacées atomiquement
depuis une source validée et toute copie locale plus récente ou divergente est
préservée.

Les commandes Codex sont maintenues séparément dans :

```text
.codex/commands/CAB.md
```

Cet artefact orchestre `start`, `run`, `test`, `update` et `stop` pour les ressources CAB. Il
doit être distribué et installé avec son plugin et sa skill, sans prendre en
charge la décision métier ni le cycle de vie direct du broker MCP OpenCode.

La source de publication est `AzenorPixs/cab-codex-plugins`, branche `main`,
avec extraction sparse `.agents/plugins` et `plugins`. `/CAB update` compare
la version de base distante à la version du paquet source CAB. Si GitHub est au
moins à jour, il conserve la marketplace Git, actualise son instantané et
installe le plugin seulement si la version distante est plus récente. Si le
développeur demande l'installation d'une version source locale plus récente,
la commande utilise le mécanisme pris en charge `codex plugin marketplace add`
avec la racine CAB, installe le plugin local par `codex plugin add`, et garde
cette marketplace locale jusqu'à publication d'une version distante au moins
égale. Une mise à jour locale ne modifie pas les fichiers de cache du plugin à
la main.

Les commandes CAB du profil sont rapprochées de la source retenue (GitHub ou
locale) et remplacées atomiquement depuis un staging privé si cette source est
plus récente. Une copie locale plus récente ou divergente est préservée et
rapportée. Après validation du jeu complet, `/CAB update` arrête les trois
unités systemd CAB, met à jour les quatre briques, recharge systemd puis
redémarre les unités. Il ne lit pas les états RUN ou coordination en
précondition. L'API OpenCode reconnecte le broker si elle répond ; sinon ses
fichiers sont installés et le runtime broker est `INDISPONIBLE`. Aucune donnée
de projet piloté n'est modifiée.
La vérification d'intégration de la release doit confirmer que `/CAB start`
purge complètement l'ancien runtime avant une nouvelle session, observe
l'état réel `GET /api/mcp`, que le broker reste géré par OpenCode et que `/CAB test`
utilise la nouvelle session maîtresse. Une reprise ordinaire doit préserver
ses preuves sans purge ; sa session est conservée, sauf remplacement explicite
vérifié par `/job/recover`. Un prévol divergent conserve sa candidate et le
runtime. L'intégration du correctif doit vérifier le gel du superviseur, retry
explicite après refus sans effet, les identifiants neufs et la frontière native
conservée. complete exige toujours le prévol exact sans rejouer les écritures
validées. Un timeout seul conserve le polling de la même approbation ; effets
inconnus et preuves absentes suspendent la reprise. L'outil de purge et ses
gardes restent inchangés et réservés aux nouveaux RUN. Les tests locaux
utilisent des services simulés ; déploiement et contrôles d'une installation
réelle restent distincts.

La qualification source 1.0.2 doit couvrir les refus REJECTED obtenus par
poll_approval et get_approval après timeout, ainsi que les refus des preuves
divergentes, incomplètes ou accompagnées d'effets. La décision locale rejected
non consommée reste obligatoire ; les versions installées et les RUN gelés ne
sont pas migrés par ces tests. Les huit ORCHESTRATED_CODING.md et le skill
source doivent porter la même règle sans écraser leurs clauses spécifiques.

Le dépôt source reste l'autorité. Un répertoire de cache ou d'installation Codex ne doit jamais devenir la source de développement.

La sous-commande `/CAB status` est distribuée dans le même fichier de commande
Codex ; elle utilise les outils de lecture disponibles et les vues GET
existantes. Elle n’ajoute ni script, ni dépendance, ni migration runtime.
La préparation 1.10.6 reste une modification source ; l’installation dans un
profil et la mise en service des composants sont des opérations distinctes.

## 7. Versionnement

CAB doit utiliser une version de projet explicite et cohérente entre les
artefacts distribués. La version de base actuelle est `2.1.5` pour le broker,
le contrôleur, le superviseur et le plugin ; le plugin ajoute uniquement un
cachebuster Codex à cette version.

Les releases Git devraient être identifiées par des tags de forme :

```text
vMAJOR.MINOR.PATCH
```

Le `CHANGELOG.md` accompagne les releases et décrit les changements significatifs.

Les numéros de version du broker et du plugin doivent être synchronisés ou leur relation explicitement documentée.

## 8. Publication du plugin

CAB distribue une marketplace Codex dans `.agents/plugins/marketplace.json`.
Pour une marketplace GitHub privée, ce fichier et `plugins/` doivent être
publiés à la racine d'un dépôt GitHub privé. L'administrateur de l'espace de
travail importe ensuite ce dépôt et le synchronise ; le compte GitHub connecté
doit disposer d'un accès en lecture au dépôt.

## 9. Forge et distribution Git

Le dépôt Git CAB constitue la source de vérité de développement.

Il peut être publié sur une forge distante principale et, si le mécanisme de distribution Codex l'exige, être synchronisé vers une forge compatible avec la publication du plugin.

Les artefacts générés, caches, états runtime et secrets ne doivent pas être versionnés.

## 10. Construction reproductible

Une release doit pouvoir être reconstruite uniquement à partir :

- du commit Git correspondant ;
- de la version déclarée ;
- des dépendances documentées ;
- des outils de packaging explicitement retenus.

Aucune donnée runtime provenant de `.opencode/state`, d'un cache Codex ou d'une session OpenCode ne doit entrer dans l'artefact distribué.

## 11. Contrôles avant release

Le correctif source 1.0.1 ajoute le contrôle des règles natives des jobs armés.
Vérifier les refus sous `allow`, sous règles absentes ou indisponibles, les
dérives entre admission/décision/transmission et l'isolation entre RUN. La
réactivation distribuée suit `noReply`, PATCH `ask` vérifié puis génération
sans champ `tools`. Les tests HTTP simulés restent distincts d'une intégration
OpenCode réelle. Le jeu complet installé et les RUN actifs ne sont pas modifiés
par la préparation source ; sa mise en service exige une coordination séparée.

Avant publication :

1. vérifier la syntaxe Python ;
2. vérifier la syntaxe JavaScript ;
3. valider `.codex-plugin/plugin.json` ;
4. exécuter les tests CAB applicables ;
5. vérifier `/CAB start` et `/CAB test` dans un environnement d'intégration,
   avec une session persistante et un MCP `cgpt-validation` connecté ;
6. vérifier qu’une décision `approved` ne transmet qu’un mandat unitaire à une
   seule permission native corrélée, et qu’un second mandat reste en attente
   d’une nouvelle décision Codex ;
7. vérifier l'absence de secret ;
8. vérifier que les caches et états runtime sont absents ;
9. vérifier la cohérence des versions ;
10. mettre à jour `CHANGELOG.md` et `README.md`.

## 12. Packaging système futur

Un paquet Debian pourra être envisagé pour installer le broker, les scripts du contrôleur, les unités utilisateur nécessaires et la documentation.

Ce mode n'est pas encore spécifié et ne doit pas être implémenté implicitement.

## 13. Conteneurisation future

Une conteneurisation éventuelle devra respecter l'architecture CAB, notamment :

- MCP `stdio` entre OpenCode et le broker ;
- persistance explicite des états ;
- interfaces du contrôleur limitées au local ;
- accès nécessaire au Codex App Server ;
- séparation entre environnement OpenCode et contrôleur hors sandbox.

Le projet actuel ne définit aucune image Docker CAB.

## Distribution concurrente 1.10.6

Installer le jeu complet des scripts du plugin dans un même répertoire : le
contrôleur et le superviseur importent les modules job-context, supervisor-context
et runs, ainsi que resource-coordination, statistics, observation-statistics
et statistics-maintenance ;
l'importeur import-observations est également distribué. Le registre lance
registry-lock.py avec Python 3. Ces fichiers sont
indissociables et doivent partager la version source courante 1.10.6. Aucune dépendance tierce
n'est ajoutée. Les unités utilisateur existantes restent les points d'entrée.

Le retour historique à 0.87.2 exigeait libération ou gel réconcilié de tous les
RUN car son contrôleur ne comprenait pas le registre concurrent. Ce cas de
compatibilité historique ne définit plus `/CAB update` 2.1.5, qui remplace le
jeu versionné et redémarre les trois unités sans consulter les états CAB.

Le script cgpt-approval-bridge-prompts.py permet une revue sans écriture puis
une application explicite aux projets passés par --project. Il ne touche que
les neuf prompts pilotés et leur protocole ; les prompts directs sont contrôlés
par empreinte. Les sources PROMPTS restent non versionnées dans leurs projets.


## Distribution de CAB Monitor 1.10.6

Le moniteur est une brique indépendante, distribuée sans dépendance tierce :

- `scripts/cgpt-approval-bridge-monitor.mjs` ;
- `scripts/cgpt-approval-bridge-monitor-data.mjs` ;
- `scripts/cgpt-approval-bridge-monitor-management.mjs` ;
- `scripts/cgpt-approval-bridge-monitor-events.mjs` ;
- `scripts/cgpt-approval-bridge-run-steps.mjs` ;
- `scripts/cgpt-approval-bridge-statistics-maintenance.mjs` et
  `scripts/cgpt-approval-bridge-observation-statistics.mjs` ;
- `web-monitor/index.html`, `web-monitor/app.mjs`, `web-monitor/stats.mjs`,
  `web-monitor/style.css` ;
- `systemd/cgpt-approval-bridge-monitor.service`.

Le contrôleur importe également `monitor-events.mjs` et `monitor-management.mjs` ; le contexte de job et
le moniteur utilisent le catalogue `run-steps.mjs`. Ces modules doivent être
présents avec leurs noms complets à côté des scripts lors d’un déploiement
autorisé. La référence `skills/approval-bridge/references/run-lifecycle.md`
est distribuée avec le protocole, sans nouvelle dépendance. Les modules,
briques existantes, manifeste, unités, commande et supports annoncent 1.10.6.
Les ressources HTML/CSS sont rattachées à cette release sans format de version
artificiel. Les schémas et le protocole MCP sont conservés.

Le modèle systemd et la référence
`skills/approval-bridge/references/monitor-service.md` sont livrés sans effet
sur les profils actifs. Leur installation et démarrage sont différés à
un démarrage ou une reprise de pilotage autorisés, y compris /CAB start. Dès
résolution du workspace, avant PLLM et les contrôles OpenCode/modèle/MCP,
la procédure prépare le jeu indépendant, recharge systemd et démarre le moniteur,
sans activation au login. Une instance active conforme est conservée sans
modification. Ce contrôle reste obligatoire avec services CAB réutilisés.
Le lancement direct de README.md reste possible.

L'unité attend `~/.config/cab-approval-bridge/monitor.env`, non secret et privé,
et l'arborescence `~/.local/share/cab-approval-bridge-monitor/` avec scripts/
et web-monitor/ frères. Installer ensemble monitor, monitor-data, monitor-management,
monitor-events, run-steps, statistics-maintenance et observation-statistics
avec leurs noms complets cgpt-approval-bridge-*. Les ressources index.html,
app.mjs, stats.mjs et style.css sont requises. La fermeture de ces imports et
ressources est qualifiée par lancement d'un paquet isolé.

Le modèle ne déclare aucune dépendance au contrôleur ou au superviseur.
/CAB stop et le reset préservent son service, sa configuration et son jeu
installé. /CAB update 1.10.6 peut redémarrer explicitement le moniteur pendant
sa transaction de maintenance lorsqu'il était déjà actif, sans démarrer une
instance initialement inactive.
Un port ou workspace divergent est signalé, sans tuer de processus ni modifier
un service actif. Cette préparation source ne déploie rien sur le profil réel.

Le jeu 1.10.6 conserve STATS et la maintenance des historiques introduits en 1.6.0. Le module
statistics-maintenance et son import observation-statistics sont requis avec
le contrôleur et le moniteur, même pour une installation séparée du moniteur.
Les schémas JSON restent inchangés ; aucun remplacement de magasin, migration,
purge réelle ou redémarrage de service n'est exécuté par la préparation source.
La qualification navigateur couvre navigation, filtres, annulation, purge sur
fixtures et protection des contextes actifs dans Chromium et Firefox headless.

Le jeu 1.10.6 ajoute monitor-management.mjs aux imports du contrôleur et du
moniteur, avec son nom complet cgpt-approval-bridge-monitor-management.mjs.
Le catalogue privé est créé seulement lors du premier rangement autorisé ;
il reste séparé des sources et du runtime CAB. Les droits utilisateur
existants sur les unités dédiées suffisent aux commandes ; aucune élévation,
activation au login ou nouvelle dépendance n'est installée. Un Web lancé
manuellement conserve sa supervision, avec redémarrage systemd indisponible.
Les tests de commandes utilisent un adaptateur simulé, jamais les services
réels. Le jeu installé isolé doit contenir onze ressources, dont ce module.

## Distribution de la mise à jour active 2.1.5

Le plugin ajoute scripts/cgpt-approval-bridge-update.mjs, sa référence
skills/approval-bridge/references/component-update.md et broker/ contenant
cgpt_approval_bridge_server.py, cgpt_approval_bridge_router.py et
cgpt_approval_bridge_journal.py. src/ reste l'autorité ; les trois copies
distribuées sont contrôlées octet pour octet par le test de distribution.
Le paquet complet permet de mettre à jour le broker sans extraire du code
d'un autre commit ou réécrire la configuration OpenCode.

Le script est exécuté depuis le plugin installé, hors des destinations qu'il
remplace. Il valide et sauvegarde le jeu complet avant tout effet. Il ne modifie
ni cache de plugin, secret, environnement, drop-in ni projet piloté. L'invocation
`/CAB update` arrête systématiquement les trois unités systemd CAB, remplace
atomiquement les fichiers des quatre briques, exécute `daemon-reload`, puis
démarre systématiquement les trois unités, sans consulter les états RUN ou de
coordination en précondition. Aucune unité n'est activée au login. OpenCode
reste ouvert ; si son API répond après remplacement, les routes natives
rechargent le broker. En son absence, les fichiers broker sont quand même
installés et sa version runtime est rapportée `INDISPONIBLE`. Le journal et les
sauvegardes permettent le retour arrière sans restaurer de données métier.

### Correctif source de notification orpheline

`fix-orphaned-validation-admission` modifie seulement controller, job-context,
runs et resource-coordination, leurs contrats et tests. La base reste 1.10.6 ;
ce lot n'est pas une publication ou une installation. Le chargement doit être
prouvé par empreintes du jeu effectivement déployé et par la capacité publique
`notificationReconciliation: rejection-only-v1`, jamais par la seule version.
Les nouveaux reçus et le verrou rejectionOnly du registre 4 rendent un retour
aux anciens lecteurs stricts non garanti après utilisation. Aucun fichier
runtime antérieur ne doit être restauré pour effacer ces nouveaux reçus.

L'activation du correctif exigeait un mandat distinct. La procédure ordinaire
`/CAB update` 2.1.5 redémarre les unités sans consulter une récupération
ouverte ; le profil explicite frozen-recovery-controller conserve son autorité
BOOTSTRAP_HELD qualifiée, suivie d'adoption et du vrai HELD, sans installation
implicite par la préparation SCM. Le paquet distribue
maintenance-proof avec la fermeture d'imports du contrôleur. Les sources sont
1.10.6 ; broker, superviseur et Web 1.7.1 peuvent être conservés uniquement dans
la transition bornée qualifiée et explicitement annoncée. Leur mise à niveau
globale et toute reconnexion MCP restent hors de cette préparation.

Le paquet inclut aussi approval-metadata pour la projection filtrée d'une
observation native existante. Le mode managed-release doit être explicitement
sélectionné et qualifié pour l'installation visée : le profil gelé ajoute une
release du contrôleur et bascule sa seule entrée ; l'alignement ordinaire
prépare les quatre briques et leurs pointeurs. Aucun ancien fichier de release
n'est réécrit. Une installation liée ne doit pas être transformée en installation
plate ou réparée par une écriture à travers un lien.

### Distribution du complément 1.10.6

Le paquet distribue broker-artifact-proof.mjs avec update.mjs. La politique
reuse-readonly conserve les trois sources broker existantes et ne les traite
pas comme des destinations. La preuve JSON privée est fournie explicitement ;
ni propriétaire différent ni absence de droit d'écriture ne sont masqués.
Le banc tests/helpers/run-readonly-broker-two-uid.py utilise le conteneur
DEVOPS, des entrées hôte montées en lecture seule et deux UID réels dans son
espace éphémère. Comptes, droits et services hôte ne changent pas. Ce banc
ne constitue aucune activation du projet consommateur. Les archives L1/L2
restent les preuves historiques de leur version source 1.8.0.

## Distribution 1.10.6 — tests conteneurisés et rafraîchissement

La préparation conserve les modules existants et ajoute model-policy à la fermeture d'imports du contrôleur et du superviseur. Les réservations Docker/LXC sont intégrées à resource-coordination, runs et controller ; les ressources app.mjs, index.html et style.css portent le sélecteur de cadence et la disponibilité Web. Les copies broker restent identiques aux trois sources Python. Aucun paquet tiers ni nouveau service n'est requis.

Un registre 4 sans `testReservations` conserve ses clés logiques historiques, y compris Docker/LXC/navigateur, sans réécriture. Les nouvelles réservations de test exigent les identités canoniques et une permission native exige une réservation détenue ; une ancienne clé ne les autorise pas. Après premier usage de cette collection, un ancien lecteur strict refuse le format enrichi ; un repli exige alors une réconciliation/conversion autorisée, sans restauration d'une sauvegarde effaçant les effets récents. Cette préparation ne déploie rien et ne migre aucun RUN. La qualification utilise les fixtures de registre/HTTP et Chromium/Firefox headless ; elle n'atteste pas la restitution d'un environnement LXC réel ni une activation consommateur.

Les navigateurs externes de test déclarés dans DEVOPS.md, actuellement Chromium et Firefox, suivent aussi ce cycle avec les clés `browser:<hôte>/<navigateur>`. La réservation reste détenue jusqu'à fermeture des sessions WebDriver/BiDi et processus, libération des ports et profils temporaires du change, nettoyage puis vérification distincts. Les sessions utilisateur préexistantes sont préservées. Les ensembles navigateur/conteneur sont acquis atomiquement ; des mécanismes indépendants peuvent avancer.

## Distribution de la politique de modèle — 1.10.6

Distribuer cgpt-approval-bridge-model-policy.mjs avec controller, job-context et supervisor-context. L'updater exige ce module et contrôle sa version et ses imports. Installer aussi skills/approval-bridge/references/model-policy.md. Aucun paquet tiers n'est ajouté. Le chemin public OC_Codex_PLLM_CATALOG (alias OC_CGPT_PLLM_CATALOG) doit être configuré lors d'une installation autorisée ; l'updater conserve les environnements existants et cette préparation ne les modifie pas. Le nouveau protocole négocie pllm-auto-v1 pour les nouveaux jobs ; les anciens contrats et jobs restent lisibles.

## Qualification et installation locale — 1.10.6

Le jeu conserve ses modules et formats, avec le correctif de lecture bornée du registre. Le banc deux UID dispose de --large-registry pour qualifier un snapshot HTTP dépassant 2 Mio et un fichier privé dépassant 4 Mio, sans dépasser 16 Mio. Les installations locales explicitement demandées doivent préserver caches et anciennes releases, documenter la provenance et distinguer la version locale de la publication distante. Les sauvegardes et journaux de l'updater restent l'autorité de récupération ; aucun état métier n'est restauré.

La réparation ciblée du lecteur après échec de restauration est décrite dans `plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md`. Elle garde le journal et les stages initiaux, le même HELD et des releases immuables. Elle ne restaure aucune donnée métier ni ancien processus broker.

Pour un broker externe reuse-readonly, la qualification couvre aussi un enfant créé depuis un thread secondaire OpenCode. Le module de preuve est distribué avec le jeu complet ; UID, parent, commande, identité et unicité restent obligatoires avant libération de maintenance.

## Correctif 1.10.6 et installation locale

Les quatre briques, modules, plugin et commande sont alignés en 1.10.6. Le correctif providerMaxBytes reste dans le contrôleur ; aucun fichier d'environnement ou fournisseur n'est modifié. La maintenance qualifiée admet un broker encore chargé en 1.10.1 avec artefacts cibles 1.10.6 identiques au paquet, conserve le processus OpenCode, jobs et pauses, puis vérifie les quatre versions réellement chargées. Les anciennes releases et archives sont préservées.

## Livraison source du raccord 1.10.6

Distribuer prepare-model-policy.mjs avec model-policy, controller et le jeu complet. Le CLI prépare uniquement un patch non secret ; l'application au service appartient au démarrage ou à la maintenance autorisés après publication. Le jeu courant conserve toutes les copies broker identiques et les origines chargées précédemment admises, dont 1.10.2 et 1.10.3, dans le garde reuse-readonly. La préparation historique du raccord est documentée dans son archive ; aucune installation réelle n'est effectuée pendant la préparation SCM.

## Préparation du Monitor — 1.10.6

Les quatre briques, leurs modules, copies broker, manifeste avec cachebuster neuf, unités et commande partagent 1.10.6. Le HTML de repli annonce aussi cette version. Aucun format persistant ni transport métier ne change.

Le protocole commun est corrigé dans le référentiel template puis synchronisé vers la copie CAB. Les empreintes prouvent leur identité ; les autres projets consommateurs restent inchangés. Commande et skill reprennent ses règles PLLM de fraîcheur initiale et de conservation du choix, sans réessai automatique implicite.

La transition isolée historique de 1.10.3 vers 1.10.4 est qualifiée avec deux UID réels, succès et réponse de déconnexion perdue, grand registre, sources broker non modifiées par l'acteur de maintenance, OpenCode et PAUSE conservés. Les preuves sont sous output/scm/fix-monitor-manual-view-and-task-order. Elles ne constituent aucune installation ou activation du profil utilisateur.

## Commandes et incrément 1.10.6

Le jeu complet conserve les formats et gardes 1.10.4. Les trois commandes
partagent 1.10.6 ; le manifeste reçoit un cachebuster neuf. Les marqueurs de
blocs des prompts consommateurs restent stables pour éviter une duplication
lors d'une synchronisation autorisée. Aucun prompt consommateur n'est modifié.
Les preuves historiques 1.10.3 vers 1.10.4 restent attachées à leur version ;
la transition 1.10.4 vers 1.10.6 est qualifiée séparément en environnement isolé :
succès et perte de réponse à la déconnexion, deux UID réels, grand registre et
broker enfant d’un thread secondaire. Les preuves sont dans
`output/scm/add-cab-uppercase-update-alias/two-uid-tests-retry.log` ; elles ne
prouvent aucune installation du profil réel.

### CABU 2.1.5 : coupure courte et reprise

CABU délègue au seul updater de `/CAB update`. La préparation, la compilation
et les sauvegardes précèdent la coupure. Les validations syntaxiques peuvent
être réutilisées uniquement pour le même contenu et le même validateur ; les
empreintes des sources, stages et destinations restent vérifiées à chaque appel.
Les fichiers prêts sont préparés sur le système de fichiers cible ; la coupure
contient principalement les arrêts, renommages et redémarrages. systemd est
rechargé lorsque les unités changent, sans activation au login.

Les RUN ne sont ni avertis, ni placés en PAUSE, ni modifiés. L'absence du
transport bloque leurs nouvelles opérations CAB ; les effets déjà lancés côté
OpenCode peuvent continuer. Au retour, les états durables sont restaurés et les
effets inconnus restent protégés jusqu'à réconciliation, sans rejeu de once.

Les trois services doivent servir 2.1.5 en fin de transaction. OpenCode actif
exige une déconnexion/reconnexion native du broker et une readiness fraîche
portant la version cible. Une API ou une reconnexion non vérifiable interdit
le succès ; seule l'absence prouvée d'OpenCode autorise un broker runtime
INDISPONIBLE. Les durées preparationMs, unavailableMs et totalMs sont publiées ;
la cible est moins de cinq secondes de coupure dans le banc contrôlé.

### Migration des identifiants en 2.1.5

La marketplace expose CAB et CABU ; le skill principal est nommé CAB dans
son frontmatter. Installer `CAB@cab_codex_plugins` et
`CABU@cab_codex_plugins`, puis vérifier identités et version commune avant la
maintenance. Sauvegarder le paquet de l'ancienne identité cab-approval-bridge
dans l'espace privé de l'updater avant son retrait géré. Le gestionnaire peut
supprimer l'ancien cache ; les sources, sauvegardes et ressources runtime
restent conservées. Les chemins et commandes compatibles sont détaillés dans
README.md, section « Identifiants publics CAB 2.1.5 ».


## Prévol du credential et installation mixte — 2.1.5

Avant toute coupure, l’updater vérifie le credential privé attendu par les trois unités. Un fichier absent, non régulier, lié ou insuffisamment protégé produit un diagnostic `update-credential-*` avant arrêt et remplacement. Aucun mot de passe n’est demandé au modèle.

Si DEVOPS.md déclare OPENCODE_PASSWORD dans le project.env du projet concerné, le développeur peut autoriser le raccord en passant explicitement `--opencode-password-env-file <workspace>/project.env` (ou le project.env du workspace des services). Le processus local n’extrait que cette affectation littérale, ignore les autres clés et ne charge jamais le fichier dans le shell. Doublons, valeur vide, échappements et interpolations sont refusés. Un credential existant différent reste intact ; aucun remplacement implicite n’est permis. Le credential créé en 0600 reste conservé après repli et n’est pas copié dans les sauvegardes d’artefacts. Aucun secret ni empreinte du secret ne figure dans les sorties, arguments, environnement ou reçus.

Cette option est facultative : les projets sans OpenCode ou session pilotée n’ont pas à définir OPENCODE_PASSWORD. Sans option, le credential privé existant suffit et aucun project.env n’est lu. Cette préparation source ne provisionne rien dans le profil réel.

Pour une installation mixte, utiliser `--broker-policy cab-source --layout managed-release` : le broker dans src/ reste ordinaire ; seuls les scripts des services et le Web utilisent les releases gérées. Les anciens liens et releases sont sauvegardés et restaurables ; aucune conversion manuelle des liens n’est nécessaire. `--service-workspace` conserve le workspace réel des services.

Un échec après coupure expose `failureCode`, `serviceFailures` (composant, ActiveState, SubState, Result, ExecMainStatus), `transactionId` et `recoveryPhase`. Un code 243 désigne un échec systemd CREDENTIALS avant Node.js. Un retour 0 de systemctl start seul ne prouve pas la santé de l’application. La cause filtrée reste dans le reçu après repli, sans sortie brute du journal ou de systemctl.

### Compatibilité des catalogues PLLM — 2.1.5

CAB accepte strictement le schéma 2 à six politiques et le schéma 3 à sept politiques, sans réécrire le catalogue. Les priorités, dates, sélection courante, medium et prévol natif restent contrôlés ; mode7 peut être sélectionné puis conservé dans le job. Les jobs existants conservent leur choix. Le raccord utilise le catalogue public du skill actif, vérifié par /model-policy/resolve avant nouveau job. Aucune activation ou réussite de CAB test n’est déduite de la qualification source.

### Pagination et prévol natif V2 — 2.1.5

Le client n’envoie order que sur la première page et conserve les curseurs opaques. Le prévol peut corréler un échange natif unique complet lorsque l’utilisateur omet le modèle : la réponse assistant fournit alors le modèle/variante réellement utilisés, avec les dates et gardes habituelles. Aucun champ utilisateur n’est inventé. Les échanges ambigus ou contradictoires restent refusés. La preuve héritée et le choix des jobs existants sont conservés.
