# change-state-erasure Specification

## Purpose

Garantir l’effacement terminal ciblé des états CAB après clôture sûre et nettoyage natif, sans perte des protections ou des données des autres RUN.

## Requirements

### Requirement: Éligibilité terminale qualifiée
CAB SHALL refuser le nettoyage d’un RUN en cours et permettre celui d’un RUN clos sous le mandat applicable. Un arrêt explicite pour dépendance insatisfaite MAY clore le RUN tout en conservant le change ouvert et sa session métier de reprise. Les rapports/statistiques requis SHALL être durablement enregistrés avant purge des buffers. Les seuls anciens formats SHALL NOT bloquer le nettoyage.

#### Scenario: Change finalisé
- **WHEN** le propriétaire a clos le RUN et vérifié les rapports du change finalisé
- **THEN** le nettoyage ciblé est permis dans le mandat sans nouveau consentement

#### Scenario: Arrêt pour dépendance non satisfaite
- **WHEN** le RUN est arrêté pour dépendance avec rapports et statistiques conservés
- **THEN** le change reste ouvert et la seule session métier de reprise prévue est conservée hors état opérationnel CAB

#### Scenario: Clôture autoritaire
- **WHEN** le RUN est clos dans le registre applicable et les rapports sont conservés
- **THEN** CAB permet l’inventaire et le nettoyage ciblés sans nouvelle autorisation dans le mandat

### Requirement: Protection des effets non réconciliés
CAB SHALL préserver tout RUN réellement en cours et les données des pairs. Une ancienne trace d’opération d’un RUN clos SHALL être interprétée selon son format et sa clôture autoritaire sans fabriquer de résultat natif. Une pause ou activité native encore en cours SHALL ne pas être présentée comme une clôture.

#### Scenario: Port protégé sans résultat natif
- **WHEN** un RUN encore en cours conserve un port protégé sans preuve de terminaison
- **THEN** CAB refuse sa purge et conserve les protections

#### Scenario: RUN en cours
- **WHEN** le RUN cible reste en cours
- **THEN** le nettoyage est refusé et ses données restent intactes

### Requirement: Nettoyage natif avant purge CAB
Le propriétaire SHALL inventorier les sessions de phase et leurs descendants,
vérifier leur propriété, leur inactivité et leur absence d’effets et permissions,
puis les supprimer via l’API native officielle. CAB SHALL vérifier le résultat
avant de retirer cet inventaire. Le nettoyage SHALL NOT créer une nouvelle
session pour exécuter sa propre purge.

#### Scenario: Nettoyage natif incomplet
- **WHEN** une session à supprimer existe encore ou son absence n’est pas vérifiable
- **THEN** CAB conserve les données de reprise et ne commence pas la purge terminale
- **AND** les suppressions natives déjà vérifiées ne sont pas rejouées

#### Scenario: Propriété ou cascade ambiguë
- **WHEN** une suppression pourrait emporter une session étrangère ou sa propriété est incertaine
- **THEN** la suppression concernée est refusée
- **AND** l’inventaire couvre source, handoffs, sous-jobs, sondes et statistiques sans se fonder sur leur seul titre

### Requirement: Exception native de reprise pour dépendance
Pour l’arrêt pour dépendance, l’unique session métier conservée par le prompt
SHALL rester native. Les autres sessions de phase SHALL être supprimées avant
la purge CAB. Sa référence SHALL rester uniquement dans le checkpoint métier
hors CAB ; les briques CAB SHALL retirer aussi ses SID, liens et index.
Cette exception SHALL NOT être inventée pour un change finalisé.

#### Scenario: Session métier conservée pour dépendance
- **WHEN** l’unique session métier prévue par le prompt est vérifiée présente et les autres sessions admissibles sont supprimées
- **THEN** le nettoyage natif est qualifié avec cette exception explicite
- **AND** les cascades emportant cette session sont empêchées
- **AND** la purge CAB ne conserve aucune référence à son SID

### Requirement: Inventaire fermé par propriété
CAB SHALL inventorier le change canonique, ses contextes et générations,
jobs, opérations, demandes, accès, baux, sessions et identités dérivées.
La sélection SHALL NOT reposer seulement sur un titre, préfixe, code de lot
ou runId réutilisable. Les chemins SHALL venir des configurations résolues
des composants. Une propriété ambiguë SHALL empêcher le succès total.

#### Scenario: Même nom de RUN dans plusieurs générations
- **WHEN** une génération étrangère utilise le même nom fonctionnel que la cible
- **THEN** CAB la distingue par sa propriété et conserve toutes ses données

### Requirement: Couverture des briques et copies gérées
L’inventaire SHALL couvrir controller, broker, supervisor et monitor, leurs
états durables, copies runtime gérées et caches mémoire. Configuration,
credentials, sources et preuves métier hors CAB SHALL être exclus. Une racine
non examinable, un format non pris en charge ou un cache non acquitté SHALL
empêcher le succès total.

#### Scenario: Vérification de toutes les rétentions
- **WHEN** CAB prépare puis vérifie l’effacement
- **THEN** il examine états, historiques, journaux, checkpoints, stages et payloads, politiques et reçus, statistiques détaillées et événements
- **AND** il couvre snapshots, derniers snapshots valides, index et caches durables et mémoire, copies et sauvegardes runtime gérées

#### Scenario: Copie runtime oubliée
- **WHEN** une copie gérée conserve une référence cible ou qu’un composant ne confirme pas le retrait de ses caches
- **THEN** CAB ne déclare pas l’effacement complet

### Requirement: Préservation des pairs
CAB SHALL préserver les événements et données métier des pairs, sauf
métadonnées de réancrage permises par `approval-persistence`. Une référence
d’un autre RUN encore nécessaire SHALL empêcher son retrait et être signalée.
Les agrégats globaux non identifiants et compteurs d’autorité SHALL rester
conservés. Aucune purge globale SHALL découler d’un nettoyage ciblé.

#### Scenario: Référence nécessaire d’un pair actif
- **WHEN** un événement ou objet partagé reste nécessaire à un autre RUN
- **THEN** CAB n’efface pas cet objet et signale la dépendance précise
- **AND** il ne modifie ni les permissions, ni les jobs, ni les décisions, ni les accès du pair

### Requirement: Transaction durable bornée
L’effacement SHALL préparer une intention durable avec inventaire, empreintes,
identités des composants et progression. Avant écriture, CAB SHALL vérifier
la clôture et la concordance avec les versions préparées ou déjà écrites par
cette transaction. Chaque composant SHALL acquitter disque et mémoire avant
la preuve globale ; un HTTP 200 ou un ACK disque seul SHALL NOT suffire.

#### Scenario: Écriture concurrente ou fichier substitué
- **WHEN** une empreinte change hors transaction ou un chemin devient un lien symbolique
- **THEN** CAB refuse la modification divergente et ne touche pas la cible du lien
- **AND** les écritures des pairs sont coordonnées sans réinitialisation globale

### Requirement: Reprise transactionnelle sans rejeu
Une interruption SHALL reprendre uniquement les étapes non prouvées de la même
transaction. Une réponse perdue SHALL déclencher une lecture ou vérification,
jamais un nouvel effet métier. CAB SHALL conserver les informations de reprise
jusqu’à la preuve finale, refuser le faux succès partiel et empêcher la
réintroduction de données effacées depuis une ancienne sauvegarde.

#### Scenario: Crash après retrait broker avant retrait monitor
- **WHEN** le broker a prouvé son retrait mais le moniteur n’a pas encore acquitté le sien
- **THEN** la reprise conserve l’étape broker et termine uniquement les étapes restantes
- **AND** le statut reste partiel tant que la preuve globale n’est pas établie

### Requirement: Preuve finale sans trace retenue
Après vérification de toutes les racines et mémoires gérées, CAB SHALL remettre
un certificat authentifié au propriétaire pour conservation hors CAB. Après
succès, CAB SHALL supprimer ses manifests, reçus, copies de reprise et index
identifiant le change ; aucun tombstone, placeholder ou sauvegarde cible
SHALL rester par défaut.

#### Scenario: Périmètre du certificat
- **WHEN** CAB remet la preuve finale
- **THEN** elle nomme la portée réellement examinée, l’époque et les résultats
- **AND** elle ne prétend pas effacer les conversations Codex, journaux du fournisseur, snapshots système ou traces forensic du support hors périmètre

### Requirement: Vérification sans tombstone
Une réponse finale perdue SHALL être vérifiable avec le certificat externe ou
une nouvelle vérification d’absence, sans reçu cible permanent. Les époques
et compteurs globaux sans identité du change SHALL empêcher la réutilisation
des anciennes autorités. Une vérification SHALL NOT recréer des données cibles
ni supprimer une génération étrangère.

#### Scenario: Vérification après perte de la réponse finale
- **WHEN** le propriétaire présente le certificat externe ou demande une vérification d’absence du même périmètre
- **THEN** CAB vérifie l’absence sans recréer le change ni rejouer une once
- **AND** un nouveau change du même nom mais d’une génération différente n’est pas supprimé

### Requirement: Retrait terminal sans émission avant clôture
CAB SHALL proposer au propriétaire la voie qualifiée de retrait d’un
PREPARED/REJECTED sans accès ni émission et d’un PREPARED/APPROVED dont
l’accès est seulement référencé puis RELEASED. Deux frontières natives
stables, inactivité et absence de permissions/effets SHALL être exigées.
Décisions, parent et baux SHALL rester conservés ; aucun résultat,
NO_EFFECT ou once SHALL être inventé.

#### Scenario: Parent libéré après refus de rattachement
- **WHEN** le rattachement a été refusé avant toute émission, le parent est RELEASED avec reçu valide et l’enfant n’a jamais été membre
- **THEN** le propriétaire peut retirer uniquement l’enfant après qualification native
- **AND** une activité native, un parent divergent ou une ressource non réconciliée empêche le retrait

### Requirement: Certificat acquitté avant effacement de la transaction
CAB SHALL remettre un certificat CERTIFIED_PENDING_FINALIZE au propriétaire
après la vérification des données et mémoires gérées. Le propriétaire SHALL
le conserver dans son checkpoint externe avant de demander finalize.
CAB SHALL revérifier l’absence avant de supprimer ses derniers reçus.
Une vérification ultérieure SHALL être possible avec ce certificat sans
recréer de trace cible dans CAB.

#### Scenario: Réponse finale perdue
- **WHEN** la réponse de finalize est perdue après suppression de la transaction
- **THEN** verify utilise le certificat externe pour établir l’absence sans écrire ni supprimer d’état métier

### Requirement: Continuité coordonnée du nettoyage
Le pilote SHALL partager l’exclusion CABU, vérifier les unités et PID du
profil, préparer le handoff puis arrêter brièvement les seules briques CAB.
OpenCode SHALL rester démarré. Les producteurs du broker SHALL être terminés
avant préparation du réancrage. Les services SHALL redémarrer depuis les
états conservés, avec contrôles des versions, du broker et de l’absence cible.

#### Scenario: Incident avant les premières écritures
- **WHEN** la préparation hors ligne échoue avant toute écriture d’effacement et les transitions de transport sont qualifiées
- **THEN** le pilote rétablit les services avec leurs états préservés
- **AND** une transition MCP INTENT non qualifiée n’est pas rejouée

### Requirement: Catalogue sans réimportation du change effacé
Après le premier effacement ciblé, le moniteur SHALL conserver uniquement
une politique globale non identifiante de catalogue référencé. Il SHALL
reconstruire les changes à partir des seuls RUN CAB présents, sans réimporter
un change métier ouvert BLOQUÉ qui a été nettoyé. Les rapports du projet
SHALL rester intacts.

#### Scenario: Change BLOQUÉ encore présent dans OpenSpec
- **WHEN** le moniteur redémarre après l’effacement CAB et le dossier métier est toujours ouvert
- **THEN** ce dossier n’est pas réimporté dans ses vues tant qu’aucun nouveau RUN CAB ne le référence

### Requirement: Effacement multi-propriétaire sous inventaire revu
CAB SHALL fournir un prévol sans effacement du seul change avec les tuples RUN/contexte/version/propriétaire et leur empreinte canonique. Le propriétaire de clôture MAY préparer un nettoyage multi-propriétaire uniquement sous revue explicite de l’inventaire complet et références du mandat déjà autorisé. Le défaut SHALL continuer à refuser un propriétaire étranger. CAB SHALL revalider les liaisons à prepare et seal sans réécrire les propriétaires historiques.

#### Scenario: Ancien RUN temporaire du même change
- **WHEN** tous les RUN inclus sont libérés, le dernier contexte appartient au propriétaire de clôture avec gate final validé et job désarmé, et les anciens jobs sont désarmés sans effet ou ressource non soldé
- **THEN** la revue exacte permet l’inventaire des sessions de tous ces RUN et le cycle OC puis CAB, sans gate fictif historique et sans toucher aux pairs

#### Scenario: Inventaire ou attribution divergent
- **WHEN** une liaison manque, est dupliquée ou change, un autre change partage le RUN, un job est armé ou un effet reste non réconcilié
- **THEN** CAB refuse la préparation ou le scellement avant effacement et préserve les états et propriétaires

### Requirement: Terminaison historique sans champ nativeResult
CAB MAY qualifier pour l’effacement un ancien reçu COMPLETED dépourvu de nativeResult et de testReservationId, avec once acquittée, identité native complète, empreinte de fin, dates cohérentes et accès exact RELEASED muni de son empreinte de restitution. CAB SHALL conserver les données historiques sans fabriquer un statut natif ou exit. Le scope signé SHALL identifier les opérations qualifiées par cette lecture.

#### Scenario: Reçu terminal ancien complet
- **WHEN** le reçu satisfait les liaisons, empreintes et états historiques et toutes les autres gardes de clôture
- **THEN** le nettoyage peut poursuivre vers PURGED sans écrire nativeResult

#### Scenario: Reçu incomplet ou opération non terminée
- **WHEN** la once, une identité, date ou empreinte manque, un accès ne correspond pas, un bail de test manque de résultat, ou un résultat explicite est invalide
- **THEN** CAB refuse l’effacement et conserve les protections

### Requirement: Effacement exécuté sous chaque compte système
Chaque brique SHALL vérifier une intention locale authentifiée et exécuter l’effacement de ses fichiers sous son propre UID. Les clés privées SHALL rester chez leur propriétaire. Le coordinateur SHALL conserver intentions/reçus et reprendre une transaction SEALED existante sans changer son identité ou rejouer un effet métier. Après certificat externe vérifié, les reçus temporaires SHALL être supprimés et l’absence confirmée.

#### Scenario: Contrôleur et broker sous deux UID
- **WHEN** le broker ne peut pas lire les fichiers privés du contrôleur
- **THEN** il vérifie l’intention via le canal qualifié, applique sa partie sous son UID et fournit un reçu sans élargissement de permissions

### Requirement: Reçu propriétaire volumineux reprenable
Le lecteur et l’écrivain du reçu d’effacement SHALL accepter la même borne maximale128Mio, sans relâcher signature, propriétaire, type, liens ou scope. Un dépassement SHALL être refusé avant publication du candidat. La reprise d’un reçu APPLYING SHALL reconnaître les fichiers déjà aux empreintes après sans les réécrire. APPLIED SHALL rester conditionné à l’absence vérifiée des références ciblées et à la préservation des pairs.

#### Scenario: Reçu supérieur à64Mio
- **WHEN** le reçu signé APPLYING dépasse64Mio sans dépasser128Mio et les fichiers correspondent déjà aux candidats
- **THEN** le propriétaire reprend le même reçu sans rejouer les écritures et vérifie l’absence avant APPLIED

#### Scenario: Pairs avancés après application
- **WHEN** le dernier marqueur d’époque du plan signé correspond exactement au disque, après application ordonnée et persistée, mais les pairs ont ensuite progressé
- **THEN** la reprise ne réécrit aucun candidat et exige l’absence actuelle des références ciblées avant APPLIED

#### Scenario: Marqueur ou absence divergents
- **WHEN** le marqueur final signé ne correspond pas ou une référence ciblée reste présente
- **THEN** aucune progression des pairs n’est écrasée et aucun APPLIED n’est inventé

### Requirement: Compatibilité de reprise identifiée
Les helpers2.4.1/2.4.2/2.4.3 MAY reprendre une transaction v1 existante avec runtime2.4.0 explicite pour execute/finalize/verify ; les helpers2.4.2/2.4.3 MAY aussi recover-preparation. Les quatre versions et PID SHALL être contrôlés exactement, sans version arbitraire ni nouvel effacement. Le certificat SHALL distinguer helper et runtime ; le CABU global SHALL rester distinct.

#### Scenario: Reprise avant mise à jour globale
- **WHEN** un effacement2.4.0 reste engagé et le helper compatible est qualifié
- **THEN** le même reçu peut être terminé en vérifiant les processus2.4.0, puis le CABU global peut actualiser toutes les briques

### Requirement: Recherche littérale exhaustive bornée par les données
La recherche des références SHALL conserver les contrôles typés et détecter les identifiants littéraux, y compris imbriqués. Elle SHALL éviter de multiplier le coût d’analyse par une grande alternance de motifs à chaque champ. Une référence restante ou une divergence SHALL conserver le refus, jamais être assimilée à une absence.

#### Scenario: Identifiants imbriqués
- **WHEN** plusieurs identifiants ciblés se recouvrent dans une chaîne
- **THEN** leur présence est détectée sans relâcher le refus d’absence

### Requirement: Listes historiques typées conservatrices
La projection SHALL reconnaître inventory.onceAcknowledged de migration et restoredAccesses de continuité comme listes d’identifiants. Elle SHALL retirer seulement les chaînes exactement ciblées, préserver les pairs et leur ordre, et SHALL NOT altérer les booléens onceAcknowledged des opérations. Les contrôles de digest et réancrages existants SHALL rester appliqués.

#### Scenario: Inventaire de once et transfert historique
- **WHEN** un reçu historique contient des identifiants du change clos et de pairs
- **THEN** seuls ceux du change sont retirés, les booléens et identifiants des pairs restent intacts

### Requirement: Récupération de préparation sans rollback
recover-preparation SHALL exiger le même reçu signé STOPPING sans entries ni expectedPeers, des RUN clos et liaisons identiques, et NativePID/SID/permissions vérifiés. Il SHALL vérifier services et broker à la version déclarée puis recapturer leurs PID sans changer scope ou phase. Il SHALL NOT déclarer une projection réalisée ou restaurer les fichiers déjà APPLIED.

#### Scenario: Nouveaux PID après arrêt avant projection
- **WHEN** les services ont été rétablis mais le même reçu STOPPING conserve leurs anciens PID
- **THEN** la récupération vérifie les identités réelles et recapture les PID pour la reprise du même effacement

#### Scenario: Application déjà engagée
- **WHEN** le reçu porte entries ou expectedPeers, une phase après STOPPING ou des liaisons divergentes
- **THEN** recover-preparation est refusé sans rollback, changement de scope ou nouvelle transaction

### Requirement: Autorisation immuable et portée effective attestée
Le scope d’autorisation SHALL rester inchangé pour le canal propriétaire. Une portée effective MAY contenir les identifiants supplémentaires attestés par le reçu propriétaire, uniquement pour les mêmes workspace/change/RUN. Elle SHALL guider projection, statistiques et absence ; les deux scopes SHALL figurer dans le certificat. Une divergence d’identité ou la perte d’un identifiant autorisé SHALL refuser l’enrichissement.

#### Scenario: Identifiants supplémentaires du broker
- **WHEN** le broker atteste des identifiants liés au même change et aux mêmes RUN
- **THEN** ils sont couverts par la projection sans modifier le scope d’autorisation du canal

### Requirement: Candidats privés référencés et lecteurs conservateurs
Les payloads après projection MAY être stockés dans des fichiers candidats privés avec UID, type, liens, taille et SHA-256 vérifiés. Le reçu signé SHALL porter leurs références sans embarquer les payloads. Un ancien lecteur SHALL refuser avant toute écriture. Un fichier cible déjà à l’empreinte après SHALL ne pas être réécrit ; un candidat absent ou altéré nécessaire SHALL refuser l’application.

#### Scenario: Gros plan et candidat altéré
- **WHEN** le plan cumulé dépasse la borne du reçu ou un candidat nécessaire a été modifié
- **THEN** le reçu demeure borné et aucune écriture ne remplace une source depuis un candidat non vérifié

### Requirement: Compaction après preuve et retrait des candidats
Après application et absence vérifiées, le helper SHALL retirer les payloads/entries du reçu avant redémarrage, conserver les digests nécessaires et supprimer les candidats temporaires. La reprise SHALL garder le même transactionId et les contrôles avant/après ; aucun état antérieur métier SHALL être restauré.

#### Scenario: Interruption avant retrait des candidats
- **WHEN** le reçu compacté est RESTARTING et les candidats temporaires restent présents
- **THEN** la reprise les retire de façon idempotente avant remise en ligne

### Requirement: Entretien explicite des RUN fermés par lot
CAB SHALL accepter un lot explicite de RUN fermés avec liste de RUN protégés et preuve du mandat. Il SHALL refuser tout RUN RESERVED, ressource non soldée ou contexte protégé. Tous les contextes et changes historiques du lot SHALL être inventoriés et leurs jobs désarmés/gates terminaux validés. Aucun état métier SHALL être converti en réussite par cet entretien.

#### Scenario: RUN ancien réutilisé entre changes
- **WHEN** tous ses contextes sont fermés et sélectionnés pour entretien
- **THEN** leurs aliases sont inclus dans la portée authentifiée ; les autres RUN et les chats ouverts sont préservés

### Requirement: Effacement authentifié et conservation des preuves du lot
Le lot SHALL utiliser la transaction existante, son canal propriétaire, les candidats hachés, le réancrage et le certificat/finalize/verify. Rapports métier et statistiques historiques SHALL rester disponibles. Un contexte sans liaison SGS native MAY être retiré sans inventer un rapport ; toute liaison native existante SHALL conserver sa preuve durable avant purge.

#### Scenario: Lot terminé et pair actif
- **WHEN** le lot est effacé et vérifié
- **THEN** seules ses identités/ateliers/états sont absents ; PID OpenCode et identités/décisions/once/baux des pairs restent conservés

### Requirement: Rétention des identités secondaires partagées
Pour un lot fermé, CAB SHALL pouvoir ajouter des identités secondaires à la rétention sur le même reçu avant application, après preuve propriétaire PREPARED et périmètreRUN inchangé. Les RUN/SID primaires SHALL ne pas être modifiés. Projection et absence SHALL préserver ces références partagées. Une phase appliquée ou incertaine SHALL refuser cette réconciliation.

#### Scenario: Lecture historique utilisée par un RUN protégé
- **WHEN** la même identité secondaire apparaît dans le journal d’un RUN conservé
- **THEN** elle est conservée ; la transaction reprend sans élargir les RUN effacés ni supprimer le journal du pair

### Requirement: Transfert frais après projection vérifiée
CAB SHALL réancrer le transfert du même reçu après préparation propriétaire et projection vérifiées, avec PID natif et empreinte du registre inchangés. Ce renouvellement SHALL ne pas rejouer de permission ou d’effet ni modifier les pairs.

#### Scenario: Préparation longue
- **WHEN** la préparation ou projection dépasse le premier bail de transfert
- **THEN** le même transfert est renouvelé à une frontière vérifiée avant reprise des services

### Requirement: Préserver les références historiques des RUN protégés
Le lot SHALL conserver sans mutation le contenu d’un objet dont le RUN primaire est protégé et le répertoire cohérent, sous identité primaire RUN concordante. Ses seules citations textuelles ne constituent pas des données appartenant au RUN retiré. Un champ RUN cible contradictoire ou un répertoire étranger SHALL rester soumis aux contrôles ordinaires. Les références non classées hors objet protégé SHALL rester refusées.

#### Scenario: Approbation du pair citant un ancien chemin
- **WHEN** le RUN protégé possède une approbation qui cite un chemin d’un RUN retiré
- **THEN** le contenu, sa décision et son empreinte restent identiques ; le RUN retiré est effacé

#### Scenario: RUN cible ou portée ambiguë
- **WHEN** un champ RUN cible est présent ou les propriétaires se contredisent
- **THEN** aucune exemption de contrôle n’est appliquée

### Requirement: Priorité de la propriété primaire protégée
Dans un lot, CAB SHALL conserver intégralement tout objet dont les champs RUN concordent avec un RUN protégé et dont le répertoire est cohérent. Une collision d’identité secondaire, notamment SID historique ou identifiant de requête, SHALL NOT transférer sa propriété au RUN retiré. La collecte des identités, la projection et le contrôle d’absence SHALL appliquer cette même frontière. Les sentinelles textuelles null et undefined SHALL NOT être des identités de lot.

#### Scenario: SID et opération historiques réutilisés
- **WHEN** un contexte du RUN protégé et un contexte retiré partagent une identité secondaire
- **THEN** le contexte protégé reste identique et le contexte retiré est effacé

#### Scenario: RUN contradictoires ou répertoire étranger
- **WHEN** les champs RUN divergent ou le répertoire sort du workspace
- **THEN** les contrôles ordinaires restent applicables et aucune exemption n’est admise

### Requirement: Référentiel OpenSpec des dépendances
CAB SHALL résoudre les dépendances depuis OpenSpec du projet, selon les cadrages applicables. Un dossier archivé unique, sans homonyme actif et dont les tâches sont complétées SHALL attester le seul achèvement de ce change. L’historique CAB SHALL NOT servir de référentiel. Une archive ambiguë, active, incomplète ou inaccessible SHALL bloquer. Une archive documentaire SHALL NOT prouver une qualification produit ou une activation physique.

#### Scenario: Prédécesseur absent du runtime mais achevé dans OpenSpec
- **WHEN** son dossier OpenSpec archivé et ses tâches sont vérifiés
- **THEN** le contrôle de dépendance du change réussit sans recréer un RUN ni inventer un état livré

#### Scenario: Historique CAB livré sans change OpenSpec achevé
- **WHEN** le référentiel ne prouve pas l’achèvement requis
- **THEN** l’admission est refusée malgré l’ancien état du runtime

### Requirement: Récupération compatible sous registre projeté authentifié
Le profil compatible contrôleur5 SHALL exiger le même reçu signé RESTARTING, son registre projeté exact et les8RUN protégés. Il SHALL corriger le seul contrôle des dépendances vers OpenSpec ; décisions, dépendances déclarées, conflits et effets SHALL rester inchangés. Ce profil SHALL être retiré avant CABU final vers le runtime corrigé.

#### Scenario: Reprise avant CABU final
- **WHEN** le registre exact et le reçu signé correspondent et les dépendances OpenSpec sont satisfaites
- **THEN** les services reprennent sans modification de l’ancienne distribution ni rejeu d’effet
