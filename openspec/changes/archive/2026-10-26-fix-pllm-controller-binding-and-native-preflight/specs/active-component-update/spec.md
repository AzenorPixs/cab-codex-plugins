
## MODIFIED Requirements

### Requirement: Alignement ordinaire des releases gérées
managed-release MUST préparer les briques à installer dans leurs racines autorisées, confirmer HELD et basculer atomiquement les pointeurs contrôlés vers des releases immuables, sans altérer les anciennes. Les liens non reconnus MUST être refusés. reuse-readonly MUST vérifier les trois artefacts broker sans installation ou bascule. Le succès MUST prouver les versions chargées 1.10.3, la reconnexion broker et les identités conservées avant reprise métier explicite.

#### Scenario: Après récupération mixte
- **WHEN** complete a réussi et une seconde maintenance ordinaire est explicitement autorisée
- **THEN** le contrôleur, le superviseur, le broker et le Web sont alignés sans fermeture OpenCode ni effacement de son historique

#### Scenario: Échec après bascule ordinaire
- **WHEN** le chargement échoue sous HELD après installation des nouvelles releases
- **THEN** les pointeurs et versions actives précédents sont restaurés lorsque le repli reste possible, ou la récupération sous gel est exigée après l'intention reuse-readonly, sans modifier les anciennes releases ni rejouer une permission

### Requirement: Transition mixte bornée au rétablissement
Le profil gelé MAY charger le contrôleur 1.10.3 avec broker, superviseur et Web 1.7.1 conservés, uniquement pour maintenance et récupération resource-scoped-v1 qualifiées. Il MUST publier séparément version du paquet, empreinte du contrôleur chargé et versions des processus préservés. Une autre version ou une capacité inconnue MUST refuser cette transition ; elle MUST NOT annoncer tout le runtime aligné en 1.10.3.

#### Scenario: Broker original conservé jusqu'au prévol
- **WHEN** le contrôleur 1.10.3 réconcilie puis reprend le prévol via le broker 1.7.1 conservé
- **THEN** les échanges MCP et la permission fraîche restent corrélés, le broker reste vivant et l'état mixte reste explicitement annoncé

### Requirement: Frontière avant reprise métier
Le profil mixte MUST conserver les pairs sous PAUSE explicite et limiter la reprise ciblée au prévol. complete MUST NOT valoir autorisation de mandat métier dans ce profil. Le pilotage MUST attendre un alignement homogène 1.10.3 vérifié par maintenance ordinaire distinctement autorisée, puis une reprise explicite ; aucune reconnexion ou relance MUST découler du seul incrément de version.

#### Scenario: Prévol réparé, processus encore mixtes
- **WHEN** complete a réussi avec le broker original conservé
- **THEN** aucun mandat métier n'est approuvé et les pairs restent en pause jusqu'à l'alignement et aux contrôles de reprise

### Requirement: Preuve des artefacts sans mutation
Les trois fichiers broker MUST être réguliers, sans liens ou alias, sous le répertoire réel déclaré, avec propriétaire, groupe et empreintes autorisés et contenu identique au paquet cible. Une dérive MUST être refusée avant arrêt ou suspendre la récupération. La maintenance MUST NOT écrire, remplacer, compiler sur place, changer les droits ou restaurer ces fichiers.

#### Scenario: Source déjà cible et processus ancien
- **WHEN** les fichiers sont 1.10.3 mais le broker vivant est encore 1.7.1
- **THEN** le bilan distingue ces versions et aucun fichier broker n'est remplacé pour provoquer son chargement

### Requirement: Transition du broker chargé 1.9.0 vers 1.10.0
La politique ordinaire reuse-readonly de CAB 1.10.3 MUST accepter une preuve exacte de broker chargé 1.9.0, avec les artefacts externes 1.10.3 inchangés. Elle MUST conserver les contrôles de propriétaire, groupe, manifeste, processus, PAUSE et maintenance. Les versions inconnues MUST rester refusées ; la version chargée MUST NOT être remplacée par la version sur disque dans la preuve.

#### Scenario: Broker 1.9.0 et artefacts 1.10.0
- **WHEN** les quatre services chargent 1.9.0 et les trois artefacts broker externes correspondent à 1.10.3 sous leur UID réel
- **THEN** la maintenance qualifiée conserve OpenCode, les artefacts et les PAUSE, puis prouve quatre briques 1.10.3 avant libération du gel

#### Scenario: Version chargée inconnue
- **WHEN** la preuve annonce une version hors de la liste qualifiée
- **THEN** le validateur refuse avant mutation sans contourner une garde de propriété ou de processus

#### Scenario: Déconnexion appliquée et réponse perdue
- **WHEN** une déconnexion sous HELD est appliquée mais son résultat devient ambigu
- **THEN** la reprise utilise le même journal, conserve le gel jusqu'à réconciliation et ne restaure ni ancien processus ni état métier

## ADDED Requirements

### Requirement: Origine chargée 1.10.2 qualifiée
La maintenance reuse-readonly vers 1.10.3 MUST admettre une preuve exacte de broker chargé 1.10.2 et conserver les contrôles de propriétaire, artefacts, processus, PAUSE et HELD. La qualification MUST employer deux UID réels et préserver OpenCode, identités et données. La préparation source MUST NOT activer le runtime.

#### Scenario: Transition depuis la release précédente
- **WHEN** le banc isolé met à jour un jeu chargé 1.10.2 vers les artefacts 1.10.3
- **THEN** les quatre versions sont vérifiées avec OpenCode, sources broker et pauses conservés, y compris après réponse de déconnexion perdue
