# active-component-update Specification

## Purpose
Mettre à jour les quatre briques CAB, y compris actives, par une transaction de maintenance contrôlée et récupérable, en conservant les RUN, leurs preuves et les états actif/inactif initiaux.

## Requirements

### Requirement: Paquet complet et vérifié
Le plugin MUST distribuer le broker Python complet synchronisé avec src/, les scripts CAB, unités et ressources Web. L'outil MUST vérifier version, fermeture des imports, syntaxe et empreintes du jeu avant toute mutation des services. Un downgrade ou un paquet incomplet MUST être refusé.

#### Scenario: Module broker absent
- **WHEN** le paquet ne contient pas le routeur Python attendu
- **THEN** la mise à jour échoue avant arrêt ou remplacement

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

### Requirement: Maintenance durable et frontière sûre
Le profil ordinaire MUST acquérir SHARED_MAINTENANCE et confirmer HELD après quiescence avant arrêt. Seul frozen-recovery-controller MAY suivre l'autorité BOOTSTRAP_HELD spécifiée, sans falsifier le HELD original. Aucun profil MUST décider, rejouer une permission ou purger le runtime. Une attente bornée MUST conserver processus et gel.

#### Scenario: RUN encore occupé
- **WHEN** la cohorte reste occupée à l'échéance
- **THEN** la transaction reste en attente, aucun artefact actif n'est remplacé et aucun processus n'est arrêté

### Requirement: Déploiement des quatre briques et états conservés
Le profil ordinaire MUST prendre en charge les quatre briques et restaurer leurs états actif/inactif initiaux. Le profil frozen-recovery-controller MUST conserver broker, OpenCode et Web et ne remplacer que la fermeture d'imports du contrôleur, avec suspension contrôlée du superviseur. Aucune activation au login MUST être ajoutée.

#### Scenario: Web actif et superviseur inactif
- **WHEN** le profil ordinaire met à jour ces composants
- **THEN** le Web actif est relancé sur le nouveau jeu et le superviseur reste inactif

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

### Requirement: Idempotence et bilan explicite
Un jeu déjà conforme MUST être conservé sans redémarrage inutile. Le bilan MUST distinguer paquet disponible, fichiers déployés, versions réellement actives, états inactifs, attente et repli. Une opération sur des schémas incompatibles MUST être refusée sans migration implicite.

#### Scenario: Deuxième invocation inchangée
- **WHEN** les empreintes et versions sont conformes
- **THEN** les briques actives restent en place et le bilan indique déjà à jour

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

### Requirement: Profil de maintenance du contrôleur gelé
Le profil frozen-recovery-controller MUST préparer une fermeture d'imports vérifiée et sauvegardée, conserver OpenCode, broker et Web, puis restaurer l'état initial du superviseur. Il MUST exiger autorisation humaine spécifique, transaction durable et preuves indépendantes. Les autres profils MUST conserver leurs gardes.

#### Scenario: Broker conservé
- **WHEN** ce profil charge le contrôleur corrigé
- **THEN** aucun arrêt, remplacement ou connect/disconnect du broker et aucun arrêt OpenCode ou Web n'est effectué

### Requirement: Amorçage explicitement distinct du HELD original
Pour un original 1.7.1 identifié, un reçu privé BOOTSTRAP_HELD MAY autoriser l'arrêt contrôlé après DRAINING corrélé et refus normal observé, uniquement avec preuve fraîche cumulative d'absence d'effet. Il MUST NOT être présenté comme HELD du contrôleur original. Le nouveau contrôleur MUST adopter et recontrôler le reçu avant son vrai HELD.

#### Scenario: Refus original conservé
- **WHEN** l'ancien contrôleur refuse HELD pour la récupération gelée admissible
- **THEN** ce refus reste prouvé et seule l'autorité d'amorçage explicitement autorisée peut permettre le chargement

### Requirement: Repli conservatoire du profil gelé
Le repli MUST préserver les états métier et historiques, restaurer seulement les artefacts compatibles et signaler ROLLED_BACK_FROZEN si la maintenance reste gelée. Un reçu REJECTION_ONLY MUST interdire un retour à un lecteur incompatible. Une interruption MUST reprendre le même journal sans permission ou effet rejoué.

#### Scenario: Original restauré sous drainage
- **WHEN** le nouveau chargement échoue avant reçu REJECTION_ONLY
- **THEN** le code original peut être rétabli sans restaurer un ancien registre et sans annoncer la maintenance libérée

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
