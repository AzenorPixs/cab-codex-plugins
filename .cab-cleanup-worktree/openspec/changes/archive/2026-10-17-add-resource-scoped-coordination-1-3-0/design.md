# Conception CAB 1.3.0

## Contexte

Voir `proposal.md` pour l'objectif et le statut de validation. Les sources de référence annoncent principalement 1.2.1 ; un change actif prépare des statistiques 1.2.2. Le registre courant lit les schémas 1/2/3 et conserve changes, générations, demandes et reçus. `checkConflicts` refuse les recouvrements dès la réservation. `covers`, les routes d'intégration et le statut suspendent ensuite les pairs ou exigent la référence commune courante.

Le profil qualifié conserve un processus OpenCode, un broker MCP stdio, un contrôleur, un superviseur, plusieurs sessions et un répertoire commun. Le présent dossier prépare des contrats ; il n'appelle aucun service actif.

## Objectifs et limites

La coordination protège les accès et la validité des preuves au plus petit périmètre utile. Les fichiers, répertoires, capacités, contrats, bases de test, ports, sorties de construction et références Git peuvent constituer des ressources. Les dépendances sémantiques restent examinées par l'orchestrateur.

Les verrous sont coopératifs et contrôlés aux frontières CAB/OpenCode prises en charge. Ils ne constituent pas une protection du système de fichiers contre un programme externe. Un outil mutable sans contrôle natif ne peut participer à ce profil. Les accès externes exigent un périmètre déclaré et une coordination ; une dérive détectée invalide les preuves concernées.

L'acquisition d'un ensemble de verrous est atomique ; les écritures multifichiers ne deviennent pas transactionnelles. Une opération interrompue conserve ses protections et ses effets à réconcilier. Aucune nouvelle dépendance tierce, aucun worktree obligatoire et aucun service supplémentaire ne sont proposés.

## Décisions

### 1. Séparer réservation, périmètre et accès actif

La réservation longue continue de protéger `changeId`, `selectionKey`, propriétaire, RUN, session et génération. Le manifeste de périmètre déclare ce que le RUN pourra utiliser ; deux manifests peuvent mentionner la même ressource sans bloquer l'admission des changes si leurs dépendances le permettent. L'accès effectif aux ressources partagées dépend des verrous temporaires.

Un fichier est partagé par défaut. L'optimisation sans verrou temporaire n'est disponible que si le registre prouve une propriété exclusive, sans recouvrement de lecteur, écrivain, répertoire parent ni déclaration incertaine. L'exclusivité est vérifiée avant tout effet même sans appel séparé d'acquisition.

Si un nouveau RUN déclare ce fichier, le registre marque sa promotion en cours, ferme l'admission des nouvelles opérations exclusives sur ce périmètre, attend seulement les opérations concernées puis établit le mode partagé. Le nouveau RUN n'accède pas au fichier avant cette transition. L'arrivée d'une lecture de répertoire couvrant plusieurs fichiers suit la même règle. Aucun RUN indépendant ne draine.

L'alternative consistant à calculer seulement l'intersection des fichiers actuellement demandés est écartée : elle laisse une course avec un accès exclusif déjà commencé. L'alternative consistant à verrouiller temporairement tous les fichiers reste correcte, mais ne satisfait pas l'optimisation demandée pour les fichiers privés.

### 2. Acquérir un ensemble entier et ordonner les conflits

Une demande décrit `operationId`, RUN, contexte, génération, identité de session, manifeste canonique, empreinte du contenu et révisions attendues. Le registre décide en une transaction durable : ensemble attribué ou demande en attente sans aucun verrou partiel. Le jeton d'acquisition et sa génération sont uniques et ne redeviennent jamais valides après libération.

Deux lectures sont compatibles ; toute écriture exclut lectures et écritures qui recouvrent sa ressource. Un répertoire couvre les descendants, y compris ceux créés pendant une opération ; les créations, suppressions et déplacements déclarent leurs parents et cibles utiles. La canonisation existante est conservée et les alias physiques doivent être refusés ou ramenés à une même identité, notamment les liens matériels.

La file est persistante et FIFO entre demandes incompatibles. Une demande indépendante peut dépasser une demande bloquée. Un lecteur ne dépasse pas un écrivain antérieur incompatible, afin d'éviter la famine. Une acquisition atomique refusée ne conserve rien ; un détenteur ne peut étendre son ensemble ni convertir une lecture en écriture en attendant un autre verrou. Il termine/libère, puis redemande l'ensemble complet, ou déclare cet ensemble avant le début du groupe cohérent.

Le verrou interne du registre sérialise brièvement les métadonnées. Il n'est ni une exclusion métier globale ni une suspension des RUN.

### 3. Lier décision, préparation et permission native

Le contenu de l'opération, son manifeste et ses révisions de préparation sont approuvés explicitement. L'attente d'une décision humaine ne doit pas conserver inutilement des verrous d'écriture. Après décision et juste avant l'effet, l'orchestrateur demande l'acquisition ; le contrôleur recontrôle identité, manifeste, révisions, jeton, admission et règles natives avant de transmettre `once`.

Si la base a changé, l'opération approuvée ne devient plus exécutable : relire sous protection, préparer un nouveau contenu et demander une nouvelle décision. L'ancienne décision terminale reste intacte et n'est ni transformée ni réutilisée. Les lectures de préparation peuvent utiliser un verrou court, libéré avant attente humaine ; leurs révisions sont conservées.

Une permission arrivant avant l'acquisition reste non consommée. Une seule édition reste limitée à un fichier ; un groupe de modifications peut conserver un ensemble de verrous annoncé à l'avance, mais chaque édition ou commande exige son propre mandat et `once`. Les identités des sous-opérations sont enregistrées. Aucun mandat hors manifeste n'est admis dans le groupe.

Les lectures natives sans permission restent sans approbation artificielle ; lorsqu'elles servent de preuve stable ou fondent une édition, leur périmètre et leurs révisions passent par le protocole de lecture. Des lectures d'observation explicitement non stables ne prouvent pas une validation.

### 4. Terminer et libérer à une frontière prouvée

Une acquisition devient `HELD`, puis `EXECUTING`, puis `RELEASED` lorsque les sous-opérations sont terminées et leurs effets connus. `RECONCILED` permet une frontière intermédiaire explicitement examinée, sans effet inconnu, en annulant les sous-opérations non commencées ; cette issue ne publie pas le change. `UNKNOWN` conserve les protections après rupture SSE, crash ou réponse ambiguë jusqu'à vérification native et examen des preuves. Un refus prouvé sans permission ni effet peut libérer sans écriture. Un état `idle`, un silence, un timeout, un heartbeat perdu ou l'expiration de l'approbation ne suffisent pas.

La fin d'une écriture et les nouvelles révisions sont persistées avec la libération correspondante. Une écriture dont le résultat fonctionnel est un échec peut néanmoins avoir modifié les fichiers : ces effets sont enregistrés avant libération. Pour un groupe cohérent, les lecteurs incompatibles restent exclus jusqu'à la frontière validée ; une publication CAB n'est pas le seul moment où les octets changent dans le répertoire commun.

Après redémarrage, un ancien jeton est conservé comme historique mais ne permet pas une nouvelle permission. Les protections restent détenues pendant réconciliation ; une reprise reçoit une identité neuve seulement après preuve de la frontière. Les reçus identiques sont restitués sans rejouer le travail.

### 5. Révisions et validations limitées aux ressources

Conserver une séquence globale de registre et `referenceVersion` comme ordre de publication observable, sans condition d'admission générale. Ajouter des révisions par ressource et des traces de dépendances des preuves. Toute écriture avance les versions des ressources concernées et les générations de sous-arbre nécessaires à l'invalidation des lectures de répertoire ; une création ne doit pas échapper à un manifeste de lecture antérieur.

Une validation enregistre les ensembles de lecture/écriture, leurs révisions, les dépendances sémantiques déclarées et les références de preuves examinées. Des ressources distinctes ne dispensent pas d'examiner un contrat partagé. Un changement extérieur connu est signalé par vérification des empreintes à la frontière pertinente ; CAB ne lit pas les contenus du projet à la place de l'orchestrateur et les secrets restent exclus.

Pour `openspec validate --all --strict`, protéger en lecture les entrées OpenSpec effectives, dont configuration, specs et changes nécessaires. Les écritures de specs incompatibles attendent ; une édition indépendante de code continue. Les effets runtime éventuels de l'outil sont déclarés séparément. Le nom « global » d'un contrôle ne déclenche jamais la barrière globale CAB.

Une suite de tests peut protéger plusieurs répertoires en lecture et une base ou des sorties en écriture. Son périmètre peut être large ; l'attente reste attribuée aux conflits de ressources, sans exiger que tous les RUN deviennent `ready`. Les preuves sont associées à l'état combiné effectivement lu, sans assimiler celui-ci à une livraison de tous les changes.

### 6. Publication, synchronisation, archivage et rapport

Le RUN prépare ses validations, puis acquiert le périmètre nécessaire à sa publication. Si les protections ont été libérées entre validation et publication, il réacquiert et compare toutes les révisions couvertes par les preuves ; une divergence impose le réexamen des seules validations affectées. Il peut maintenir le même ensemble pendant un groupe court de validation/publication cohérent. Les opérations longues préparent leur travail avant acquisition.

Une synchronisation ou un archivage OpenSpec annonce sources, destinations, capacités partagées et parents nécessaires à la création ou au déplacement. Les autorisations OpenSpec restent distinctes. Ces opérations peuvent attendre sur OpenSpec sans arrêter les autres travaux.

Une publication enregistre atomiquement reçu, révisions vérifiées, séquence de publication, génération du RUN, passage éventuel en REPORT et fin des protections du groupe. Le reçu atteste la transition technique ; les effets natifs et leur qualité sont prouvés séparément. Un autre RUN ne réconcilie que ses ressources ou dépendances affectées. Le rapport reste limité au `STATISTIQUES.md` de sa propre archive et obligatoire avant gate/livraison.

Les opérations Git, si elles sont autorisées séparément, utilisent des ressources logiques pour l'index et la référence publiée, ainsi que les chemins nécessaires. Sérialiser l'index ne suspend pas les éditions de fichiers indépendants. Le contenu préparé doit exclure toute modification étrangère ; aucune commande Git n'est exécutée par ce dossier.

### 7. Exclusion globale exceptionnelle

Les seules causes admises sont `GLOBAL_RECONCILIATION`, `SHARED_MAINTENANCE`, `GLOBAL_PAUSE` et `GLOBAL_STOP`. Une réconciliation locale de révisions ou une récupération isolée ne deviennent pas une réconciliation globale. Une pause/arrêt sans cible globale explicite ne vise que le RUN demandé.

La demande persistée porte identité, cause, portée, référence d'autorisation et preuves. États : `DRAINING`, `HELD`, puis `RELEASED` ; une pause/arrêt maintient le gel jusqu'à reprise ou clôture explicite. Dès le drainage, aucune nouvelle opération native n'est admise dans la portée ; les opérations déjà autorisées atteignent leur frontière sûre, sans nouvelle sous-opération du groupe. Les effets incertains conservent leurs protections.

Le gel est confirmé après contrôle natif de toutes les sessions concernées, sans approbation implicite ni abandon de job. Une divergence d'intégrité commune peut déclencher une suspension conservatoire avec cause `GLOBAL_RECONCILIATION` ; elle ne lance ni réparation ni purge automatique. Un incident dont la portée est connue reste ciblé. L'absence de manifeste d'une commande ordinaire la fait refuser, sans acquisition automatique de `project:*` ni gel général.

La maintenance et la migration préservent les RUN, jobs, candidates, permissions consommées et reçus. La purge continue de refuser toute réservation active ou état invalide. Une demande d'arrêt ne prouve jamais une livraison ni un gate TERMINÉ. OpenCode n'est ni fermé ni redémarré sans demande explicite distincte.

### 8. Interfaces proposées

Les routes sont HTTP local, sans serveur MCP réseau supplémentaire. Toutes les mutations vérifient propriétaire, génération, contexte et idempotence.

| Interface | Contrat proposé |
|---|---|
| `POST /runs/reserve`, `/extend`, `/resources` | Réserver le change et déclarer/faire évoluer la portée ; exposition exclusive/partagée et promotion sûre |
| `POST /runs/<runId>/locks/acquire` | `operationId`, `version`, `resources`, `expectedRevisions`, `operationDigest` ; ensemble attribué ou attente sans attribution partielle |
| `GET /runs/<runId>/locks` | Acquisitions et demandes du RUN, état, propriétaires bloquants, cause et révisions autorisées |
| `POST /runs/<runId>/locks/release` | Jeton, génération, identités d'opérations et preuves de fin ; met à jour les révisions avec la libération |
| `POST /runs/<runId>/locks/attach` | Rattacher une correction approuvée au groupe sans étendre ses ressources |
| `POST /runs/<runId>/locks/reconcile` | Frontière native prouvée après restauration, jeton/fencing neufs sans libération des fichiers |
| `POST /runs/<runId>/locks/cancel` | Annuler une demande encore en attente ; ne libère aucun effet commencé |
| `POST /runs/<runId>/publish` | Transaction, jeton/génération, révisions des preuves, evidence et cible REPORT éventuelle ; reçu durable |
| `POST /runs/<runId>/reconcile` | Révisions et preuves sur ressources affectées uniquement ; aucun drainage des pairs indépendants |
| `POST /coordination/global/request` | Cause exceptionnelle, portée globale, autorisation, transaction ; ferme durablement l'admission |
| `GET /coordination/global` | État du gel et obstacles sans contenu sensible |
| `POST /coordination/global/release` | Preuves et génération ; reprise explicite autorisée, jamais un timeout |
| `GET /status`, `/runs/<runId>/status`, `/runs` | Capacités, protocole, attentes de ressource, exclusions exceptionnelles et santé commune distingués |

`request_validation` et la décision transportent `operation_id`, `operation_digest` et `expected_revisions`, avec les champs historiques. Le jeton acquis est corrélé à cette identité avant `once` ; son acquisition ne décide aucune approbation. Les limites de taille et la validation des manifests sont conservées et étendues aux nouveaux champs.

Les lectures de statut et les consultations statistiques restent ponctuelles et sans acquisition de verrou métier. La commande `/cab` expose la cible RUN ou globale de pause/arrêt de manière explicite ; `--all` est la seule cible globale proposée. L'arrêt partagé conserve les gates existants, sauf procédure exceptionnelle explicitement autorisée et réconciliée, sans prétendre à une livraison.

### 9. Toutes les briques et distribution 1.3.0

La réalisation isole le nouveau registre dans `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs`, dérivé du lecteur historique RunRegistry. Ce module porte les accès et transitions 1.3.0 ; le contrôleur distribué l'utilise. Le lecteur historique reste qualifié sur ses formats et sert à leur migration, sans exposer ses anciennes acquisitions globales dans le nouveau profil. Les tests nouveaux sont `tests/resource-coordination.test.mjs` et les scénarios HTTP ciblés du contrôleur.

| Brique / sources | Travail prévu et contrôle |
|---|---|
| `src/cgpt_approval_bridge_server.py`, `cgpt_approval_bridge_router.py`, `cgpt_approval_bridge_journal.py` | Métadonnées d'opération, persistance/corrélation, readiness et refus des contrats incomplets ; tests Python |
| `cgpt-approval-bridge-controller.mjs`, `cgpt-approval-bridge-job-context.mjs` | Routes, admission, jeton avant once, fin native, gate et publication ciblée ; tests HTTP/native simulés |
| `cgpt-approval-bridge-runs.mjs`, `cgpt-approval-bridge-registry-lock.py` | Registre schéma 4, périmètres, promotions, files de conflits, révisions, reçus et gel exceptionnel ; tests atomiques/reprise |
| `cgpt-approval-bridge-supervisor.mjs`, `cgpt-approval-bridge-supervisor-context.mjs` | Attentes légitimes sans relances métier, pause/arrêt ciblés, reprise corrélée ; tests multi-RUN |
| `cgpt-approval-bridge-opencode-sse-client.mjs`, `cgpt-approval-bridge-healthcheck.mjs` | Événements de fin et lacunes, diagnostics ciblés, aucune remédiation générale implicite |
| `cgpt-approval-bridge-statistics.mjs` et modules/importeurs statistiques livrés en 1.2.2 | Mesures par conflit et exception ; préserver fenêtres, imports, limites et confidentialité effectivement livrés |
| `cgpt-approval-bridge-reset.py` | Comprendre le schéma et les protections nouvelles ; préserver tous les refus de purge |
| `cgpt-approval-bridge-prompts.py` | Modèle 1.3.0 cohérent, inventaire/diff avant propagation explicitement autorisée |
| `.codex/commands/cab.md`, skills `approval-bridge` et `coding-session-statistics`, références et métadonnées | Protocole ciblé, consultations, exemples et frontières d'autorisation |
| Manifeste plugin, catalogue marketplace, `pyproject.toml`, unités systemd | Base 1.3.0, cachebuster neuf, paquet complet ; un artefact sans version propre reste rattaché explicitement à la release |
| `PROJECT.md`, `TECHNICAL.md`, `BUILD.md`, `README.md`, `CHANGELOG.md`, `ORCHESTRATED_CODING.md` | Architecture, API, migration et preuve de version ; `DEVOPS.md` ne change que si son inventaire doit réellement être régénéré |
| Tests Python/Node et validations de distribution | Matrice de concurrence, anciens contrats refusés sans effet, cohérence de version et sécurité native |

Tous les composants qui annoncent une version de projet passent à 1.3.0 ; les fichiers de support sans version ne reçoivent pas artificiellement un nouveau format de version. Le plugin peut porter `1.3.0+codex.<cachebuster-neuf>`. Versions de produit, schémas de données et protocole MCP sont distincts ; MCP reste `2024-11-05` si aucun changement de transport ne le requiert.

La préparation source ne propage rien dans les autres projets ni les profils/cache installés. Lors d'un déploiement autorisé, inventorier les huit projets déjà couverts, adapter seulement les prompts pilotés et protocoles concernés, préserver CISM/CAISM et prompts directs, comparer empreintes et versions. Aucun protocole consommateur ancien n'est admis silencieusement dans le nouveau profil.

### 10. Compatibilité, migration et retour arrière

Le registre schéma 4 porte acquisitions, demandes, révisions, opérations, protections exclusives, promotions, reçus et gel exceptionnel. Les nouveaux champs d'approbation utilisent le magasin extensible schéma 2 du broker, dont les lectures/écritures préservent ces champs. La négociation de capacité et leur corrélation stricte empêchent un jeu ancien de les omettre avant permission. Cette réalisation évite une conversion de stockage inutile ; le journal conserve également son format extensible. Les nouvelles lectures doivent être testées sur tous les formats antérieurs réellement supportés.

Les nouveaux composants négocient `coordinationProtocol=resource-scoped-v1` et exposent leurs capacités. Un jeu mixte, un ancien broker qui supprime ces champs ou un protocole client incomplet refusent les mandats mutables avant permission. Les routes historiques de consultation restent disponibles. Les anciennes acquisitions globales d'intégration reçoivent un refus explicite `coordination-upgrade-required` dans ce profil ; elles ne sont ni réinterprétées silencieusement ni autorisées à restaurer un gel ordinaire.

La migration conserve les RUN en PAUSE et bloque le métier par maintenancePreflightRequired. Après vérifications de transport en lecture, lever explicitement le gel pour le prévol du seul RUN cible en gardant les pairs en pause ; seule la commande exacte /usr/bin/true, son manifeste read, une once acquittée et exit 0 prouvé permettent de lever cette garde après libération. Aucun effet natif ordinaire n’est admis pendant HELD. Le retour arrière est accessible par /coordination/rollback avant nouvel usage et sous les mêmes contrôles de quiescence.

La migration est une maintenance explicite : fermer les admissions, atteindre la quiescence réelle, préserver une sauvegarde privée réversible, qualifier le jeu complet, convertir les réservations sans supposer leurs ressources déjà libres, puis contrôler identités, prévol natif, MCP/SSE/readiness et checkpoints avant reprise. Les anciennes demandes consommées ne sont jamais rejouées. Les réservations historiques restent conservatrices jusqu'à examen explicite de leurs périmètres. Aucune migration à chaud automatique.

Avant usage du nouveau schéma, le retour au jeu précédent peut restaurer l'état de maintenance intact selon preuve. Après de nouvelles opérations 1.3.0, un retour exige une réconciliation explicite et une conversion prouvée : jamais charger un schéma 4 avec un ancien binaire, supprimer les verrous ou restaurer une sauvegarde qui oublierait des effets récents.

Le développeur a explicitement autorisé l'intégration des fonctions et de la clôture du change statistiques au présent cycle 1.3.0. Les deux changes conservent leur dossier et leur rapport d'archive distincts ; aucune surveillance n'est réactivée. Les obligations de version 1.2.1/1.2.2 sont reformulées comme garanties historiques conservées ou alignées sur 1.3.0 lors de la synchronisation autorisée.

## Risques et arbitrages

- Manifeste incomplet ou dépendance sémantique omise → refus des effets indéterminés, revue du manifeste, ressources de contrat et contrôle des empreintes.
- Verrou oublié après crash → conservation durable et réconciliation ciblée ; aucune expiration libératrice.
- Écriture partielle multifichier → groupe protégé jusqu'à frontière cohérente, preuves et corrections explicitement autorisées.
- Validation périmée entre contrôle et publication → conservation des protections ou réacquisition avec comparaison des révisions, y compris les sous-arbres.
- Verrou trop large → manifeste expliqué et mesures de contention, sans transformer un conflit large en exclusion globale CAB.
- Ancien client ou déploiement mixte → négociation de capacité et refus avant permission ; migration sous maintenance explicite.
- Temps de verrou élevé pendant une décision → préparation hors verrou d'écriture, acquisition tardive et nouveau mandat si base changée.

## Validation et critères d'acceptation

Les tests utilisent répertoires temporaires et services simulés. Une qualification native ultérieure doit être explicitement autorisée et réalisée hors des RUN actifs.

1. A et B écrivent des fichiers indépendants simultanément ; aucun `/ready` de cohorte n'est requis.
2. Deux écritures sur le même fichier se succèdent ; le second RUN relit et fait réapprouver un contenu devenu périmé.
3. Deux lectures coexistent ; un écrivain antérieur ne subit pas une famine causée par de nouveaux lecteurs.
4. Une demande sur deux fichiers n'en obtient aucun si un seul est bloqué ; une troisième demande indépendante avance.
5. Un fichier exclusif passe en partagé sans chevauchement avec une opération déjà commencée ; une lecture de son parent produit le même résultat sûr.
6. Validation OpenSpec en lecture et édition de code indépendante coexistent ; une écriture OpenSpec incompatible attend.
7. Une publication indépendante ne suspend aucun pair et n'invalide aucune preuve sans dépendance ; une mutation de sous-arbre invalide la validation concernée.
8. Crash avant/après persistance, fin SSE perdue, timeout, refus, mauvais jeton, génération périmée et reçu répété/divergent ne produisent ni double permission ni libération incertaine.
9. Une pause/arrêt ciblés préservent les autres RUN ; les quatre causes exceptionnelles globales drainent la portée sans purge ni fausse livraison.
10. Statistiques, rapport à six sections, gates, versions de toutes les briques, migration et refus des anciens contrats sont vérifiés ; syntaxe, suites Python/Node et OpenSpec strict sont exécutés avec résultats réels.

## Référence native vérifiée

La corrélation utilise callID et la fin postérieure à l'émission de once. Le début d'un outil peut précéder l'attente de permission : il ne constitue pas une preuve d'effet commencé après once. Cette distinction a été recoupée dans le [processeur officiel OpenCode v1.19.2](https://raw.githubusercontent.com/anomalyco/opencode/v1.19.2/packages/opencode/src/session/processor.ts), puis vérifiée par un scénario HTTP avec callID correct/incorrect et début antérieur à ask. Aucun serveur OpenCode actif n'a été consulté.

## Écart de qualification et correction

Trois anciennes fixtures de controller-configuration.test.mjs utilisaient /home/devops/datas/cab comme workspace de serveur malgré leurs transports et processus Codex/OpenCode simulés. Leur isolation a été corrigée vers leurs répertoires temporaires. Des fichiers techniques du runtime CAB ont pu être écrits par ces fixtures ; aucun nettoyage ni restauration de ce runtime n'est réalisé, son état initial n'étant pas prouvé. Les appels natifs étaient dirigés vers les serveurs simulés, sans intervention sur les RUN actifs. Cet écart est conservé dans les rapports, sans prétendre à une absence totale d'écriture runtime pendant la qualification.

Les régressions ont également rappelé la compatibilité historique sans job/RUN : elle est conservée, avec trace durable de sessions/racines et clôture explicitement réconciliée avant admission Multi-RUN. Le profil coordonné reste entièrement fondé sur ses accès par ressources.
