# Effacement terminal ciblé — CAB 2.4.2

## Préparation interrompue avant projection

Avec le helper2.4.2, `recover-preparation --transaction-id <même reçu>
--workspace <projet> --runtime-version 2.4.0` vérifie une transaction v1 STOPPING
sans entries ni expectedPeers. NativePID/SID/permissions et clôture/liaisons
sont contrôlés ; les services sont vérifiés puis leurs PID recapturés. La phase
reste STOPPING. Reprendre ensuite execute, certificat, finalize et verify avec
les mêmes identités et version runtime. Une projection déjà engagée ou des
liaisons divergentes refusent cette action ; aucune donnée n’est restaurée.

Les tableaux inventory.onceAcknowledged et restoredAccesses des anciens reçus
sont des listes d’identifiants : seuls les éléments exactement ciblés sont
retirés. Les booléens onceAcknowledged, les pairs et leur ordre restent intacts.

## Reçu propriétaire volumineux et reprise

Le reçu signé accepte jusqu’à128Mio en lecture et écriture. Les gardes de
propriétaire, signature, fichier ordinaire, liens et scope restent inchangées.
En APPLYING, les candidats déjà aux empreintes après sont reconnus sans
réécriture ; APPLIED attend toujours la vérification d’absence. Un répertoire
runtime privé hors projet doit rester privé sous son UID, contrairement aux
fichiers projet0775. Rétablir cet invariant ne change ni propriétaire ni clés.

Pendant une reprise d’un nettoyage déjà engagé, conserver le même reçu et le
client de cleanup compatible avec les processus encore chargés. Distinguer
le helper propriétaire corrigé des versions des processus principaux ; la mise
à jour globale CABU ne se déclare réussie qu’après la fin de la phase critique
et la vérification de toutes les versions réellement actives. Ne pas fabriquer
APPLIED depuis une simple empreinte ou purger un reçu pour réduire sa taille.

## Autorité et conditions

Si le dernier marqueur d’époque du plan signé correspond exactement au disque,
l’application ordonnée du plan est déjà persistée. Les pairs peuvent ensuite
avoir progressé : la reprise préserve ces fichiers et exige une vérification
d’absence actuelle avant de compacter le reçu APPLIED. Le reçu contient le type
de preuve et l’empreinte du plan. Un marqueur divergent ou une référence encore
présente ne permet pas cette récupération ; aucun candidat divergent n’est écrasé.

L’orchestrateur réalise ce cycle dans le change déjà autorisé, sans nouvelle
approbation du développeur. Il vérifie d’abord les rapports, le gate validé,
le désarmement et la libération du RUN. Deux issues seulement : `TERMINÉ`,
ou `BLOQUÉ` pour dépendance métier insatisfaite avec le change ouvert.
Une alerte technique BLOCKED ne constitue pas ce second cas.

Une opération PREPARED non retirée, ISSUING, EXECUTING ou UNKNOWN, une once sans
résultat réconcilié, une permission en attente ou une ressource non libérée
empêche l’effacement. L’archivage métier ne lève aucune de ces protections.
Ne pas utiliser une purge pour faire disparaître un effet incertain.

Avant le gate, retirer les validations sans émission par les voies qualifiées
[de récupération](autonomous-recovery.md). PREPARED/REJECTED sans accès possède
la voie `withdraw-unissued-validation`, sous propriétaire/policy couvrante,
deux frontières natives stables, SID courant inactif, aucune permission,
native, nativeResult ou once. La décision REJECTED demeure dans le registre.
APPROVED dont le parent est seulement référencé puis RELEASED possède la même
voie si la libération est prouvée et le parent n’a jamais compté l’enfant
parmi ses membres. Aucune couverture supplémentaire de ressources n’est alors
accordée : le retrait n’exécute rien. Le parent, ses membres et les baux ne
changent pas. Toute activité native après la validation empêche cette voie.
Après retrait, utiliser de nouvelles identités pour une unité corrigée.

## Ordre et interfaces

Le pilote est `scripts/cgpt-approval-bridge-cleanup.mjs` du plugin installé.
Il partage l’exclusion de maintenance CABU ; il ne lance ni start, ni test,
ni reset du protocole. Le contrôleur reçoit uniquement des POST JSON locaux
avec `x-cab-continuity: cab-continuity-v1`. Les routes sont
`/cleanup/prepare`, `/cleanup/seal`, `/cleanup/status` ; la route interne
`/cleanup/admission` ne confère aucune permission d’exécution.
L’identité de maintenance du moniteur utilise `/api/maintenance-identity` ;
la réponse publique `/api/identity` conserve son format minimal.

1. **Préparer l’inventaire** : appeler `cleanup prepare --workspace <racine>
   --input <JSON privé autorisé>`. Le JSON contient exactement `changeId`,
   `ownerId`, `branch` (`TERMINÉ` ou `BLOQUÉ`), `retainedSessionId`, `evidence`
   (références de preuves) et `dependencyEvidence`. Pour TERMINÉ, les deux
   derniers champs d’exception sont null : `retainedSessionId` et
   `dependencyEvidence`. Pour BLOQUÉ, désigner l’unique SID métier prévu par
   le prompt ; `dependencyEvidence` contient `reason: UNSATISFIED_DEPENDENCY`,
   `blockersSha256` et `statisticsSha256`, calculés localement sur les rapports
   `openspec/changes/<change>/BLOCKERS.md` et `STATISTICS.md` vérifiés. Ne pas
   faire transcrire ces empreintes par le LLM. Conserver le transactionId et
   l’inventaire dans le checkpoint autorisé.
2. **Nettoyer OpenCode** selon [le contrat natif](protocol-lifecycle.md) :
   comparer l’inventaire à celui du checkpoint, contrôler propriétaires et
   cascades, puis supprimer les sessions admissibles depuis l’orchestrateur.
   En arrêt pour dépendance, garder seulement le SID métier prescrit et sa
   référence dans le checkpoint métier, hors CAB. Les sondes et sessions de
   statistiques sont supprimées. Une propriété incertaine suspend la seule
   suppression concernée. Ne jamais créer un codeur pour exécuter le cleanup.
3. **Sceller la frontière** : `cleanup seal --workspace <racine>
   --transaction-id <id>`. Le contrôleur vérifie l’absence des SID à supprimer,
   la présence éventuelle du SID conservé, l’inactivité et les permissions.
   Les futures réservations de ce change sont suspendues durant la transaction.
4. **Exécuter** : `cleanup execute --workspace <racine> --transaction-id <id>`.
   WAITING_BROKER est une préparation sans coupure ; le heartbeat existant
   transmet l’intention authentifiée au broker. Consulter le petit statut,
   avec une attente bornée de 90 secondes, sans sonder le transcript ni
   relancer de demande métier. Une erreur de préparation est diagnostiquée
   par son code ; ne pas transformer l’attente en réussite.
5. **Conserver la preuve externe** : après vérification disque et mémoire,
   le pilote retourne un certificat `CERTIFIED_PENDING_FINALIZE`. L’enregistrer
   dans le checkpoint métier déjà autorisé. Ce statut n’est pas encore PURGED :
   CAB conserve temporairement sa transaction pour permettre la reprise.
6. **Finaliser** avec `cleanup finalize --workspace <racine>
   --transaction-id <id> --input <certificat privé déjà conservé>`. Le JSON peut
   être le certificat ou un objet dont `certificate` est ce certificat.
   Le pilote revérifie l’absence, puis efface son propre manifeste et son
   bundle de reprise. Seul `PURGED` prouve le nettoyage complet.
7. **Vérifier après réponse perdue** : `cleanup verify --workspace <racine>
   --input <certificat externe>`. Cette consultation vérifie la signature et
   l’absence dans les racines certifiées et les API des composants. Elle ne
   supprime rien et ne recrée aucun ancien état. Un RUN de nouvelle génération
   n’est jamais purgé par cette vérification.

La ligne de commande complète commence par `node <plugin>/scripts/
cgpt-approval-bridge-cleanup.mjs <action>`. `--controller-url`,
`--supervisor-url`, `--monitor-url` et `--opencode-url` permettent les bases
loopback explicites du profil. Depuis un orchestrateur JavaScript, l’export
`cleanupChange({workspace, action, transactionId, certificate})` permet de
finaliser ou vérifier le certificat déjà en mémoire, sans fichier additionnel.
Pour prepare, `request` peut également fournir l’objet de préparation en
mémoire ; l’API applique les mêmes contrôles que le JSON privé de la CLI.

## Coupure, reprise et absence

Le pilote vérifie les PID des unités user systemd contre les API du profil,
prépare la continuité, puis arrête supervisor, monitor et controller. Il
déconnecte le seul MCP cgpt-validation ; OpenCode reste démarré. Le broker
termine ses producteurs avant de préparer son journal rescellé. Les candidats
sont authentifiés et appliqués hors ligne, puis les briques sont redémarrées.
Le retour READY du broker, les versions et la disparition des identités dans
les vues sont contrôlés. Les registres et compteurs des autres RUN restent
conservés ; aucune nouvelle once ni décision métier n’est produite.

Avant la première écriture d’effacement, un échec qualifiable rétablit les
services avec les données conservées. Une transition MCP INTENT dont l’issue
est inconnue n’est pas rejouée : lire l’état natif et reprendre le même reçu.
Après le début des écritures, reprendre uniquement la transaction signée dans
sa phase ; ne jamais restaurer les données effacées depuis un ancien backup.
CABU refuse une bascule concurrente pendant les phases critiques du cleanup.
Une version ou identité de service divergente reste à réconcilier dans le
profil ; aucun arrêt d’un PID étranger, reboot natif ou reload global implicite.

Le journal courant est vérifié avant retrait. Les événements des pairs gardent
identités et contenu métier ; séquences et empreintes de chaînage sont recalculées.
Un HMAC déjà configuré reste utilisé. Si le profil n’en avait pas, le premier
réancrage crée une clé locale privée et un premier checkpoint authentifié,
sans prétendre authentifier rétrospectivement l’ancien journal. Une intégrité
invalide ne se répare pas par l’effacement. La clé et l’époque globales ne
contiennent aucune identité de change et ne sont pas supprimées.
Après un effacement, une nouvelle proposition est vérifiée auprès de la
réservation actuelle avant persistance : un ancien mandat ne recrée pas ses
approbations après nettoyage. Une coupure du contrôleur suspend cette seule
soumission, sans permission ni effet.

Le périmètre certifié couvre les racines runtime résolues du contrôleur,
superviseur, broker, moniteur, les sauvegardes CABU gérées et l’ancien runtime
CAB du workspace. Les fichiers projet restent en 0775 et l’état privé hors
projet en 0700/0600. Une racine non examinable, un ancien journal partagé
sans adaptateur qualifiable, une référence nécessaire à un pair, un format
signé non pris en charge ou une référence textuelle non attribuable empêche
le faux succès total et fournit un diagnostic. Ne pas effacer les pairs pour
faire passer le contrôle. Le moniteur adopte après le premier cleanup un
catalogue des seuls changes référencés par CAB ; il ne réimporte pas le change
ouvert BLOQUÉ depuis le dossier métier.

Aucun backup, tombstone, index ou reçu propre au change ne subsiste après
PURGED. Les preuves métier, le chat de pilotage et le certificat externe sont
préservés. Ce résultat ne couvre pas les snapshots système, les conversations
Codex, les journaux fournisseurs ou l’effacement forensic du support physique.

La continuité commune utilise une identité globale distincte de la transaction
d’effacement ; leur lien disparaît avec le manifeste final. Le journal
public d’observations adopte une nouvelle époque : un ancien curseur reçoit
`gap` et recharge les vues courantes, sans collision entre les événements
réindexés. Les identités métier des événements du broker restent conservées.
Les permissions internes 0775 sont acceptées sous un ancêtre privé effectif ;
le pilote ne modifie pas les droits des dossiers pour les normaliser.


## Données statistiques du change

L’effacement terminal couvre controller-statistics.json et
controller-observations.json, leurs contextes, admissions, catalogues,
événements, intervalles et jeux importés rattachés au change, ainsi que les
copies runtime couvertes par l’inventaire. Il suit le rapport individuel
vérifié, la clôture sûre et le nettoyage des sessions natives, pour TERMINÉ
comme pour BLOQUÉ sur dépendance insatisfaite. La session métier conservée
pour reprise reste soumise à l’exception native prévue, pas à une suppression
implicite de son historique OpenCode.

Les segments et imports partagés sont projetés sur les seuls pairs restants.
Les références historiques integrationOwner de la cible deviennent null et
les listes d’identités conservent les pairs. L’empreinte d’un import modifié
est recalculée après validation du format et de son empreinte initiale, afin
que le magasin reste valide à la restauration. Aucune donnée étrangère n’est
effacée pour satisfaire le contrôle. Une référence non attribuable ou un format
non qualifié garde le refus existant et ses preuves.

Après rechargement des briques, vérifier que le change n’apparaît plus dans
leurs statistiques. Conserver le rapport, le registre global et les fichiers
métier du projet. Ne pas utiliser la purge générale de rétention comme substitut.
En session directe sans état CAB utilisé pour ce change, indiquer non applicable ;
le moteur de rapport ne crée pas de runtime ou de stockage privé à nettoyer.

## Plusieurs propriétaires historiques — CAB 2.3.9

Si le même change comprend d’anciens RUN attribués à d’autres propriétaires, ne pas réécrire leurs owners ni supprimer leur historique pour contourner le refus. Le mandat existant doit couvrir explicitement l’intégralité de ce seul change et tous les RUN visés, avec exclusion des pairs.

Avant prepare, appeler `cleanup preview --workspace <racine> --input <JSON privé autorisé>` ; `request` en mémoire fonctionne aussi. Le JSON contient exactement `changeId` et `ownerId`. Le prévol sans effacement renvoie `runBindings` (runId/contextId/version/ownerId), `inventoryDigest`, les états non secrets des jobs et `requiresOwnershipReview`. Il ne crée pas de transaction, ne prouve pas l’éligibilité et n’accorde aucune autorisation.

L’orchestrateur vérifie chaque attribution et le mandat, puis ajoute au JSON prepare `ownershipReview: {runBindings, inventoryDigest, evidence}`. Utiliser directement l’inventaire courant, sans retranscription des empreintes par le LLM ; `evidence` référence le mandat et la revue déjà autorisés. La revue couvre toutes les liaisons exactes du change ; les champs sont revalidés au scellement. Le défaut sans revue continue à refuser tout propriétaire étranger. Aucun wildcard, owner substitué ou RUN pair n’est accepté.

Le dernier contexte du change doit appartenir au propriétaire de clôture, être libéré et désarmé avec le gate VALIDATED de la branche finale. Les jobs historiques inclus doivent être désarmés et attribuables ; un abandon antérieur ne reçoit aucun gate fictif. Les protections des opérations, once, ressources et sessions restent intégralement appliquées. Une divergence de liaison/version, un job armé, une absence de gate final ou une session partagée refuse avant effacement. Conserver toutes les sessions jusqu’à la réussite de prepare, puis effectuer le cycle OC/seal/execute/certificat externe/finalize/PURGED/verify déjà décrit, pour tout l’inventaire et uniquement lui.

## Reçus terminaux historiques — CAB 2.3.10

Les anciennes versions n’écrivaient nativeResult que pour les baux de test. Un reçu COMPLETED sans cette propriété peut être qualifié pour l’effacement si la once acquittée, permission/call/target, dates et completionDigest sont présents, et si son accès exact (RUN/contexte/version/membre) est RELEASED avec outcome reconnu, date cohérente et releaseDigest. Le scope signé identifie ces unités dans legacyTerminalOperationIds. Aucun champ natif, statut de succès ou exit n’est fabriqué ; les données historiques restent inchangées jusqu’à la purge. Un résultat explicite null/invalide, un bail de test sans résultat, une identité ou empreinte absente, une mauvaise liaison, un effet non terminé ou un accès non libéré reste refusé. Le cas du port réconcilié conserve son reçu dédié et ses propres gardes. Le reste du cycle, des gates et de l’inventaire reste identique.

## Client2.4.1 sur un nettoyage2.4.0 déjà engagé

Le helper2.4.1 accepte `--runtime-version 2.4.0` uniquement pour execute,
finalize et verify sur la transaction v1 existante. Les versions et PID des
processus sont contrôlés contre2.4.0, sans autoriser une version arbitraire.
Le certificat distingue helper2.4.1 et runtime2.4.0. Cette compatibilité ne
crée aucun effacement et ne remplace pas le CABU global après la phase critique.

Lors de cette récupération, conserver les points d’entrée Python et le contrat
broker de la version effectivement chargée, à partir du paquet publié vérifié.
Les seuls helpers propriétaires corrigés sont préparés avant reprise. Le cycle
normal CABU actualise ensuite le jeu complet ; son bilan exige toutes les
versions réellement actives et ne se déduit pas de la seule reprise du worker.
