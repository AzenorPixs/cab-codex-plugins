# change-state-erasure Specification

## Purpose

Garantir l’effacement terminal ciblé des états CAB après clôture sûre et nettoyage natif, sans perte des protections ou des données des autres RUN.

## Requirements

### Requirement: Éligibilité terminale qualifiée
CAB SHALL permettre au propriétaire mandaté le nettoyage terminal après gate
TERMINÉ validé, ou après arrêt pour dépendance insatisfaite avec gate BLOQUÉ
validé. Le job SHALL être désarmé et le RUN libéré. Une pause, un blocage
technique ou une fin de mandat SHALL NOT qualifier un arrêt pour dépendance.
La revue et les validations métier SHALL appartenir à l’orchestrateur.

#### Scenario: Change finalisé
- **WHEN** le propriétaire a validé TERMINÉ et tous les rapports attendus, désarmé le job et libéré le RUN
- **THEN** CAB permet la préparation du nettoyage terminal ciblé sans nouvelle approbation du développeur dans ce périmètre

#### Scenario: Arrêt pour dépendance non satisfaite
- **WHEN** le propriétaire a validé le bilan de dépendances et les statistiques puis clos BLOQUÉ et libéré le RUN
- **THEN** CAB permet le nettoyage sans livrer ni archiver le change
- **AND** le dossier métier et ses preuves restent hors purge CAB

### Requirement: Protection des effets non réconciliés
CAB SHALL refuser l’effacement en présence d’effet ISSUING, EXECUTING, UNKNOWN,
once acquittée sans résultat réconcilié, permission en attente, accès ou bail
non libéré dans la cible. CAB SHALL préserver les preuves et protections et
indiquer le motif précis. L’archivage métier SHALL NOT prouver la résolution
technique d’un effet.

#### Scenario: Port protégé sans résultat natif
- **WHEN** le change métier est archivé mais une once sans résultat laisse un port HELD
- **THEN** CAB refuse l’effacement et conserve les preuves et protections nécessaires à sa réconciliation

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
