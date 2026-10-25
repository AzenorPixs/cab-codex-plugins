# CAB 1.10.2 — coordination atomique par ressource

Un processus OpenCode, un broker MCP stdio, un contrôleur et un superviseur servent plusieurs RUN dans un répertoire commun. Chaque RUN conserve session, job, décisions, preuves et checkpoint. Le contrat courant est `resource-scoped-v1` ; l'ancienne barrière ordinaire d'intégration n'est plus admise.

## Réservation et périmètre

Consulter GET /runs et OpenSpec avant sélection. Réserver exclusivement change et intention avant préparation par POST /runs/reserve : runId, ownerId, sessionId, directory, changeId, selectionKey, resources et dependsOn. Un RUN traite un change réservé à la fois ; les sous-jobs héritent du parent. Chaque change suivant emploie session, jobId et génération neufs.

Les ressources déclarent la portée autorisée ; leur recouvrement ne bloque plus la réservation des changes compatibles. Examiner les dépendances sémantiques : fichiers distincts ne prouvent pas l'indépendance d'un contrat. Les clés file: sont relatives et canoniques ; un répertoire couvre ses descendants. Les ressources logiques couvrent contrats, bases, ports, sorties et index/références Git distinctement autorisés. Les alias physiques connus sont refusés.

Un fichier est partagé par défaut. exclusiveResources, sous-ensemble explicite de fichiers du manifeste, demande l'optimisation privée. CAB la vérifie avant effet. L'arrivée d'un accès recouvrant ferme cette admission exclusive ; le pair attend les effets concernés avant accès partagé, sans drainer les RUN indépendants.

/extend et /resources contrôlent génération, portée et frontière sûre. Une réduction ne libère aucun effet inconnu ni obligation de publication. Le checkpoint reste output/<prompt>/<run_id>/state.json ; la reprise historique conserve preuves et propriété sans écraser un pair.

Après STOP et libération réconciliée, le même propriétaire peut réserver de nouveau le RUN. La réservation close ABANDONED ou DELIVERED et sa suspension restent dans l'historique ; la nouvelle génération et son contexte n'héritent pas du STOP. Une réservation encore RESERVED en PAUSE ou STOP, un gel global, un propriétaire divergent ou un change déjà livré restent bloquants. Aucune décision consommée ni permission native n'est transférée.

## Préparation, décision et accès

1. Déclarer entrées, écritures et ressources logiques exactes. Une commande sans manifeste exploitable est refusée ; CAB ne devine pas ses effets et ne réserve pas automatiquement project:*.
2. Lire GET /runs/<runId>/locks pour les révisions. Une lecture stable acquiert brièvement son ensemble en lecture, lit puis libère ; une observation non stable ne prouve pas une validation.
3. Préparer le contenu exact. request_validation conserve ses champs et ajoute coordination_protocol=resource-scoped-v1, run_id, reservation_version, operation_id, operation_digest, resources et expected_revisions. Une édition exige un fichier unique couvert en écriture ; une commande décrit son manifeste complet. L'empreinte représente le contenu examiné par l'orchestrateur.
4. Attendre la décision explicite sans garder inutilement une écriture exclusive. Une base modifiée impose relecture, nouveau contenu et nouvelle demande ; aucune décision terminale n'est remplacée.
5. Après approbation, acquérir l'ensemble juste avant effet. Un fichier privé prouvé peut utiliser l'admission exclusive interne sans appel séparé de verrou partagé.
6. Garder les règles natives ask. CAB recontrôle identité, révisions et protection avant une unique permission once. Ni réservation, ni acquisition, ni readiness ne constitue une approbation.

POST /runs/<runId>/locks/acquire reçoit version, operationId, operationDigest (SHA-256 hexadécimal), resources et expectedRevisions. Il retourne HELD avec token/fencing, ou HTTP 202 WAITING sans acquisition partielle. Une réémission identique expose l'état courant ; un contenu divergent est refusé. Une base changée pendant l'attente produit STALE sans effet : annuler et préparer une opération neuve.

Les lectures coexistent ; toute écriture exclut les accès recouvrants. La FIFO s'applique entre demandes incompatibles ; une demande indépendante avance et de nouveaux lecteurs ne dépassent pas un écrivain antérieur. Un détenteur n'attend jamais l'extension/conversion de son ensemble : terminer/libérer puis demander l'ensemble complet.

Pour un groupe cohérent, annoncer les sous-opérations, leur access_id commun et operationIds à l'acquisition. Chaque édition/commande garde sa décision et once. Après un effet connu, /locks/attach peut rattacher une correction nouvellement approuvée dans le même ensemble détenu, sans ressource nouvelle ni permission réutilisée. Un drainage global interdit aussi les nouvelles sous-opérations.

## Fin et reprise des effets

La permission émise reste suivie jusqu'à une fin d'outil native corrélée : session, type, cible, identifiant d'appel disponible et bornes temporelles. SSE ou historique HTTP fournit la preuve. idle, silence, timeout et expiration d'approbation ne suffisent pas.

POST /runs/<runId>/locks/release porte version, operationId, token, fencing, outcome et evidence. COMPLETED exige toutes les fins ; NO_EFFECT exige l'absence d'écriture prouvée. RECONCILED permet une frontière intermédiaire examinée avec effets connus et sous-opérations non commencées annulées ; il ne constitue pas une publication réussie. Une issue inconnue conserve toujours ses protections. /locks/cancel n'annule que les attentes ou acquisitions périmées sans effet commencé.

Les écritures connues avancent les révisions des ressources et invalident les lectures de sous-arbre concernées. Les écritures à publier restent suivies après libération. Après crash, les protections sont restaurées mais l'ancien jeton ne permet aucune nouvelle once. /locks/reconcile vérifie la frontière connue, annule les anciennes sous-opérations non commencées et émet un jeton/fencing neufs sans relâcher les fichiers ; les corrections conservent des identités et décisions neuves. Réconcilier les effets sans rejouer une permission consommée. Le prévol de récupération garde ses règles strictes ; terminer/libérer son accès avant transfert de session.

## Environnements de test Docker et LXC

Avant toute préparation, déclarer les environnements dans le manifeste du change, puis vérifier `testResourceProtocol=test-resources-v1` sur le contrôleur. Une identité non secrète stable représente le moteur Docker (`docker:engine-a`) ou l'instance LXC sur son hôte (`lxc:host-a/101`). Employer la même clé pour tous les alias physiques ; si cette identité ne peut être établie, arrêter avant le test. Les clés acceptent des identifiants en minuscules, chiffres, tiret, point ou souligné, sans URL, secret ni accès à project.env. La réservation couvre les RUN d'un même registre CAB ; elle ne constitue pas un verrou hôte entre contrôleurs indépendants.

1. Appeler `POST /runs/<runId>/test-resources/acquire` avec `version`, `transactionId`, `resources` (clés en `write`) et `evidence`. Demander l'ensemble complet sans accès temporaire détenu ni autre réservation de test. `HELD` fournit `token` et `fencing` ; HTTP 202 `WAITING` n'attribue aucune partie de l'ensemble. Répéter la même transaction consulte son état ; un contenu divergent est refusé.
2. Préparer et faire approuver séparément chaque commande de préparation, de test, de nettoyage et de vérification. Chacune déclare les clés Docker/LXC réellement touchées et ses autres ressources. Acquérir/libérer ses accès `/locks/...` normalement. La réservation de test reste détenue entre les commandes ; chaque permission conserve son unique `once`.
3. Vérifier la fin native de tous les tests, y compris processus détachés et ressources temporaires. Exécuter un nettoyage puis une commande distincte vérifiant la restitution de chaque environnement, avec des identités d'opérations neuves et exit 0. L'orchestrateur examine les commandes et preuves : CAB contrôle leur corrélation et leur ordre durable, sans interpréter leurs sorties ni deviner l'état Docker/LXC. Ne jamais utiliser un simple `/usr/bin/true` comme preuve d'un nettoyage réel.
4. Après libération des accès temporaires, appeler `POST /runs/<runId>/test-resources/release` avec `version`, `transactionId`, `token`, `fencing`, `evidence` et `cleanup`. Ce tableau contient une entrée par clé : `resourceKey`, `cleanupOperationId`, `verificationOperationId`, `restored: true`. Les opérations appartiennent au même cycle ; nettoyage et vérification sont postérieurs à tous les autres tests de leur environnement. Un booléen seul, un nettoyage échoué, une fin inconnue ou une opération encore active refuse la libération. Un test échoué peut libérer un environnement restitué sans devenir un succès. Le reçu est idempotent.

`GET /runs/<runId>/test-resources` expose réservations, attentes, propriétaire et besoin de réconciliation. `/test-resources/cancel` avec version, transactionId et evidence annule uniquement une attente. Après crash, PAUSE, STOP ou délai dépassé, conserver les protections. `/test-resources/reconcile` exige l'ancien jeton/fencing, la génération, un `reconciliationId` neuf et les preuves ; après recontrôle natif, il renouvelle jeton/fencing sans libérer l'environnement. Réconcilier séparément les accès de commande restaurés et ne jamais rejouer une once consommée. Publication, réduction de portée, changement de génération et gate normal restent bloqués jusqu'à restitution.

Le registre 4 n'ajoute `testReservations` qu'au premier usage. Les anciens lecteurs stricts refusent cet état enrichi ; revenir à un ancien lecteur après utilisation demande une réconciliation/conversion autorisée, sans effacer les protections. Cette préparation 1.10.2 n'installe ni ne migre aucun runtime et ne propage aucun prompt consommateur.

## Navigateurs externes de test

Les navigateurs headless déclarés dans DEVOPS.md suivent exactement le même cycle `test-resources-v1`, actuellement Chromium et Firefox. Employer `browser:<identité-hôte>/<identité-navigateur>`, par exemple `browser:host-a/chromium` ou `browser:host-a/firefox`, pour identifier le mécanisme partagé sur l'hôte. Ne pas inventer une nouvelle identité pour contourner un navigateur déjà occupé. Un navigateur distinct peut avancer indépendamment ; un groupe Docker/LXC/navigateur est acquis en une seule transaction sans détention partielle.

Avant restitution, prouver la fermeture des sessions WebDriver/BiDi et des processus de test, ainsi que la libération des ports et profils temporaires appartenant au change, puis vérifier l'environnement par une commande distincte. Ne fermer aucune session utilisateur préexistante. La simple fin du scénario navigateur ne suffit pas. Les routes, preuves natives, reçus, génération, reprise après crash et barrières de clôture sont ceux des environnements Docker/LXC. Les permissions unitaires restent requises.

## Validation, publication et rapport

Protéger les seules entrées et effets utiles. openspec validate --all --strict protège en lecture OpenSpec, configuration et changes nécessaires ; les éditions de code indépendantes continuent. Les tests peuvent protéger une base ou des sorties. Une grande portée reste un conflit de ressources, pas une exclusion globale CAB.

Après validation, conserver les protections ou réacquérir et comparer les révisions des preuves avant publication. Réexaminer uniquement les validations/dépendances affectées. La séquence commune de publication ne rend pas les preuves indépendantes périmées. L'orchestrateur examine les preuves métier ; CAB ne lit pas le projet à sa place.

POST /runs/<runId>/publish porte version, transactionId, operationId, token, fencing, outcome=COMPLETED, proofRevisions, evidence et éventuellement reportFile. L'accès couvre toutes les ressources écrites à publier et les dépendances des preuves. Reçu, séquence, révisions, génération et libération sûre sont persistés ensemble. Répéter la transaction restitue le reçu même après livraison, sans nouvelle permission ; un contenu divergent est refusé.

Synchronisation et archivage OpenSpec restent des mandats distincts autorisés décrivant sources, destinations et parents utiles. Ils attendent les seuls accès incompatibles. Git reste distinctement autorisé ; son index/référence est une ressource logique sans gel des éditions indépendantes.

Le passage atomique en REPORT, ou /closing après publication, limite irréversiblement le contexte au STATISTIQUES.md de sa propre archive. Écrire et vérifier ce rapport sous son seul accès. Rapport à six sections, preuves, gate individuel, désarmement puis /release restent obligatoires avant livraison. Une archive seule ne prouve pas la fin du change ou du parent.

## Pause, arrêt et exceptions communes

POST /runs/<runId>/suspend avec version, action=PAUSE|STOP|RESUME et evidence cible ce seul RUN. Les effets en cours restent protégés jusqu'à frontière sûre. STOP ne signifie ni livraison ni gate TERMINÉ. Le superviseur ne relance pas un RUN suspendu ou en attente de ressource.

Les seules causes globales sont GLOBAL_RECONCILIATION (état commun non isolable), SHARED_MAINTENANCE (infrastructure/formats communs), GLOBAL_PAUSE et GLOBAL_STOP (demandes explicites concernant tous les RUN).

POST /coordination/global/request exige transactionId, cause, scope=all, authorization et evidence. DRAINING ferme les admissions. /coordination/global/confirm vérifie la cohorte native et les protections avant HELD. /coordination/global/release exige transaction, génération, autorité et preuves de reprise ; aucun délai ne libère le gel. Une défaillance commune d'intégrité ferme conservatoirement l'admission pour réconciliation sans réparation ni purge. Une incertitude localisée reste ciblée.

/cab pause|stop --run <run_id> est ciblé ; --all est explicitement global. Le démarrage d'un RUN rejoint l'infrastructure sans purge/reconnexion. Fermer ou redémarrer OpenCode exige une demande distincte. Le healthcheck reste diagnostique. La purge refuse réservations, accès actifs, effets incertains, gel non libéré et état invalide.

## Compatibilité historique unique

Les anciens usages uniques sans RUN conservent leurs décisions et once. Une trace durable de leurs sessions/racines interdit leur coexistence avec les RUN coordonnés. Pour passer au profil Multi-RUN, clore le job historique éventuel, demander GLOBAL_RECONCILIATION ou SHARED_MAINTENANCE, vérifier les sessions/racines natives et faire examiner les effets, puis /coordination/legacy/reconcile avec transactionId, authorization et evidence sous HELD. Seule cette clôture prouvée efface la trace active ; idle ou un redémarrage seul ne suffit pas. L'historique de clôture est conservé et la purge refuse une trace non réconciliée.

## Formats et migration

Le registre 1.10.2 utilise le schéma 4 ; les schémas 1/2/3 sont lus en mode migration requise sans anciennes acquisitions globales. Les mutations incompatibles reçoivent coordination-upgrade-required. Broker, clients et contrôleur confirment le protocole avant permission. Le broker concurrent notifie /validation/resource-request et /validation/resource-reminder, routes absentes des anciens contrôleurs, sans repli incompatible. Les versions des modules chargés sont vérifiées avant démarrage. Le magasin broker reste au schéma extensible 2 : les nouveaux champs sont persistés et corrélés, sans conversion implicite des anciens enregistrements.

La migration explicitement autorisée vérifie quiescence et sauvegarde privée avec empreinte. RUN, demandes consommées, jobs, candidates et reçus sont conservés ; les ressources historiques restent conservatrices. /coordination/migrate conserve les RUN en PAUSE et impose maintenancePreflightRequired. Vérifier MCP/SSE/readiness en lecture, lever explicitement le gel pour le prévol ciblé en maintenant les pairs en pause, puis autoriser uniquement /usr/bin/true avec manifeste read. Une once acquittée et exit 0 prouvés avant libération de cet accès autorisent ensuite le métier ; un échec conserve cette obligation. /coordination/rollback restitue la sauvegarde uniquement avant nouvel usage sous maintenance quiescente. Le retour arrière avant nouvel usage restitue la sauvegarde exacte ; après de nouveaux effets, une réconciliation/conversion explicite est obligatoire. Une préparation source ne déploie ni ne migre aucun état actif.

## Statistiques et consultations

La collecte distingue réservations, natif observé, attente/détention/promotion de ressources, réconciliation ciblée et quatre causes exceptionnelles. Les lacunes restent inconnues ; durées et paires recouvrantes ne s'additionnent pas. Busy ne prouve ni codage productif ni gain causal.

GET /statistics et /runs/<runId>/statistics conservent les agrégats et le brouillon individuel à six sections. /statistics/view et /runs/<runId>/statistics/view acceptent selection=current|last|24h|7d|30d, cible/contextId éventuels et format=markdown. /cab stats, /cab statslast, /cab stats 24, /cab stats7 et /cab stats30 sont ponctuels, sans action de cycle de vie.

POST /statistics/import accepte seulement un bundle filtré du projet exact avec provenance/empreinte, sans modifier permissions, décisions ou réservations. L'importeur distribué lit en flux borné les fichiers d'audit explicitement désignés, sans suivre les chemins du contenu ni réactiver le job arrêté. Sources natives/importées restent séparées. Les quotas sont partagés et comparés seulement à compte/fenêtre identiques. Contenu, commandes, chemins d'opérations, URL et secrets sont exclus.

Sans candidat, distinguer dépendance, conflit et absence de travail restant prouvée. CISM, CAISM et prompts directs restent hors concurrence pilotée. La propagation vers les projets consommateurs exige son autorisation propre.

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
