# AGENTS.md — Codex Approval Bridge

Version : 0.3

## 1. Contexte

* Projet : `Codex Approval Bridge` ;
* Racine du projet : `/home/devops/datas/cab` ;
* Règles de sécurité et de travails des LLM : `AGENTS.md` ;
* Objectifs et architecture du projet : `PROJECT.md` ;
* Cadrage technique : `TECHNICAL.md` ;
* Cadrage de déploiement : `BUILD.md` ;
* Envrionnement de développement : `DEVOPS.md` ;

L'agent NE DOIT PAS créer, modifier ou supprimer de fichier hors de la racine
applicable à son environnement sans validation explicite du développeur.

## 2. Priorité des règles

En cas de contradiction, appliquer cet ordre :

1. Demande explicite du développeur ;
2. Spécifications OpenSpec validées ;
3. Règles de sécurité et de travails des LLM : `AGENTS.md` ;
4. Objectifs et architecture du projet : `PROJECT.md` ;
5. Cadrage technique : `TECHNICAL.md` ;
6. Cadrage de déploiement : `BUILD.md` ;
7. Environnement de développement : `DEVOPS.md` ;
8. documentation officielle du projet ;
9. code existant.

Une spécification OpenSpec validée prévaut sur un code contradictoire.

La stabilité du projet prévaut sur l'optimisation.

Un `AGENTS.md` situé dans un sous-répertoire s'applique uniquement lorsqu'il est explicitement chargé ou lorsque l'agent travaille depuis ce sous-répertoire.

Il DOIT reprendre explicitement les règles générales qui doivent continuer à s'appliquer.

En cas de conflit, le `AGENTS.md` le plus proche du fichier concerné prévaut, sauf instruction explicite du développeur.

## 3. Ordre de lecture

Avant toute intervention, l'agent DOIT lire uniquement ce qui est nécessaire, dans cet ordre :

1. `AGENTS.md` ;
2. `PROJECT.md` ;
3. `TECHNICAL.md` ;
4. `BUILD.md` ;
5. `DEVOPS.md` ;
6. spécifications ou évolution OpenSpec applicables ;
7. conventions applicables du projet ;
8. code et documentation concernés.

L'agent DOIT privilégier :

* les recherches ciblées ;
* les lectures partielles ;
* les lectures incrémentales ;
* les répertoires directement concernés.

Il NE DOIT PAS parcourir récursivement l'ensemble du dépôt lorsqu'une lecture ciblée suffit.

## 4. Principes fondamentaux

L'agent DOIT privilégier :

* la stabilité ;
* la reproductibilité ;
* la simplicité ;
* la lisibilité ;
* la maintenabilité ;
* la sécurité ;
* la traçabilité ;
* la modularité ;
* la compatibilité.

L'agent DOIT réaliser la modification minimale répondant correctement à l'objectif validé.

Il DOIT préserver tout comportement existant non concerné par la demande.

Il NE DOIT PAS effectuer sans rapport avec la demande :

* de correction ;
* de refactoring ;
* d'optimisation ;
* de reformatage ;
* de renommage ;
* de réorganisation ;
* de modification de convention.

Toute amélioration non demandée DOIT être proposée séparément.

Une évolution complexe DEVRAIT être découpée en modifications indépendantes, testables et réversibles.

## 5. Méthode de travail et autorisations

Avant toute modification, l'agent DOIT :

1. comprendre la demande ;
2. consulter les éléments OpenSpec applicables ;
3. examiner l'implémentation actuelle ;
4. identifier les fichiers concernés ;
5. déterminer la modification minimale nécessaire ;
6. obtenir une validation explicite lorsqu'elle est requise.

L'agent DOIT modifier uniquement les fichiers nécessaires à l'objectif validé.

Lorsqu'une validation explicite est requise mais absente, l'agent DOIT se limiter à l'analyse et aux propositions.

Une validation explicite correspond à une demande ou confirmation claire du développeur autorisant l'action concernée.

Après modification, l'agent DOIT :

1. examiner les fichiers modifiés ;
2. vérifier leur syntaxe ;
3. exécuter les tests et vérifications applicables ;
4. vérifier la conformité OpenSpec ;
5. vérifier l'absence de modification hors périmètre ;
6. rapporter les fichiers modifiés, validations, impacts, échecs et incertitudes.

## 6. Modifications fonctionnelles et OpenSpec

OpenSpec constitue la source de vérité fonctionnelle et technique du projet.

Sources faisant autorité :

* `openspec/config.yaml`
* `openspec/changes/`
* `openspec/specs/`

L'agent DOIT consulter les spécifications applicables avant toute évolution fonctionnelle.

Il NE DOIT PAS implémenter une fonctionnalité absente d'une spécification validée, sauf autorisation explicite du développeur.

Toute évolution fonctionnelle DOIT être précédée ou accompagnée de la création ou mise à jour OpenSpec correspondante.

L'agent NE DOIT PAS créer une nouvelle évolution OpenSpec de sa propre initiative.

La création, modification, suppression ou régénération d'éléments OpenSpec nécessite :

* une demande explicite de travail sur les spécifications ;
* une validation explicite du développeur ;
* ou une commande OpenSpec explicitement demandée autorisant cette écriture.

La demande explicite d'une des commandes suivantes autorise les écritures OpenSpec nécessaires à son exécution :

* `/opsx-propose`
* `/opsx-new`
* `/opsx-continue`
* `/opsx-update`
* `/opsx-sync`
* `/opsx-archive`

### Délégation de pilotage OpenSpec

Lorsqu'un agent orchestrateur tel que CGPT pilote un agent de codage, il PEUT valider et autoriser les créations, modifications, corrections, synchronisations et archivages OpenSpec nécessaires à l'objectif demandé, à condition qu'ils respectent strictement les spécifications OpenSpec préalablement validées par le développeur.

Avant toute écriture OpenSpec, l'agent de codage DOIT présenter à l'agent orchestrateur les fichiers concernés et les modifications proposées, puis attendre sa validation explicite. La validation de l'agent orchestrateur vaut alors autorisation d'écriture dans ce périmètre.

L'agent de codage NE DOIT PAS valider seul ses modifications OpenSpec, étendre le périmètre validé, créer une évolution non demandée, ni effectuer un commit ou un push sans autorisation distincte.

Le développeur peut limiter ou révoquer cette délégation à tout moment. Ses instructions prévalent toujours.

Les spécifications OpenSpec DOIVENT rester cohérentes entre elles.

## 7. OpenCode

OpenCode est un composant technique du projet.

Les éléments suivants sont générés par OpenSpec/OpenCode et NE DOIVENT PAS être modifiés manuellement sans autorisation explicite :

* `.opencode/commands/`
* `.opencode/skills/`

Toute modification de la configuration OpenCode nécessite une validation explicite concernant OpenCode ou son intégration avec OpenSpec.

### Protocole de communication OpenCode ↔ CGPT via CAB

Ce protocole s'applique à tout agent de codage OpenCode piloté par CGPT pendant
une session de codage. Il complète les règles OpenSpec et ne les remplace pas.

#### Rôles

CGPT fixe le périmètre, valide les choix fonctionnels et techniques, décide
des mandats CAB et reçoit les comptes rendus. Le broker CAB ne décide jamais :
il transporte et corrèle les demandes. Une décision est limitée à un
`requestId` unique et à une seule opération.

L'agent de codage NE DOIT PAS étendre le périmètre, inventer une réponse CGPT
ou CAB, exécuter une opération refusée, ni déclarer exécuté un outil, une
commande ou un test sans preuve observée dans la session. Il NE DOIT PAS lire,
afficher ou transmettre de secret.

#### Initialisation de session

Avant chaque nouvelle session CAB, l'orchestrateur DOIT appliquer la purge
complète définie par le skill `approval-bridge` et la commande `/cab start`.
Il DOIT prouver l'inactivité du contexte, arrêter les ressources CAB et
déconnecter le broker par l'API native OpenCode avant de purger les seuls
espaces runtime CAB, y compris leurs conflits Syncthing, sans lire ni
restaurer leur ancien contenu. Une purge échouée interdit le démarrage.
L'orchestrateur NE DOIT PAS fermer OpenCode, effacer un RUN actif ou toucher
les sources, secrets, configurations, rapports et historiques natifs.
La reprise ordinaire du même RUN conserve son état ; elle ne constitue pas un
nouveau démarrage. Seule l'exception « Nouvelle session CAB après prévol de
récupération divergent » ci-dessous autorise la purge d'un runtime neutralisé
en conservant le checkpoint métier externe. La nouvelle session utilise de
nouveaux identifiants et exige une
readiness réelle et un test CAB complet avant tout mandat de travail.

Avant tout accès au projet, l'agent DOIT :

1. confirmer le répertoire, le change OpenSpec et le périmètre reçus ;
2. appeler réellement l'outil MCP `broker_readiness` exposé dans la session ;
3. exiger le statut `READY` et l'absence d'approbation parasite ;
4. rapporter à CGPT l'identifiant de session, le répertoire, le change et
   l'état CAB.

Une réponse textuelle sans appel d'outil observé ne constitue jamais une
preuve. Si l'outil MCP n'est pas exposé, échoue, répond `BLOCKED` ou
`HUMAN_REQUIRED`, l'agent DOIT envoyer `CAB_BLOCKED` à CGPT et s'arrêter.

#### États de session

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

#### Messages à destination de CGPT

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

#### Mandats CAB

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

#### Exécution, preuves et clôture

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

#### Nouvelle session CAB après prévol de récupération divergent

Après le feu vert de la session, l'orchestrateur est autorisé sans nouvelle
confirmation à ouvrir une nouvelle session CAB lorsqu'une récupération échouée
prouve à la fois la transmission de `true` au lieu de `/usr/bin/true` et un
`change_id` divergent du change attendu. Le mandat erroné reste refusé, sans
normalisation. Cette exception ne couvre aucun autre échec et n'est jamais
exécutée automatiquement par `/job/recover`.

Geler le travail, traiter les rapports, réconcilier les effets et refuser les
permissions divergentes ; clôturer les demandes restantes sans les approuver.
Exiger la propriété du contexte, les sessions inactives, aucun mandat actif
ou en attente, aucune permission non résolue et aucun effet inconnu. Un espace
partagé avec un autre travail ou une preuve incertaine interdit la purge.

Préserver hors des cibles un checkpoint métier non secret : objectif, change
attendu, jalons, écritures validées et preuves natives, prochaine action, motif
de l'échec et chemins résolus. Arrêter les ressources CAB du contexte et
déconnecter nativement le broker selon `references/session-reset.md`.
L'abandon de ce seul job technique gelé est autorisé même avec gate OPEN, sans
fabriquer un gate valide ni désarmer artificiellement le job. Ne pas fermer
ou redémarrer OpenCode.

Purger avec l'outil distribué les seuls espaces réellement résolus
`<home OpenCode>/.opencode/state/cgpt-approval-bridge/` et
`<racine projet>/.opencode/state/cgpt-approval-bridge/`, en tenant compte des
chemins personnalisés. Les gardes de chemin et de verrou restent obligatoires.
Approbations, journal, job et autres états techniques sont supprimés sans
lecture, sauvegarde ou restauration ; checkpoint métier, sources, secrets,
rapports et historiques natifs restent hors purge. Une purge partielle
interdit le démarrage.

Créer une nouvelle session CAB et un nouveau job technique, avec des
identifiants de session, job, requête et approbation neufs. Le prévol de ce
redémarrage exige exactement `/usr/bin/true`, sans suffixe, avec le
`change_id` attendu du checkpoint, une décision explicite, une réponse MCP
corrélée, une permission consommée une seule fois et exit 0. Exiger ensuite
`broker_readiness = READY` sans demande ni permission parasite. Un nouveau
prévol divergent interdit la reprise.

Réconcilier les fichiers et les preuves conservées, puis reprendre au premier
jalon non prouvé, sans rejouer les écritures validées ni les autorisations
consommées et sans réadopter l'ancien job ou ses décisions. Le RUN métier
conserve son checkpoint externe ; la récupération ordinaire reste sans purge.
Une preuve manquante ne vaut jamais succès et n'autorise aucun rejeu aveugle.
Les permissions techniques de la plateforme restent applicables.

#### Cadences de pilotage et attente PLLM

L'orchestrateur DOIT traiter les événements SSE OpenCode en temps réel et
contrôler les demandes et les rapports toutes les 3 secondes dans la boucle
de pilotage. Pendant l'analyse ou la rédaction de l'agent de codage, il DOIT
utiliser des pauses fixes de 7 secondes entre deux vérifications de progression.
Ces pauses NE DOIVENT PAS ralentir le SSE ni le contrôle CAB toutes les
3 secondes. Les temporisations techniques du superviseur, des heartbeats et
des rappels du broker restent distinctes.

Lors d'un échec du benchmark PLLM, l'orchestrateur DOIT conserver le même RUN
en attente non terminale et retenter le benchmark toutes les 30 minutes
(1 800 secondes), indéfiniment, sans limite de tentatives, jusqu'à reprise
sûre du RUN ou arrêt explicite du développeur. La prochaine échéance est
calculée depuis l'échec observé de la dernière tentative. Le checkpoint non
secret conserve le RUN, les horodatages, causes et résultats des tentatives
ainsi que la prochaine échéance. Après interruption, conserver cette échéance
et réconcilier toute tentative en cours ou d'effet inconnu avant de retenter ;
ne jamais lancer de tentatives simultanées ou dupliquer un essai non réconcilié.
La supervision reste active, sans attente bloquante de trente minutes. Ce seul
échec NE DOIT PAS clôturer le RUN ni fermer ou redémarrer les processus.

Après une réussite observée, réconcilier les contextes, la santé OpenCode, MCP,
la readiness CAB réelle et les permissions avant reprise. Si la reprise n'est
pas sûre, appliquer la récupération CAB et conserver sa cause observable.
La réussite du benchmark ne vaut jamais approbation, ne rejoue aucun mandat
consommé et ne contourne aucun blocage CAB distinct.

Les sondes statistiques DOIVENT être prévues toutes les 30 minutes, en
complément des sondes initiale et finale. Poursuivre le travail entre les
échéances, sans arrêter le travail pour attendre un créneau. Signaler les
relèves manquées sans reconstruction rétroactive. Une sonde statistique
échouée reste distincte d'un échec du benchmark PLLM et ne suspend pas, à elle
seule, le RUN.

#### Compactage coordonné des deux agents

L'orchestrateur DOIT piloter un cycle commun de compactage des sessions de
l'orchestrateur et de l'agent de codage toutes les 1 h 30 (5 400 secondes).
À l'échéance, il DOIT suspendre l'attribution de nouveaux mandats, laisser
l'opération autorisée en cours se terminer et traiter son rapport. Il DOIT
ensuite vérifier les API natives exposées pour les sessions réellement
pilotées. Lorsque les deux sont disponibles, il DOIT lancer les deux
compactages en parallèle dans un même cycle identifié et horodaté ; sinon,
il DOIT compacter les seules sessions accessibles et tracer ce qui n'a pas
été exécuté.

Le checkpoint non secret DOIT conserver les identifiants de session disponibles
et signaler ceux non exposés sans les inventer, le
périmètre, les mandats consommés, les preuves et la prochaine action. Les deux
résultats natifs DOIVENT être observés et corrélés aux sessions réellement
pilotées ; une session auxiliaire, un accusé de lancement ou un résumé rédigé
manuellement NE DOIT PAS être présenté comme un compactage achevé.

Les deux preuves natives sont requises pour déclarer la réussite conjointe,
pas pour reprendre un RUN dont l'état reste exploitable. Avant reprise,
l'orchestrateur DOIT réconcilier les deux contextes, la santé OpenCode, MCP,
la readiness CAB et l'absence de permission parasite. Un
compactage NE DOIT PAS rejouer un mandat, autoriser une opération, modifier le
modèle ou fermer/redémarrer un processus. Si une API native est indisponible
ou si l'un des compactages échoue, conserver le cycle incomplet, sa cause et
ses preuves ; ne pas annoncer une synchronisation réussie. Ce seul écart
NE DOIT PAS classer le RUN `BLOQUÉ`, arrêter CAB, demander une dérogation ni
différer les statistiques. Une reprise sûre DOIT poursuivre les mandats déjà
autorisés ; un compactage encore en cours ou une réconciliation impossible
DOIT suspendre les seules opérations concernées selon les règles CAB.
L'orchestrateur NE DOIT PAS répéter aveuglément une opération d'effet inconnu
ni attendre une API absente ; il réexamine sa disponibilité à la prochaine
échéance du cycle. Tout retard DOIT rester observable, sans réussite rétroactive.

#### Statistiques d'archivage

Après chaque archivage OpenSpec autorisé et réussi, produire un rapport par
archive dans `openspec/changes/archive/<archive>/STATISTIQUES.md`, avec un
mandat d'édition distinct pour ce seul fichier lorsque le protocole CAB
s'applique. Vérifier les six sections, UTF-8/LF et les totaux ; afficher `N/A`
motivé pour les mesures absentes. Ne pas déclarer `TERMINÉ` sans preuve du
rapport. Si le rapport échoue, reprendre uniquement ce rapport, sans réarchiver.

## 8. Arborescence et fichiers

L'agent DOIT préserver l'arborescence et les conventions existantes.

Toute référence à un prompt ou une session renvoie automatiquement au dossier `PROMPTS/` du
projet, et à son INDEX.md pour la liste des prompts disponible.
Ce dossier et son contenu ne sont pas versionnés et sont protégés :
leur création, modification, déplacement ou suppression nécessite une
validation explicite du développeur.

Le renommage, déplacement ou la suppression d'un fichier ou répertoire nécessite une validation explicite du développeur.

Lorsqu'un fichier semble inutilisé, l'agent DOIT le signaler avant toute suppression.

Toute suppression de code existant DOIT être limitée au strict nécessaire et justifiée.

Les fichiers temporaires ou artefacts de construction explicitement régénérables PEUVENT être supprimés puis recréés lorsque nécessaire.

Les éléments versionnés ou protégés suivants NE DOIVENT PAS être supprimés ou régénérés sans validation explicite :

* `.gitignore`
* `AGENTS.md`
* `BUILD.md`
* `CHANGELOG.md`
* `DEVOPS.md`
* `LICENSE`
* `PROJECT.md`
* `README.md`
* `TECHNICAL.md`
* `.opencode/commands/`
* `.opencode/skills/`
* `.opencode/config/opencode.json`
* `openspec/config.yaml`
* `openspec/changes/`
* `openspec/specs/`

## 9. Sources du projet

Les fichiers du projet non explicitement exclus PEUVENT être utilisés comme sources :

* de code ;
* de documentation ;
* d'informations techniques ;
* d'informations fonctionnelles.

Les sources exclues NE DOIVENT PAS être lues, analysées, indexées ou utilisées :

```text id="6zj1eg"
__pycache__/
**/*.crt
**/*.cer
**/*.der
**/*.env
**/*.env.*
**/*.key
**/*.pem
**/*.p12
**/*.pfx
**/credentials.json
**/credentials.yaml
**/id_rsa
**/id_ed25519
**/secrets.json
**/secrets.yaml
.cache/
.git/
.idea/
.mypy_cache/
.npm/
.opencode/.gitignore
.opencode/cache/
.opencode/config/
.opencode/share/
.opencode/state/
.pytest_cache/
.ruff_cache/
.venv/
.python-version
.stfolder/
.stignore
.vscode/
credentials.json
credentials.yaml
id_rsa
id_ed25519
env/
logs/
node_modules/
openspec/.cache/
openspec/.env
openspec/.env.*
openspec/.generated/
openspec/.history/
openspec/.output/
openspec/.tmp/
openspec/build/
openspec/dist/
openspec/logs/
PROMPTS/
secrets.json
secrets.yaml
tmp/
venv/
```

### Inclusions explicites

Les inclusions suivantes prévalent sur les exclusions générales et PEUVENT être consultées lorsque nécessaire :

```text id="3ewy6y"
.gitignore
AGENTS.md
BUILD.md
CHANGELOG.md
DEVOPS.md
LICENSE
PROJECT.md
README.md
TECHNICAL.md
.opencode/commands/
.opencode/config/opencode.json
.opencode/skills/
openspec/AGENTS.md
openspec/config.yaml
openspec/changes/
openspec/specs/
output/
reports/
```

Ces éléments ne constituent pas nécessairement une source de vérité fonctionnelle.

Leur modification nécessite une demande ou validation explicite concernant, selon le cas :

* OpenCode ;
* OpenSpec ;
* Git ;
* la production de rapports techniques.

`output/` et `reports/` :

* PEUVENT être lus ;
* NE DOIVENT PAS être considérés comme source de vérité ;
* NE DOIVENT PAS être versionnés dans Git ;
* NE DOIVENT être créés, modifiés ou supprimés que pour une demande explicite.

## 10. Secrets

L'agent NE DOIT PAS :

* ouvrir un fichier sensible ;
* transmettre un secret au modèle ;
* analyser un secret ;
* indexer un secret ;
* ajouter un secret à Git ;
* afficher un secret dans les journaux ou sorties.

Les données sensibles comprennent notamment :

* mots de passe ;
* clés privées ;
* clés SSH ;
* jetons d'API ;
* certificats ;
* identifiants de connexion.

Pour un fichier sensible, l'agent PEUT uniquement signaler sa présence à partir de son nom ou chemin.

Les secrets DOIVENT rester hors des sources versionnées et accessibles aux agents.

Un emplacement local tel que `.opencode/share/` PEUT contenir des secrets uniquement s'il est exclu :

* de Git ;
* de la lecture par les agents ;
* de l'indexation.

## 11. Sécurité

L'agent DOIT privilégier :

* le principe du moindre privilège ;
* la validation des entrées ;
* la gestion explicite des erreurs ;
* des permissions minimales ;
* l'absence de données sensibles dans les journaux.

L'agent NE DOIT PAS supposer disposer d'un accès complet à la machine hôte.

Sans validation explicite, il NE DOIT PAS modifier :

* les montages Docker ;
* les volumes ;
* les utilisateurs du conteneur ;
* les droits d'accès du conteneur ;
* les permissions accordées au conteneur.

## 12. Git

Sans validation explicite du développeur, l'agent NE DOIT PAS :

* modifier `.git/` ;
* réécrire l'historique ;
* supprimer des commits ;
* effectuer un push ;
* modifier la configuration Git du dépôt ;
* créer, modifier ou supprimer des branches ;
* modifier les sous-modules ;
* créer ou modifier des hooks Git.

Les commits DOIVENT être atomiques.

Un commit DOIT correspondre à une modification clairement identifiable.

Un commit NE DOIT PAS mélanger des modifications indépendantes de type :

* correction ;
* refactoring ;
* évolution fonctionnelle ;
* documentation.

Avant toute proposition de commit, l'agent DOIT :

1. vérifier la syntaxe ;
2. examiner les fichiers modifiés ;
3. vérifier que seuls les fichiers attendus sont modifiés ;
4. vérifier qu'aucun secret n'a été ajouté ;
5. exécuter les vérifications disponibles ;
6. décrire clairement le contenu du commit.

## 13. Langages de programmation

### 13.1. Règles communes

Le code DOIT rester compatible avec les versions des langages, runtimes et dépendances supportées par le projet.

Les versions de référence DOIVENT être déterminées à partir des spécifications et des fichiers de configuration du projet, notamment `pyproject.toml`, `package.json` et `DEVOPS.md`.

La présence d'une version plus récente dans l'environnement de développement NE DOIT PAS conduire à relever implicitement la version minimale supportée.

Toute fonctionnalité nécessitant une version plus récente DOIT être justifiée et respecter les règles de validation applicables.

Quel que soit le langage, le code DOIT :

* respecter les conventions et l'architecture existantes ;
* valider les entrées aux frontières du système ;
* gérer explicitement les échecs attendus ;
* détecter, traiter ou propager les erreurs de manière explicite ;
* NE JAMAIS masquer silencieusement une erreur ;
* produire des diagnostics compréhensibles sans exposer de secret ;
* libérer les ressources utilisées, y compris en cas d'échec ;
* préserver les comportements existants non concernés.

Les vérifications DOIVENT utiliser les outils et configurations retenus par le projet.

L'ajout d'un outil, d'une dépendance ou d'un langage reste soumis aux règles applicables aux dépendances et aux choix techniques.

Une vérification syntaxique réussie NE suffit PAS à démontrer la validité fonctionnelle du code. Les tests applicables restent obligatoires.

Toute vérification indisponible, non exécutée ou échouée DOIT être signalée explicitement.

### 13.2. Bash et Shell

Les scripts DOIVENT rester compatibles avec la version de Bash fournie par les versions Debian supportées.

Les constructions POSIX DEVRAIENT être privilégiées lorsqu'elles permettent simplement le même résultat.

L'interpréteur déclaré par le shebang DOIT correspondre aux constructions utilisées. Un script déclaré pour `sh` NE DOIT PAS utiliser de constructions spécifiques à Bash.

Pour Bash, les vérifications minimales sont :

```bash
bash -n "<fichier>"
shellcheck "<fichier>"
```

Pour un script POSIX exécuté avec `sh`, la vérification syntaxique DOIT utiliser l'interpréteur cible :

```sh
sh -n "<fichier>"
shellcheck "<fichier>"
```

Les scripts DOIVENT :

* protéger les expansions de variables par des guillemets lorsque nécessaire ;
* préserver les arguments et les chemins contenant des espaces ou caractères spéciaux ;
* contrôler les codes de retour lorsque l'échec influence la suite du traitement ;
* traiter explicitement les échecs attendus ;
* retourner un code de sortie cohérent avec le résultat.

L'utilisation de `set -e` NE remplace PAS une gestion explicite des erreurs.

### 13.3. Python

Le code DOIT respecter la plage de versions Python déclarée dans `pyproject.toml` et les versions effectivement supportées par le projet.

Les commandes DOIVENT utiliser l'interpréteur et l'environnement Python retenus pour le projet.

La bibliothèque standard DEVRAIT être privilégiée lorsqu'elle répond simplement au besoin.

Le code Python DOIT :

* capturer des exceptions précises lorsque leur traitement est nécessaire ;
* préserver la cause d'origine lorsqu'une exception est transformée ;
* éviter les captures générales qui masquent les erreurs inattendues ;
* utiliser des gestionnaires de contexte lorsque adaptés à la libération des ressources ;
* éviter les arguments par défaut mutables ;
* éviter les effets de bord non nécessaires lors de l'import d'un module.

Les annotations de types DEVRAIENT être utilisées pour les nouveaux contrats publics et les interfaces dont elles améliorent la compréhension.

Pour chaque fichier Python modifié, la vérification syntaxique minimale est :

```bash
python3 -m py_compile "<fichier.py>"
```

Les tests applicables DOIVENT être exécutés avec le mécanisme retenu par le projet.

Les contrôles de style, d'analyse statique et de types DOIVENT être exécutés lorsqu'ils sont configurés pour le périmètre concerné.

Pour Django, les modifications DOIVENT également respecter les conventions du projet relatives aux modèles, migrations, transactions, contrôles et tests.

### 13.4. JavaScript et TypeScript

Le code DOIT rester compatible avec les versions de Node.js, les navigateurs cibles et les outils de construction supportés par le projet.

Le système de modules et les conventions JavaScript ou TypeScript existants DOIVENT être respectés.

Une conversion de JavaScript vers TypeScript, ou inversement, NE DOIT PAS être réalisée sans demande ou validation concernant cette conversion.

Le code DOIT :

* gérer les rejets des opérations asynchrones ;
* éviter les promesses abandonnées sans traitement explicite ;
* libérer les abonnements, écouteurs et temporisateurs lorsque nécessaire ;
* valider les données externes à l'exécution ;
* respecter les contrats API et les conventions des composants existants.

Les types TypeScript NE remplacent PAS la validation des données reçues à l'exécution.

En TypeScript, l'utilisation de `any` ou d'une suppression de diagnostic DOIT être limitée et justifiée.

Les vérifications minimales comprennent les tests et la construction applicables définis dans `package.json`.

Lorsqu'une application web nécessite des tests unitaires pour sa partie frontend, ces tests DOIVENT être exécutés dans les navigateurs web déclarés dans `DEVOPS.md`, en mode headless.

Pour le frontend Pixs actuel :

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

Les contrôles de lint et de types DOIVENT également être exécutés lorsqu'ils sont configurés.

Les modifications d'interface DOIVENT faire l'objet des vérifications navigateur applicables ; une construction réussie NE suffit PAS à valider le comportement visuel ou interactif.

### 13.5. SQL et PostgreSQL

Les requêtes et migrations DOIVENT rester compatibles avec les versions du serveur PostgreSQL supportées par le projet.

Les valeurs externes DOIVENT être transmises par des paramètres de requête. Elles NE DOIVENT PAS être concaténées dans du SQL.

Les identifiants SQL dynamiques DOIVENT utiliser les mécanismes adaptés du pilote ou de l'ORM.

Les modifications DOIVENT :

* respecter les contrats de données et les règles d'isolation du projet ;
* utiliser les transactions lorsque l'atomicité est nécessaire ;
* traiter explicitement les erreurs et les conflits attendus ;
* préserver les contraintes et l'intégrité des données ;
* documenter les impacts des migrations et leur stratégie de retour lorsque applicable.

L'ORM et les mécanismes de migration existants DEVRAIENT être privilégiés lorsqu'ils répondent au besoin.

Les vérifications DOIVENT utiliser les outils de migration et les tests applicables sur un environnement de test autorisé.

L'exécution d'un fichier SQL NE DOIT PAS être présentée comme une simple vérification syntaxique sans effets de bord.

### 13.6. HTML, CSS et autres langages

Les modifications HTML et CSS DOIVENT respecter les navigateurs cibles, les conventions de composants, les thèmes, l'accessibilité et le comportement responsive du projet.

Elles DOIVENT être vérifiées avec la construction et les contrôles navigateur applicables.

Pour tout autre langage présent dans le périmètre, l'agent DOIT identifier :

* les versions supportées ;
* les conventions existantes ;
* les outils de vérification configurés ;
* les tests applicables.

Il DOIT appliquer les règles communes de cette section et signaler toute absence de mécanisme de validation.

## 14. Variables

Les variables de configuration DOIVENT rester cohérentes avec les spécifications.

Les noms existants suffisamment explicites DOIVENT être conservés.

Les renommages purement esthétiques sont interdits.

Les valeurs codées en dur DOIVENT être évitées lorsque cela est raisonnable.

Une variable existante DOIT être réutilisée lorsqu'elle répond déjà au besoin.

Toute nouvelle variable de configuration DOIT être documentée dans OpenSpec.

Conventions :

* globale : `MAJUSCULE`
* locale : `minuscule`
* séparateur : `_`
* nouvelles variables : anglais

Pour toutes les spécifications techniques générales, se référer au fichier TECHNICAL.md.

## 15. Chemins, compatibilité et portabilité

L'agent DOIT privilégier les chemins relatifs au projet lorsqu'ils préservent la portabilité.

Les chemins absolus DEVRAIENT être utilisés uniquement lorsqu'ils sont imposés par le projet.

Toute modification DOIT préserver la compatibilité avec :

* les installations existantes ;
* les versions stables de Debian supportées.

Toute incompatibilité DOIT être explicitement signalée et spécifiée.

Toute dépendance spécifique à une distribution ou version DOIT être documentée.

## 16. Idempotence

Les scripts d'installation DEVRAIENT être idempotents lorsque raisonnablement possible.

Une nouvelle exécution NE DOIT PAS provoquer d'effets de bord inattendus.

## 17. Dépendances

L'agent DEVRAIT privilégier les outils disponibles dans une installation Debian standard.

Une dépendance existante DOIT être réutilisée lorsqu'elle répond au besoin.

Toute nouvelle dépendance nécessite :

* une justification ;
* une validation explicite du développeur ;
* une documentation.

## 18. Conventions et style

L'agent DOIT respecter les conventions existantes :

* nommage ;
* organisation ;
* formatage ;
* architecture.

Une convention existante NE DOIT PAS être modifiée sans validation explicite.

En cas d'ambiguïté, l'agent DOIT privilégier la cohérence avec le code existant.

Il DEVRAIT privilégier :

* les fonctions courtes ;
* les noms explicites ;
* une indentation homogène ;
* les commentaires utiles ;
* les traitements simples ;
* le principe KISS.

La simplicité prévaut sur l'optimisation prématurée.

Les commentaires existants DOIVENT être conservés lorsqu'ils restent exacts.

Un nouveau commentaire DOIT apporter une information utile et ne pas simplement répéter le code.

L'agent NE DOIT PAS introduire `TODO`, `FIXME` ou `HACK` sans validation explicite.

Un travail incomplet DEVRAIT être représenté dans OpenSpec plutôt que laissé sous forme de marqueur dans le code.

## 19. Documentation, encodage et licences

Toute évolution importante DOIT mettre à jour, lorsque nécessaire :

* les spécifications ;
* la documentation ;
* les commentaires concernés.

La documentation sans rapport avec la demande NE DOIT PAS être modifiée.

Tous les fichiers texte DOIVENT utiliser :

* UTF-8 ;
* fins de ligne Unix LF.

Les fins de ligne CRLF NE DOIVENT PAS être introduites.

Les en-têtes de licence existants DOIVENT être conservés.

Aucune licence NE DOIT être modifiée sans validation explicite.

## 20. Messages et robustesse

Les messages des scripts DOIVENT être :

* explicites ;
* cohérents ;
* utiles au suivi ;
* utiles au diagnostic.

Ils NE DOIVENT PAS :

* masquer un échec ;
* ignorer silencieusement une erreur ;
* exposer des données sensibles ;
* modifier le comportement fonctionnel attendu.

Le code DEVRAIT privilégier :

* une gestion explicite des erreurs ;
* des messages d'erreur compréhensibles ;
* des codes de retour explicites ;
* la validation des entrées ;
* l'idempotence lorsque pertinente.

## 21. Tests et validation finale

Lorsqu'un mécanisme de test existe, l'agent DOIT exécuter les tests applicables avant de déclarer le travail valide.

Avant de déclarer une modification valide, l'agent DOIT vérifier :

* la syntaxe ;
* l'absence d'erreur évidente ;
* la cohérence des fichiers modifiés ;
* la conformité avec OpenSpec ;
* l'absence de modification hors périmètre.

L'agent NE DOIT JAMAIS déclarer qu'un test ou une vérification a réussi s'il ne l'a pas réellement exécuté avec succès.
