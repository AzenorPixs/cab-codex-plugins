

## MODIFIED Requirements

### Requirement: Alignement ordinaire des releases gérées
managed-release MUST préparer les briques à installer dans leurs racines autorisées, confirmer HELD et basculer atomiquement les pointeurs contrôlés vers des releases immuables, sans altérer les anciennes. Les liens non reconnus MUST être refusés. reuse-readonly MUST vérifier les trois artefacts broker sans installation ou bascule. Le succès MUST prouver les versions chargées 1.10.0, la reconnexion broker et les identités conservées avant reprise métier explicite.

#### Scenario: Après récupération mixte
- **WHEN** complete a réussi et une seconde maintenance ordinaire est explicitement autorisée
- **THEN** le contrôleur, le superviseur, le broker et le Web sont alignés sans fermeture OpenCode ni effacement de son historique

#### Scenario: Échec après bascule ordinaire
- **WHEN** le chargement échoue sous HELD après installation des nouvelles releases
- **THEN** les pointeurs et versions actives précédents sont restaurés lorsque le repli reste possible, ou la récupération sous gel est exigée après l'intention reuse-readonly, sans modifier les anciennes releases ni rejouer une permission

### Requirement: Transition mixte bornée au rétablissement
Le profil gelé MAY charger le contrôleur 1.10.0 avec broker, superviseur et Web 1.7.1 conservés, uniquement pour maintenance et récupération resource-scoped-v1 qualifiées. Il MUST publier séparément version du paquet, empreinte du contrôleur chargé et versions des processus préservés. Une autre version ou une capacité inconnue MUST refuser cette transition ; elle MUST NOT annoncer tout le runtime aligné en 1.10.0.

#### Scenario: Broker original conservé jusqu'au prévol
- **WHEN** le contrôleur 1.10.0 réconcilie puis reprend le prévol via le broker 1.7.1 conservé
- **THEN** les échanges MCP et la permission fraîche restent corrélés, le broker reste vivant et l'état mixte reste explicitement annoncé

### Requirement: Frontière avant reprise métier
Le profil mixte MUST conserver les pairs sous PAUSE explicite et limiter la reprise ciblée au prévol. complete MUST NOT valoir autorisation de mandat métier dans ce profil. Le pilotage MUST attendre un alignement homogène 1.10.0 vérifié par maintenance ordinaire distinctement autorisée, puis une reprise explicite ; aucune reconnexion ou relance MUST découler du seul incrément de version.

#### Scenario: Prévol réparé, processus encore mixtes
- **WHEN** complete a réussi avec le broker original conservé
- **THEN** aucun mandat métier n'est approuvé et les pairs restent en pause jusqu'à l'alignement et aux contrôles de reprise

### Requirement: Preuve des artefacts sans mutation
Les trois fichiers broker MUST être réguliers, sans liens ou alias, sous le répertoire réel déclaré, avec propriétaire, groupe et empreintes autorisés et contenu identique au paquet cible. Une dérive MUST être refusée avant arrêt ou suspendre la récupération. La maintenance MUST NOT écrire, remplacer, compiler sur place, changer les droits ou restaurer ces fichiers.

#### Scenario: Source déjà cible et processus ancien
- **WHEN** les fichiers sont 1.10.0 mais le broker vivant est encore 1.7.1
- **THEN** le bilan distingue ces versions et aucun fichier broker n'est remplacé pour provoquer son chargement
