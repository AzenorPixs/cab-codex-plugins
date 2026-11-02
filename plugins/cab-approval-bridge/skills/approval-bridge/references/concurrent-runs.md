# CAB 1.10.4 — coordination atomique par ressource

## Restitution ciblée d’un bail — évolution 2.2.3

La restitution ordinaire examine les opérations liées au bail et les accès
qui recouvrent ses ressources. Après cleanup et vérification natifs distincts
et réussis, un accès disjoint du même RUN ne retient plus le bail nettoyé.
Une opération encore incertaine liée au bail, ou un accès recouvrant actif,
reste bloquant pour cette restitution. Le port d’un shell quarantiné distinct
garde intégralement son accès, son opération et sa once. Cette règle ne
dispense ni des preuves de nettoyage ni des contrôles de propriétaire et de
fencing ; elle ne s’applique pas à une libération sans effet non prouvée.

Ce profil est la référence du pilotage concurrent. Les anciens blocs techniques
copiés dans les prompts ne font plus autorité. Les barrières ordinaires `/ready`,
`/integration` et `/reconcile` issues de ces blocs ne sont pas utilisées à leur
place : appliquer les accès, révisions, reçus et publications par ressources
ci-dessous. Une migration historique suit uniquement la procédure de compatibilité
prouvée ; elle ne réactive aucune permission consommée.

Un processus OpenCode, un broker MCP stdio, un contrôleur et un superviseur servent plusieurs RUN dans un répertoire commun. Chaque RUN conserve session, job, décisions, preuves et checkpoint. Le contrat courant est `resource-scoped-v1` ; l'ancienne barrière ordinaire d'intégration n'est plus admise.

## Réservation et périmètre

Consulter GET /runs et les sources du projet dans l’ordre d’`AGENTS.md`, avec `DEVELOPMENT_MAP.md` après `DEVOPS.md` et avant OpenSpec, avant sélection. Réserver exclusivement change et intention avant préparation par POST /runs/reserve : runId, ownerId, sessionId, directory, changeId, selectionKey, resources et dependsOn. Un RUN traite un change réservé à la fois ; les sous-jobs héritent du parent. Chaque change suivant emploie session, jobId et génération neufs.

Les ressources déclarent la portée autorisée ; leur recouvrement ne bloque plus la réservation des changes compatibles. Examiner les dépendances sémantiques : fichiers distincts ne prouvent pas l'indépendance d'un contrat. Les clés file: sont relatives et canoniques ; un répertoire couvre ses descendants. Les ressources logiques couvrent contrats, bases, ports, sorties et index/références Git distinctement autorisés. Les alias physiques connus sont refusés.

Après redémarrage, un lease restauré `HELD` peut imposer une réconciliation pour
son propre accès sans interdire les admissions de mandat disjointes du même
RUN. Le contrôleur corrèle `request_validation` reçu pendant le wrapper Code
Mode `execute` seulement si l’appel natif unique est déjà `running`, exact et
non tronqué. La décision et l’acquisition restent ensuite distinctes ; un
recouvrement attend et ne libère jamais un effet inconnu.

Le registre conserve également les leases actifs si plusieurs accès restaurés
se recouvrent ou appartiennent au même RUN. Tous restent protégés contre la
réutilisation d'une permission `once`. Un nouvel accès recouvrant attend leur
réconciliation ; un accès disjoint peut avancer. Ne pas supprimer, fusionner
ou annuler automatiquement ces leases pour faire démarrer le contrôleur.

Un fichier est partagé par défaut. exclusiveResources, sous-ensemble explicite de fichiers du manifeste, demande l'optimisation privée. CAB la vérifie avant effet. L'arrivée d'un accès recouvrant ferme cette admission exclusive ; le pair attend les effets concernés avant accès partagé, sans drainer les RUN indépendants.

/extend et /resources contrôlent génération, portée et frontière sûre. Une réduction ne libère aucun effet inconnu ni obligation de publication. Le checkpoint reste output/<prompt>/<run_id>/state.json ; la reprise historique conserve preuves et propriété sans écraser un pair.

Après STOP et libération réconciliée, le même propriétaire peut réserver de nouveau le RUN. La réservation close ABANDONED ou DELIVERED et sa suspension restent dans l'historique ; la nouvelle génération et son contexte n'héritent pas du STOP. Une réservation encore RESERVED en PAUSE ou STOP, un gel global, un propriétaire divergent ou un change déjà livré restent bloquants. Aucune décision consommée ni permission native n'est transférée.

## Préparation, décision et accès

1. Déclarer entrées, écritures et ressources logiques exactes. Une commande sans manifeste exploitable est refusée ; CAB ne devine pas ses effets et ne réserve pas automatiquement project:*.
2. Lire GET /runs/<runId>/locks pour les révisions. Une lecture stable acquiert brièvement son ensemble en lecture, lit puis libère ; une observation non stable ne prouve pas une validation.
3. Préparer le contenu exact. request_validation conserve ses champs et ajoute coordination_protocol=resource-scoped-v1, run_id, reservation_version, operation_id, operation_digest, resources et expected_revisions. Une édition exige un fichier unique couvert en écriture ; une commande décrit son manifeste complet. L'empreinte représente le contenu examiné par l'orchestrateur.
Si `request_validation` est relayé par un wrapper CodeMode qui a terminé en erreur après admission durable, CAB peut corréler la notification uniquement si le normaliseur atteste l'appel natif unique exact et `nativeMcpError`. Cette corrélation n'est ni une décision ni une permission ; une demande déjà `NOT_ADMITTED` reste terminale et exige un requestId neuf.
4. Attendre la décision explicite sans garder inutilement une écriture exclusive. Une base modifiée impose relecture, nouveau contenu et nouvelle demande ; aucune décision terminale n'est remplacée.
5. Après approbation, acquérir l'ensemble juste avant effet. Un fichier privé prouvé peut utiliser l'admission exclusive interne sans appel séparé de verrou partagé.
6. Garder les règles natives ask. CAB recontrôle identité, révisions et protection avant une unique permission once. Ni réservation, ni acquisition, ni readiness ne constitue une approbation.

POST /runs/<runId>/locks/acquire reçoit version, operationId, operationDigest (SHA-256 hexadécimal), resources et expectedRevisions. Il retourne HELD avec token/fencing, ou HTTP 202 WAITING sans acquisition partielle. Une réémission identique expose l'état courant ; un contenu divergent est refusé. Une base changée pendant l'attente produit STALE sans effet : annuler et préparer une opération neuve.

Les lectures coexistent ; toute écriture exclut les accès recouvrants. La FIFO s'applique entre demandes incompatibles ; une demande indépendante avance et de nouveaux lecteurs ne dépassent pas un écrivain antérieur. Un détenteur n'attend jamais l'extension/conversion de son ensemble : terminer/libérer puis demander l'ensemble complet.

Pour un groupe cohérent, annoncer les sous-opérations, leur access_id commun et operationIds à l'acquisition. Chaque édition/commande garde sa décision et once. Après un effet connu, /locks/attach peut rattacher une correction nouvellement approuvée dans le même ensemble détenu, sans ressource nouvelle ni permission réutilisée. Un drainage global interdit aussi les nouvelles sous-opérations.

## Fin et reprise des effets

La permission émise reste suivie jusqu'à une fin d'outil native corrélée : session, type, cible, identifiant d'appel disponible et bornes temporelles. SSE ou historique HTTP fournit la preuve. idle, silence, timeout et expiration d'approbation ne suffisent pas.

POST /runs/<runId>/locks/release porte version, operationId, token, fencing, outcome et evidence. COMPLETED exige toutes les fins réussies ; NO_EFFECT pour une écriture exige une erreur native d'edit corrélée et une révision égale à la révision attendue. Une commande avec code non nul, un edit réussi ou une issue inconnue ne prouve pas l'absence d'effet. RECONCILED permet une frontière intermédiaire examinée avec effets connus et sous-opérations non commencées annulées ; il ne constitue pas une publication réussie. Une issue inconnue conserve toujours ses protections. À RELEASED, le jeton brut est retiré du registre et de la réponse ; le rejeu identique reste idempotent par l'empreinte de requête. /locks/cancel n'annule que les attentes ou acquisitions périmées sans effet commencé.

Les écritures connues avancent les révisions des ressources et invalident les lectures de sous-arbre concernées. Les écritures à publier restent suivies après libération. Après crash, les protections sont restaurées mais l'ancien jeton ne permet aucune nouvelle once. /locks/reconcile vérifie la frontière connue, annule les anciennes sous-opérations non commencées et émet un jeton/fencing neufs sans relâcher les fichiers ; les corrections conservent des identités et décisions neuves. Réconcilier les effets sans rejouer une permission consommée. Le prévol de récupération garde ses règles strictes ; terminer/libérer son accès avant transfert de session.

Si le payload d'acquisition d'un accès de commande est perdu après redémarrage
et que le registre conserve le même accès `HELD` avec des opérations terminales,
ne pas répéter `/locks/acquire`. Le propriétaire lit
`GET /runs/<runId>/locks/reconcile-preview?operationId=...`, puis vérifie le
RUN, l'accès, les ressources, les révisions, les décisions durables et le digest
de frontière. Il peut envoyer `POST /runs/<runId>/locks/reconcile-restored` avec
ce digest, la version, le fencing, un `reconciliationId` neuf et des références
de preuve. CAB relit l'historique natif, vérifie deux observations identiques,
l'inactivité de la session, l'absence de permission et l'absence de conflit ou
de changement de révision. Le reçu renouvelle le token et le fencing du même
accès `HELD` ; il ne crée aucun accès et ne rejoue aucune permission ou `once`.
Un reçu identique est idempotent. Une opération `ISSUING`, `EXECUTING` ou
`UNKNOWN`, une preuve terminale absente, une permission, un conflit, une
divergence ou une session active conserve l'accès protégé.

Pour un shell foreground timeouté sans shellID ni exit, le prévol
`GET /runs/<runId>/locks/timeout-quarantine-preview?operationId=...` scelle le
port et le tool part natif exact. Le POST
`/runs/<runId>/locks/quarantine-timeout` exige deux lectures natives identiques,
la décision durable, une session inactive et zéro permission. Il garde le shell
`EXECUTING`, `once` inchangé et le port write `HELD`; il ne prouve aucune fin et
ne libère rien. Sous cette quarantine, le même RUN peut acquérir un accès
`read` au même port avec une nouvelle décision CAB. Toute écriture et tout RUN
étranger restent bloqués ; gate et libération attendent toujours une preuve
native terminale.

Pour un shell foreground timeouté sans shellID ni exit, le prévol
`GET /runs/<runId>/locks/timeout-quarantine-preview?operationId=...` scelle le
port et le tool part natif exact. Le POST
`/runs/<runId>/locks/quarantine-timeout` exige deux lectures natives identiques,
la décision durable, une session inactive et zéro permission. Il garde le shell
`EXECUTING`, `once` inchangé et le port write `HELD`; il ne prouve aucune fin et
ne libère rien. Sous cette quarantine, le même RUN peut acquérir un accès
`read` au même port avec une nouvelle décision CAB. Toute écriture et tout RUN
étranger restent bloqués ; gate et libération attendent toujours une preuve
native terminale.

Pour une permission native encore pendante, le contrôleur 2.1.81 peut continuer
le `once` déjà décidé après redémarrage seulement si l’historique contient la
demande et l’approbation terminées exactes et que deux lectures natives
confirment permissionId/callID identiques, outil `running` et `executed=false`.
L’accès est réacquis sur le manifeste et les révisions d’origine. Si la
permission a disparu, CAB lit le journal durable V2 de la session et exige
`log.synced`. Un unique `session.tool.success` corrélé à la session, au callID,
à l’outil, à son entrée et au mandat clôt `COMPLETED` sans réponse ni rejeu.
Une erreur, l’absence d’événement ou toute preuve divergente reste `UNKNOWN`
protégé ; ce journal ne prouve pas `permission.replied`. Les accès complets du
même RUN ou d’autres RUN restent disponibles quand ils ne se recouvrent pas.

## Environnements de test Docker et LXC

Avant toute préparation, déclarer les environnements dans le manifeste du change, puis vérifier `testResourceProtocol=test-resources-v1` sur le contrôleur. Une identité non secrète stable représente le moteur Docker (`docker:engine-a`) ou l'instance LXC sur son hôte (`lxc:host-a/101`). Employer la même clé pour tous les alias physiques ; si cette identité ne peut être établie, arrêter avant le test. Les clés acceptent des identifiants en minuscules, chiffres, tiret, point ou souligné, sans URL, secret ni accès à project.env. La réservation couvre les RUN d'un même registre CAB ; elle ne constitue pas un verrou hôte entre contrôleurs indépendants.

1. Appeler `POST /runs/<runId>/test-resources/acquire` avec `version`, `transactionId`, `resources` (clés en `write`) et `evidence`. Demander l'ensemble complet sans accès temporaire détenu ni autre réservation de test. `HELD` fournit `token` et `fencing` ; HTTP 202 `WAITING` n'attribue aucune partie de l'ensemble. Répéter la même transaction consulte son état ; un contenu divergent est refusé.

Après un redémarrage, si le jeton est absent du contexte propriétaire mais que le payload d'acquisition d'origine complet existe encore, répéter exactement le même POST `acquire` avec le même RUN, `transactionId`, version, ressources, evidence et tout champ initial. Le POST idempotent renvoie le bail HELD existant au demandeur avec le même token/fencing ; `reconciliationRequired` reste vrai et aucune nouvelle réservation ni permission n'est créée. Ne reconstruis pas le payload depuis un GET et ne conserve jamais le jeton retourné dans un checkpoint ou un journal.

Si ce bail USED est restauré et que son payload d'acquisition est perdu, utiliser le prévol read-only `GET /runs/<runId>/test-resources/reconcile-preview?transactionId=...`. Après vérification de son propriétaire, ressources, opérations et `boundaryDigest`, le même RUN peut envoyer `POST /runs/<runId>/test-resources/reconcile-restored` avec version, fencing, reconciliationId neuf, digest et evidence. Le contrôleur relit les fins natives, les messages complets et la quiescence de session, puis renouvelle le token/fencing et conserve le même bail HELD. Le POST retourne le token au seul propriétaire courant ; ne jamais le recopier au chat, dans un checkpoint ou un journal. Une opération active ou inconnue, permission pendante, session active ou frontière divergente garde le bail HELD/reconciliationRequired. Cette voie ne lance ni commande, ni test, ni permission `once` et ne libère pas l'environnement.

Si le bail est réellement inutilisé, utiliser uniquement `GET /test-resources/release-unused-preview`, puis `POST /test-resources/release-unused-lost-token` lorsque le RUN est réservé et son job armé dans le même change, avec preview native complète prouvant l'absence d'effet. Ce scope déjà validé ne demande pas d'autorisation humaine supplémentaire. Cette voie ne libère qu'un bail prouvé inutilisé ; aucun GET ne révèle le jeton. Une permission, un effet, une opération inconnue, un historique incomplet ou un scope divergent conserve HELD.
2. Préparer et faire approuver séparément chaque commande de préparation, de test, de nettoyage et de vérification. Chacune déclare les clés Docker/LXC réellement touchées et ses autres ressources. Acquérir/libérer ses accès `/locks/...` normalement. La réservation de test reste détenue entre les commandes ; chaque permission conserve son unique `once`.
3. Vérifier la fin native de tous les tests, y compris processus détachés et ressources temporaires. Exécuter un nettoyage puis une commande distincte vérifiant la restitution de chaque environnement, avec des identités d'opérations neuves et exit 0. L'orchestrateur examine les commandes et preuves : CAB contrôle leur corrélation et leur ordre durable, sans interpréter leurs sorties ni deviner l'état Docker/LXC. Ne jamais utiliser un simple `/usr/bin/true` comme preuve d'un nettoyage réel.
4. Après libération des accès temporaires, appeler `POST /runs/<runId>/test-resources/release` avec `version`, `transactionId`, `token`, `fencing`, `evidence` et `cleanup`. Ce tableau contient une entrée par clé : `resourceKey`, `cleanupOperationId`, `verificationOperationId`, `restored: true`. Les opérations appartiennent au même cycle ; nettoyage et vérification sont postérieurs à tous les autres tests de leur environnement. Un booléen seul, un nettoyage échoué, une fin inconnue ou une opération encore active refuse la libération. Un test échoué peut libérer un environnement restitué sans devenir un succès. Le reçu est idempotent.

`GET /runs/<runId>/test-resources` expose réservations, attentes, propriétaire et besoin de réconciliation. `/test-resources/cancel` avec version, transactionId et evidence annule uniquement une attente. Après crash, PAUSE ou STOP, conserver les protections. Un délai dépassé seul ne suspend pas le RUN et ne clôture pas la transaction ; vérifier l'état natif en conservant les protections déjà acquises. `/test-resources/reconcile` exige l'ancien jeton/fencing, la génération, un `reconciliationId` neuf et les preuves ; après recontrôle natif, il renouvelle jeton/fencing sans libérer l'environnement. Réconcilier séparément les accès de commande restaurés et ne jamais rejouer une once consommée. Publication, réduction de portée, changement de génération et gate normal restent bloqués jusqu'à restitution.

Le registre 4 n'ajoute `testReservations` qu'au premier usage. Les anciens lecteurs stricts refusent cet état enrichi ; revenir à un ancien lecteur après utilisation demande une réconciliation/conversion autorisée, sans effacer les protections. Cette préparation 1.10.4 n'installe ni ne migre aucun runtime et ne propage aucun prompt consommateur.

## Navigateurs externes de test

Les navigateurs headless déclarés dans DEVOPS.md suivent exactement le même cycle `test-resources-v1`, actuellement Chromium et Firefox. Employer `browser:<identité-hôte>/<identité-navigateur>`, par exemple `browser:host-a/chromium` ou `browser:host-a/firefox`, pour identifier le mécanisme partagé sur l'hôte. Ne pas inventer une nouvelle identité pour contourner un navigateur déjà occupé. Un navigateur distinct peut avancer indépendamment ; un groupe Docker/LXC/navigateur est acquis en une seule transaction sans détention partielle.

Avant restitution, prouver la fermeture des sessions WebDriver/BiDi et des processus de test, ainsi que la libération des ports et profils temporaires appartenant au change, puis vérifier l'environnement par une commande distincte. Ne fermer aucune session utilisateur préexistante. La simple fin du scénario navigateur ne suffit pas. Les routes, preuves natives, reçus, génération, reprise après crash et barrières de clôture sont ceux des environnements Docker/LXC. Les permissions unitaires restent requises.

## Validation, publication et rapport

Protéger les seules entrées et effets utiles. openspec validate --all --strict protège en lecture OpenSpec, configuration et changes nécessaires ; les éditions de code indépendantes continuent. Les tests peuvent protéger une base ou des sorties. Une grande portée reste un conflit de ressources, pas une exclusion globale CAB.

Après validation, conserver les protections ou réacquérir et comparer les révisions des preuves avant publication. Réexaminer uniquement les validations/dépendances affectées. La séquence commune de publication ne rend pas les preuves indépendantes périmées. L'orchestrateur examine les preuves métier ; CAB ne lit pas le projet à sa place.

POST /runs/<runId>/publish porte version, transactionId, operationId, token, fencing, outcome=COMPLETED, proofRevisions, evidence et éventuellement reportFile. L'accès couvre toutes les ressources écrites à publier et les dépendances des preuves. Reçu, séquence, révisions, génération et libération sûre sont persistés ensemble. Répéter la transaction restitue le reçu même après livraison, sans nouvelle permission ; un contenu divergent est refusé.

Synchronisation et archivage OpenSpec restent des mandats distincts autorisés décrivant sources, destinations et parents utiles. Ils attendent les seuls accès incompatibles. Git reste distinctement autorisé ; son index/référence est une ressource logique sans gel des éditions indépendantes.

Lorsqu'un archivage autorisé a effectivement réussi et qu'un rapport d'archive est requis, le passage atomique en REPORT, ou /closing après publication, limite irréversiblement le contexte au STATISTICS.md de cette archive. Cette procédure d'archive ne s'applique pas à un diagnostic, à une préparation ou à une revalidation sans nouvel archivage ; employer le contrat correspondant à sa finalité. Écrire et vérifier ce rapport sous son seul accès. Rapport à six sections, preuves, gate individuel, désarmement puis /release restent obligatoires avant livraison. Une archive seule ne prouve pas la fin du change ou du parent.

## Pause, arrêt et exceptions communes

POST /runs/<runId>/suspend avec version, action=PAUSE|STOP|RESUME et evidence cible ce seul RUN. Les effets en cours restent protégés jusqu'à frontière sûre. STOP ne signifie ni livraison ni gate TERMINÉ. Le superviseur ne relance pas un RUN suspendu ou en attente de ressource.

Les seules causes globales sont GLOBAL_RECONCILIATION (état commun non isolable), SHARED_MAINTENANCE (infrastructure/formats communs), GLOBAL_PAUSE et GLOBAL_STOP (demandes explicites concernant tous les RUN).

POST /coordination/global/request exige transactionId, cause, scope=all, authorization et evidence. DRAINING ferme les admissions. /coordination/global/confirm vérifie la cohorte native et les protections avant HELD. /coordination/global/release exige transaction, génération, autorité et preuves de reprise ; aucun délai ne libère le gel. Une défaillance commune d'intégrité ferme conservatoirement l'admission pour réconciliation sans réparation ni purge. Une incertitude localisée reste ciblée.

/CAB pause|stop --run <run_id> est ciblé ; --all est explicitement global. Le démarrage d'un RUN rejoint l'infrastructure sans purge/reconnexion. Fermer ou redémarrer OpenCode exige une demande distincte. Le healthcheck reste diagnostique. La purge refuse réservations, accès actifs, effets incertains, gel non libéré et état invalide.

## Compatibilité historique unique

Les anciens usages uniques sans RUN conservent leurs décisions et once. Une trace durable de leurs sessions/racines interdit leur coexistence avec les RUN coordonnés. Pour passer au profil Multi-RUN, clore le job historique éventuel, demander GLOBAL_RECONCILIATION ou SHARED_MAINTENANCE, vérifier les sessions/racines natives et faire examiner les effets, puis /coordination/legacy/reconcile avec transactionId, authorization et evidence sous HELD. Seule cette clôture prouvée efface la trace active ; idle ou un redémarrage seul ne suffit pas. L'historique de clôture est conservé et la purge refuse une trace non réconciliée.

## Formats et migration

Le registre 1.10.4 utilise le schéma 4 ; les schémas 1/2/3 sont lus en mode migration requise sans anciennes acquisitions globales. Les mutations incompatibles reçoivent coordination-upgrade-required. Broker, clients et contrôleur confirment le protocole avant permission. Le broker concurrent notifie /validation/resource-request et /validation/resource-reminder, routes absentes des anciens contrôleurs, sans repli incompatible. Les versions des modules chargés sont vérifiées avant démarrage. Le magasin broker reste au schéma extensible 2 : les nouveaux champs sont persistés et corrélés, sans conversion implicite des anciens enregistrements.

La migration explicitement autorisée vérifie quiescence et sauvegarde privée avec empreinte. RUN, demandes consommées, jobs, candidates et reçus sont conservés ; les ressources historiques restent conservatrices. /coordination/migrate conserve les RUN en PAUSE et impose maintenancePreflightRequired. Vérifier MCP/SSE/readiness en lecture, lever explicitement le gel pour le prévol ciblé en maintenant les pairs en pause, puis autoriser uniquement /usr/bin/true avec manifeste read. Une once acquittée et exit 0 prouvés avant libération de cet accès autorisent ensuite le métier ; un échec conserve cette obligation. /coordination/rollback restitue la sauvegarde uniquement avant nouvel usage sous maintenance quiescente. Le retour arrière avant nouvel usage restitue la sauvegarde exacte ; après de nouveaux effets, une réconciliation/conversion explicite est obligatoire. Une préparation source ne déploie ni ne migre aucun état actif.

## Statistiques et consultations

La collecte distingue réservations, natif observé, attente/détention/promotion de ressources, réconciliation ciblée et quatre causes exceptionnelles. Les lacunes restent inconnues ; durées et paires recouvrantes ne s'additionnent pas. Busy ne prouve ni codage productif ni gain causal.

GET /statistics et /runs/<runId>/statistics conservent les agrégats et le brouillon individuel à six sections. /statistics/view et /runs/<runId>/statistics/view acceptent selection=current|last|24h|7d|30d, cible/contextId éventuels et format=markdown. /CAB stats, /CAB statslast, /CAB stats 24, /CAB stats7 et /CAB stats30 sont ponctuels, sans action de cycle de vie.

POST /statistics/import accepte seulement un bundle filtré du projet exact avec provenance/empreinte, sans modifier permissions, décisions ou réservations. L'importeur distribué lit en flux borné les fichiers d'audit explicitement désignés, sans suivre les chemins du contenu ni réactiver le job arrêté. Sources natives/importées restent séparées. Les quotas sont partagés et comparés seulement à compte/fenêtre identiques. Contenu, commandes, chemins d'opérations, URL et secrets sont exclus.

Sans candidat, distinguer dépendance, conflit et absence de travail restant prouvée. CISM et les prompts directs restent hors concurrence pilotée. La propagation vers les projets consommateurs exige son autorisation propre.

## Maintenance d'une récupération gelée

Le profil explicitement autorisé frozen-recovery-controller ajoute une
autorité privée BOOTSTRAP_HELD après DRAINING et refus de l'ancien contrôleur.
Il vérifie la récupération nommée sans effet, ses deux sessions et tous les
pairs, puis charge le contrôleur avant adoption du véritable HELD. La
libération de maintenance conserve la récupération. Cette exception ne
concerne ni une intégration courante ni un prévol commencé ou incertain.
Le contrat, les versions mixtes qualifiées et les limites du repli sont
définis par references/component-update.md ; aucune activation n'est déduite
du travail source ou de la disponibilité de ce profil.
