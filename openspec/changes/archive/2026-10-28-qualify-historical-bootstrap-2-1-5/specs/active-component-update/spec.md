## MODIFIED Requirements

### Requirement: Transition mixte bornée au rétablissement
Le profil gelé MAY charger le contrôleur 2.1.5 avec broker, superviseur et Web 1.7.1 conservés, uniquement pour maintenance et récupération resource-scoped-v1 qualifiées. Il MUST publier séparément version du paquet, empreinte du contrôleur chargé et versions des processus préservés. Une autre version ou une capacité inconnue MUST refuser cette transition ; elle MUST NOT annoncer tout le runtime aligné en 2.1.5.

#### Scenario: Broker original conservé jusqu'au prévol
- **WHEN** le contrôleur 2.1.5 réconcilie puis reprend le prévol via le broker 1.7.1 conservé
- **THEN** les échanges MCP et la permission fraîche restent corrélés, le broker reste vivant et l'état mixte reste explicitement annoncé

### Requirement: Frontière avant reprise métier
Le profil mixte MUST conserver les pairs sous PAUSE explicite et limiter la reprise ciblée au prévol. complete MUST NOT valoir autorisation de mandat métier dans ce profil. Le pilotage MUST attendre un alignement homogène 2.1.5 vérifié par maintenance ordinaire distinctement autorisée, puis une reprise explicite ; aucune reconnexion ou relance MUST découler du seul incrément de version.

#### Scenario: Prévol réparé, processus encore mixtes
- **WHEN** complete a réussi avec le broker original conservé
- **THEN** aucun mandat métier n'est approuvé et les pairs restent en pause jusqu'à l'alignement et aux contrôles de reprise

### Requirement: Preuve des artefacts sans mutation
Les trois fichiers broker MUST être réguliers, sans liens ou alias, sous le répertoire réel déclaré, avec propriétaire, groupe et empreintes autorisés et contenu identique au paquet cible. Une dérive MUST être refusée avant arrêt ou suspendre la récupération. La maintenance MUST NOT écrire, remplacer, compiler sur place, changer les droits ou restaurer ces fichiers.

#### Scenario: Source déjà cible et processus ancien
- **WHEN** les fichiers sont 2.1.5 mais le broker vivant est encore 1.7.1
- **THEN** le bilan distingue ces versions et aucun fichier broker n'est remplacé pour provoquer son chargement


## ADDED Requirements

### Requirement: Empreinte stable de la transition historique
L’empreinte de maintenance MUST protéger toutes les données du registre, sauf les champs déjà neutralisés version et coordination.global et l’annonce publique testResourceProtocol. Cette annonce MUST être absente ou égale à test-resources-v1 ; toute autre valeur MUST être refusée. Son exclusion MUST NOT autoriser une réservation de test ni exclure les données de réservation de l’empreinte.

#### Scenario: Annonce ajoutée sans changement métier
- **WHEN** un lecteur récent ajoute seulement testResourceProtocol=test-resources-v1 à l’observation du registre historique
- **THEN** l’empreinte métier demeure identique sans attribuer cette capacité au processus historique

#### Scenario: Annonce inconnue ou registre modifié
- **WHEN** l’annonce porte une valeur inconnue ou un autre champ métier du registre change
- **THEN** la valeur inconnue est refusée ou l’empreinte change, interdisant une adoption sous l’ancienne preuve
