## MODIFIED Requirements

### Requirement: Livraison Git et CI/CD par CAB
Lorsque la CI/CD est autorisée, CAB MUST recevoir la version, mettre à jour `PROJECT_VERSION`, créer le commit et un tag égal à la version, puis envoyer la branche et ce tag aux forges configurées avec protection concurrente. Les opérations Git des sessions MUST passer par CAB.

#### Scenario: Livrer la version demandée
- **WHEN** une session autorisée demande CICD sur une version valide
- **THEN** CAB livre les fichiers préparés dans l’index du change et préserve les autres chemins


#### Scenario: Global CAB confirmé dans le commit
- **WHEN** le rapport global indexé correspond à une écriture CAB confirmée
- **THEN** CAB peut l’inclure après vérification de son entrée d’index

#### Scenario: CICDF sur le projet entier
- **WHEN** une session autorisée demande explicitement CICDF
- **THEN** CAB fige et livre les fichiers admissibles modifiés ou indexés du projet, y compris hors du change courant
- **AND THEN** CAB préserve les index isolés des autres sessions et refuse les conflits ou effets incertains
- **AND THEN** le reçu conserve le périmètre choisi sur cette version

### Requirement: Builds et releases DIU orchestrés par CAB
CAB MUST construire les artefacts activés avec ses constructeurs natifs. CAB MUST déléguer la publication des artefacts à DIU lorsque la politique de livraison l’autorise et qu’une version DIU compatible est vérifiée. CAB MUST conserver les reçus de chaque étape et ne pas rejouer un effet confirmé ou incertain.

#### Scenario: Construction sur le projet courant
- **WHEN** un projet active Debian ou Docker
- **THEN** CAB construit le format correspondant avec la recette du projet et actualise l’inventaire des artefacts observés
- **AND THEN** le reçu précise que la construction utilise le dossier de travail courant

#### Scenario: Publication conditionnelle
- **WHEN** la publication DIU est différée ou n’est pas autorisée avec une version compatible
- **THEN** CAB conserve l’étape de publication comme non exécutée
- **AND THEN** aucun tag supplémentaire de compatibilité n’est créé

#### Scenario: Report explicite des releases DIU
- **WHEN** le développeur diffère les releases pour ce RUN et cette version
- **THEN** CAB conserve le report, livre Git, construit les artefacts et inscrit les étapes DIU comme SKIPPED
- **AND THEN** la décision ne s’applique qu’à ce RUN et cette version

### Requirement: Entrée CICD distribuée
CAB MUST distribuer les plugins CICD et CICDF, leurs skills et leurs commandes. CICD MUST transmettre la version avec le périmètre du change. CICDF MUST transmettre la version avec le périmètre complet sur mandat explicite. Les deux parcours MUST consulter le même reçu sans relancer un effet incertain.


#### Scenario: Parcours disponible ou connecteur ancien
- **WHEN** un connecteur propose le point d’entrée demandé
- **THEN** le skill utilise cet outil et consulte le reçu
- **AND THEN** si l’outil manque, le skill indique que le connecteur doit être rechargé
