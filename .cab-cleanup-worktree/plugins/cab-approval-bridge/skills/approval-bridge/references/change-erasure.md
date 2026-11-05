# Effacement terminal ciblé — CAB 2.2.40

## Autorité et conditions

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
