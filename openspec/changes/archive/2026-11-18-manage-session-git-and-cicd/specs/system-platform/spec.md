## ADDED Requirements

### Requirement: Instantané Git du change
CAB MUST enregistrer en PostgreSQL, avant le travail de codage d'un change, un instantané Git lié au projet et au change, comprenant HEAD, branche et états de l'arbre et de l'index sans contenu de fichier ni secret.

#### Scenario: Démarrage et reprise
- **WHEN** le change démarre puis qu'une session le reprend
- **THEN** CAB conserve l'instantané initial et rattache les observations de session sans le remplacer.

### Requirement: Index Git isolé par session
CAB MUST lier chaque connexion MCP à son RUN natif vérifié et refuser toute opération Git demandée pour un autre RUN. Les sessions MUST réserver les fichiers auprès de CAB avant modification ; CAB MUST refuser les réservations concurrentes sur un même chemin. CAB MUST gérer un index isolé par session et refuser l'indexation d'un fichier dont l'attribution ou l'état est incertain.

#### Scenario: Deux sessions et fichier partagé
- **WHEN** deux sessions préparent des fichiers distincts ou revendiquent un même fichier
- **THEN** leurs index restent distincts et CAB refuse une attribution concurrente ambiguë.
- **AND** cette protection coopérative ne bloque pas un éditeur extérieur au protocole.

#### Scenario: Archivage du change
- **WHEN** le change est archivé avant la fin de sa livraison
- **THEN** CAB conserve les index encore nécessaires et leurs preuves jusqu'au résultat confirmé.

#### Scenario: Préservation des objets de session
- **WHEN** une étape validée est indexée
- **THEN** CAB protège l'arbre Git et son commit de base par des références internes non publiées, jusqu'à confirmation de la livraison et retrait contrôlé de l'index.

### Requirement: Livraison Git et CI/CD par CAB
Lorsque la CI/CD est autorisée, CAB MUST recevoir la version, mettre à jour `PROJECT_VERSION` sans altérer les autres valeurs, créer un commit limité à l'index de session et un tag égal à cette version, puis envoyer la branche et ce tag aux forges configurées avec protection concurrente. Les opérations Git des sessions MUST passer par CAB.

#### Scenario: Livrer la version demandée
- **WHEN** une session autorisée demande la livraison d'une version valide
- **THEN** CAB livre son commit et son tag sans intégrer les fichiers d'autres sessions ni déplacer d'autres tags ou branches.

#### Scenario: Global CAB confirmé dans le commit
- **WHEN** le STATISTICS.md global indexé correspond à une écriture CAB confirmée et au fichier courant
- **THEN** CAB peut inclure cette seule production partagée dans le commit de session, en vérifiant que son entrée d'index est restée identique.
- **AND** les autres contenus partagés ou non attribués restent préservés.

### Requirement: Builds et releases DIU orchestrés par CAB
CAB MUST exécuter au plus une fois chaque build DIU activé par la configuration du projet, puis les releases DIU activées pour les forges admissibles. CAB MUST conserver les reçus de chaque étape et ne pas rejouer un effet confirmé ou incertain.

#### Scenario: Publication conditionnelle
- **WHEN** un build ou une forge est désactivé, échoue ou retourne un résultat incertain
- **THEN** CAB indique son état et ne présente pas la publication correspondante comme réussie.

#### Scenario: Construction sur le projet courant
- **WHEN** CAB appelle un build ou une release DIU
- **THEN** il utilise les commandes DIU existantes sur le répertoire habituel du projet, sans modifier DIU ni fournir un répertoire de sources figées.
- **AND** il ne présente pas les artefacts comme exclusivement issus du commit si des modifications courantes peuvent y être incluses.
- **AND** une incompatibilité DIU est signalée sans modifier implicitement le tag demandé.

#### Scenario: Report explicite des releases DIU
- **WHEN** le développeur autorise le report des releases pour un RUN et une version
- **THEN** CAB conserve cette décision avant la livraison, exécute les envois Git et les builds activés, et enregistre les releases comme SKIPPED avec motif developer-deferred.
- **AND** il ne crée aucun tag de compatibilité ni ne présente ces releases comme publiées.
- **AND** la décision ne s'applique pas aux autres RUN ou versions.

### Requirement: Autorisation interprojets générique
CAB MUST vérifier une autorisation explicite liée à la session native, au projet cible et aux chemins concernés avant d'accepter un rattachement interprojets. Cette autorisation MUST être persistée et révocable, sans nom ou chemin de projet particulier codé dans CAB.

#### Scenario: Session autorisée pour un autre projet
- **WHEN** une session native vérifiée intervient sur un projet cible explicitement autorisé
- **THEN** CAB accepte uniquement les chemins autorisés et conserve l'identité native réelle.
- **AND** il refuse une autre cible ou un chemin hors autorisation.

### Requirement: Entrée CICD distribuée
CAB MUST distribuer un plugin CICD contenant le skill de déclenchement et de suivi de livraison, ainsi que sa commande. Ils MUST transmettre la version au parcours CAB et consulter le même reçu sans exécuter Git ni relancer un effet incertain.

#### Scenario: Parcours disponible ou connecteur ancien
- **WHEN** le développeur demande une livraison par le skill CICD
- **THEN** le skill utilise les outils MCP de livraison CAB du RUN natif vérifié.
- **AND** si ces outils sont absents, il signale leur indisponibilité sans exécution de substitution.

### Requirement: Indexation immédiate du rapport statistique global
Après chaque écriture du STATISTICS.md à la racine d'un projet Git, CAB MUST indexer uniquement ce fichier dans l'index Git ordinaire du projet et vérifier le contenu indexé avant de libérer la réservation de l'écrivain statistique. Cette opération partagée appartient à CAB et ne doit pas indexer les fichiers d'une session. Les rapports de change ne sont pas inclus dans cette exception.

#### Scenario: Écriture du global confirmée
- **WHEN** CAB modifie le rapport statistique global d'un projet Git réservé
- **THEN** CAB indexe immédiatement ce fichier sous le verrou Git et vérifie son contenu avant de terminer et libérer la réservation statistique.
- **AND** les autres entrées de l'index restent préservées.

#### Scenario: Indexation incertaine
- **WHEN** l'indexation n'est pas confirmée ou l'écrivain s'interrompt
- **THEN** CAB conserve la protection et son intention durable ; une reprise vérifie le fichier et l'index sans rejouer l'écriture.

#### Scenario: Projet sans dépôt Git
- **WHEN** le projet ne possède pas de dépôt Git
- **THEN** CAB enregistre l'indexation comme non applicable sans créer de dépôt.


### Requirement: Adoption explicite des RUN antérieurs
CAB MUST refuser toute capture historique inventée. Un administrateur explicitement autorisé MAY adopter les fichiers d'un RUN direct antérieur à la migration, après vérification de sa source native et de l'état Git. La capture MUST porter legacy-adoption et sa date réelle.

#### Scenario: Migration d'une session en cours
- **WHEN** un administrateur adopte les fichiers autorisés d'un ancien RUN vérifié
- **THEN** CAB les réserve et les prépare dans son index isolé sans prétendre avoir observé l'état initial historique.
- **AND** les nouveaux RUN et les fichiers réservés par une autre session ne peuvent pas contourner le protocole par cette entrée.
- **AND** la liste exacte, la révision et le statut Git attendus sont vérifiés avant adoption.
- **AND** les entrées déjà indexées ne sont absorbées que si leur empreinte approuvée reste identique ; les autres entrées sont préservées.

### Requirement: Preuve de livraison produite par CAB
CAB MUST produire la preuve de publication Git depuis les étapes confirmées, le tag réellement envoyé et son empreinte, au moyen d'un producteur interne ou explicitement délégué par l'administrateur pour ce RUN et cette version. Le modèle MUST NOT fabriquer cette preuve. Une release différée MUST NOT être attestée comme exécutée.

#### Scenario: Livraison Git vérifiée
- **WHEN** les envois et vérifications distantes sont confirmés et l'index est retiré de façon contrôlée
- **THEN** CAB atteste l'artefact Git avec le producteur de la politique de finalisation, en conservant les releases différées comme non exécutées.

