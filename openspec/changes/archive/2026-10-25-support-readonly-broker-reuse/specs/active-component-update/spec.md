## MODIFIED Requirements

### Requirement: Destinations fermées et privées
L'outil MUST écrire seulement dans des destinations CAB explicites hors workspace et paquet source, avec propriétaire et type vérifiés. Les liens non reconnus MUST être refusés. Un layout managed-release explicitement autorisé MAY résoudre en lecture des liens relatifs internes, installer une nouvelle release immuable puis basculer atomiquement l'entrée du contrôleur arrêté, sans écriture à travers un lien ni altération de l'ancienne release. La politique explicite reuse-readonly MUST traiter les trois artefacts broker comme entrées de lecture séparées, jamais comme destinations, même si leur propriétaire diffère de l'acteur des services.

#### Scenario: Lien non géré
- **WHEN** l'entrée est absolue, sort de la racine, traverse un lien interne ou diverge de l'autorisation
- **THEN** aucun arrêt, remplacement ou changement de lien n'est effectué

#### Scenario: Destination dans le projet
- **WHEN** une destination désigne le workspace piloté
- **THEN** l'outil refuse sans aucune écriture dans ce workspace

#### Scenario: Release gérée conservée
- **WHEN** le contrôleur est chargé depuis la nouvelle release sous autorité d'amorçage
- **THEN** la release originale reste identique et les processus broker/Web ainsi que les liens non concernés sont préservés

### Requirement: Vérification avant reprise
La réussite MUST exiger les versions propres aux processus relancés, leur workspace et les identités/générations des RUN conservées avant levée du gel. Les pauses préexistantes MUST rester inchangées. Une source inconnue MUST être déclarée indisponible, sans déduction depuis le plugin. En politique reuse-readonly, la version chargée avant maintenance MUST être observée indépendamment de la version des fichiers ; après l'intention de déconnexion, une mauvaise version MUST conserver le gel pour récupération sans faux retour au processus disparu.

#### Scenario: Broker de mauvaise version après reconnexion
- **WHEN** la readiness indique une ancienne version du broker
- **THEN** la réussite est refusée et le repli applicable est engagé, ou la récupération sous gel est exigée après la frontière reuse-readonly

### Requirement: Journal et retour arrière récupérables
L'outil MUST conserver un journal atomique privé et les sauvegardes des seuls artefacts remplacés. Un verrou MUST interdire les déploiements concurrents. Une erreur après arrêt MUST déclencher le rétablissement des artefacts et états initiaux lorsque ce repli est possible ; une interruption MUST être récupérable avant une nouvelle transaction. Le repli MUST NOT restaurer un ancien runtime métier. En politique reuse-readonly, l'intention de déconnexion MUST être durable avant l'appel natif ; après cette intention, un échec MUST conserver le gel et permettre seulement une récupération vérifiée vers le jeu autorisé, sans restaurer les artefacts broker ni annoncer le retour du processus antérieur.

#### Scenario: Démarrage de la nouvelle version échoué
- **WHEN** une brique refuse le nouveau jeu
- **THEN** les artefacts précédents et états initiaux sont rétablis lorsque le repli reste possible ; un repli incomplet ou une frontière reuse-readonly franchie conserve le gel et signale la récupération nécessaire

### Requirement: Alignement ordinaire des releases gérées
Le mode ordinaire layout=managed-release MUST préparer les briques à installer sous leurs racines autorisées, confirmer HELD, puis charger de nouvelles releases immuables et basculer les seuls pointeurs contrôlés. Il MUST préserver les releases antérieures et refuser les liens non reconnus. En politique reuse-readonly, les trois artefacts broker préexistants MUST être vérifiés sans installation ou changement de pointeur. Le succès MUST vérifier les versions réellement chargées 1.9.0, le broker reconnecté et les identités conservées avant reprise métier explicite.

#### Scenario: Après récupération mixte
- **WHEN** complete a réussi et une seconde maintenance ordinaire est explicitement autorisée
- **THEN** le contrôleur, le superviseur, le broker et le Web sont alignés sans fermeture OpenCode ni effacement de son historique

#### Scenario: Échec après bascule ordinaire
- **WHEN** le chargement échoue sous HELD après installation des nouvelles releases
- **THEN** les pointeurs et versions actives précédents sont restaurés lorsque le repli reste possible, ou la récupération sous gel est exigée après l'intention reuse-readonly, sans modifier les anciennes releases ni rejouer une permission

### Requirement: Transition mixte bornée au rétablissement
Le profil gelé MAY charger le contrôleur 1.9.0 avec broker, superviseur et Web 1.7.1 conservés, uniquement pour maintenance et récupération resource-scoped-v1 qualifiées. Il MUST publier séparément version du paquet, empreinte du contrôleur chargé et versions des processus préservés. Une autre version ou une capacité inconnue MUST refuser cette transition ; elle MUST NOT annoncer tout le runtime aligné en 1.9.0.

#### Scenario: Broker original conservé jusqu'au prévol
- **WHEN** le contrôleur 1.9.0 réconcilie puis reprend le prévol via le broker 1.7.1 conservé
- **THEN** les échanges MCP et la permission fraîche restent corrélés, le broker reste vivant et l'état mixte reste explicitement annoncé

### Requirement: Frontière avant reprise métier
Le profil mixte MUST conserver les pairs sous PAUSE explicite et limiter la reprise ciblée au prévol. complete MUST NOT valoir autorisation de mandat métier dans ce profil. Le pilotage MUST attendre un alignement homogène 1.9.0 vérifié par maintenance ordinaire distinctement autorisée, puis une reprise explicite ; aucune reconnexion ou relance MUST découler du seul incrément de version.

#### Scenario: Prévol réparé, processus encore mixtes
- **WHEN** complete a réussi avec le broker original conservé
- **THEN** aucun mandat métier n'est approuvé et les pairs restent en pause jusqu'à l'alignement et aux contrôles de reprise

## ADDED Requirements

### Requirement: Réutilisation explicite du broker externe
La politique ordinaire brokerPolicy=reuse-readonly MUST exiger une autorisation spécifique et une preuve privée liant entrée, UID/GID, manifeste exact des trois modules, version réellement chargée, instance et identités pid/startTime/uid d'OpenCode et du broker. Le profil gelé MUST refuser cette politique. Sans option, les comportements d'installation existants MUST rester conservés.

#### Scenario: Propriétaires différents
- **WHEN** les services appartiennent à un acteur et le broker à un autre UID déclaré et vérifié
- **THEN** seuls les artefacts des services sont installés et le broker est relancé par son OpenCode conservé, sans changement de configuration ou écriture intercomptes

### Requirement: Preuve des artefacts sans mutation
Les trois fichiers broker MUST être réguliers, sans liens ou alias, sous le répertoire réel déclaré, avec propriétaire, groupe et empreintes autorisés et contenu identique au paquet cible. Une dérive MUST être refusée avant arrêt ou suspendre la récupération. La maintenance MUST NOT écrire, remplacer, compiler sur place, changer les droits ou restaurer ces fichiers.

#### Scenario: Source déjà cible et processus ancien
- **WHEN** les fichiers sont 1.9.0 mais le broker vivant est encore 1.7.1
- **THEN** le bilan distingue ces versions et aucun fichier broker n'est remplacé pour provoquer son chargement

### Requirement: Intention durable et récupération conservatoire
Le journal MUST persister l'intention avant la première déconnexion et conserver versions d'artefacts et processus séparées. Après cette intention, tout échec ou résultat ambigu MUST conserver la maintenance et les PAUSE et MUST NOT annoncer ROLLED_BACK vers l'ancien processus. Une reprise MUST réutiliser le même journal et recontrôler autorité, génération, artefacts et identités avant poursuite ; le rollback manuel MUST NOT contourner cette frontière.

#### Scenario: Déconnexion appliquée puis réponse perdue
- **WHEN** l'ancien broker a disparu et l'appel de déconnexion ne retourne pas de résultat exploitable
- **THEN** le gel est conservé et la reprise réconcilie les processus et l'état MCP avant toute action suivante

### Requirement: Succès lié au nouveau processus
Le succès reuse-readonly MUST prouver un nouveau broker enfant du même OpenCode, sous l'UID attendu, depuis l'entrée autorisée, avec readiness de version cible et instance fraîche reçue après reconnexion. Les états actifs initiaux, jobs, réservations et PAUSE MUST être conservés. Le succès de maintenance MUST NOT autoriser le métier.

#### Scenario: Entrée ou parent différent
- **WHEN** la version paraît correcte mais le processus n'a pas l'entrée ou le parent autorisé
- **THEN** la maintenance reste gelée et aucun succès n'est annoncé

### Requirement: Qualification réelle de deux identités système
La qualification du mode entre comptes MUST exécuter l'acteur de maintenance et les services sous un UID et le serveur OpenCode simulé ainsi que son enfant broker sous un autre UID réel dans un banc isolé. Elle MUST vérifier identités et absence d'écriture broker sans simuler les propriétaires. Elle MUST NOT modifier comptes, droits, configuration ou services de l'hôte réel.

#### Scenario: Banc indisponible
- **WHEN** le banc à deux UID n'est pas exécutable dans l'environnement de test autorisé
- **THEN** cette qualification reste indisponible et MUST NOT être remplacée par une affirmation fondée seulement sur des mocks
