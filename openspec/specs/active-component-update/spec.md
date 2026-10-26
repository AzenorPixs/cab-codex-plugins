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
L'outil MUST réserver les écritures aux destinations CAB explicites hors workspace et paquet, avec type et propriétaire vérifiés. Les liens non reconnus MUST être refusés. managed-release autorisé MAY lire les liens relatifs internes, installer une release immuable et basculer atomiquement l'entrée du contrôleur arrêté, sans écrire à travers un lien ni modifier l'ancienne release. reuse-readonly MUST exclure les trois artefacts broker de toute destination.

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
La réussite MUST vérifier versions des processus relancés, workspace, identités et générations avant levée du gel. Les PAUSE MUST être conservées. Une source inconnue MUST rester indisponible, sans déduction du plugin. reuse-readonly MUST distinguer versions chargée et sur disque ; après intention de déconnexion, une mauvaise version MUST conserver le gel pour récupération sans faux rollback.

#### Scenario: Broker de mauvaise version après reconnexion
- **WHEN** la readiness indique une ancienne version du broker
- **THEN** la réussite est refusée et le repli applicable est engagé, ou la récupération sous gel est exigée après la frontière reuse-readonly

### Requirement: Journal et retour arrière récupérables
Un verrou exclusif MUST protéger journal privé atomique et sauvegardes des seuls artefacts remplacés. Après arrêt, un échec MUST rétablir si possible artefacts et états initiaux, sans restaurer un runtime métier. Une interruption MUST être récupérable avant une autre transaction. reuse-readonly MUST persister l'intention avant déconnexion ; un échec ultérieur MUST conserver le gel pour récupération vers la cible, sans restaurer le broker ni prétendre rétablir l'ancien processus.

#### Scenario: Démarrage de la nouvelle version échoué
- **WHEN** une brique refuse le nouveau jeu
- **THEN** les artefacts précédents et états initiaux sont rétablis lorsque le repli reste possible ; un repli incomplet ou une frontière reuse-readonly franchie conserve le gel et signale la récupération nécessaire

### Requirement: Idempotence et bilan explicite
Un jeu déjà conforme MUST être conservé sans redémarrage inutile. Le bilan MUST distinguer paquet disponible, fichiers déployés, versions réellement actives, états inactifs, attente et repli. Une opération sur des schémas incompatibles MUST être refusée sans migration implicite.

#### Scenario: Deuxième invocation inchangée
- **WHEN** les empreintes et versions sont conformes
- **THEN** les briques actives restent en place et le bilan indique déjà à jour

### Requirement: Alignement ordinaire des releases gérées
managed-release MUST préparer les briques à installer dans leurs racines autorisées, confirmer HELD et basculer atomiquement les pointeurs contrôlés vers des releases immuables, sans altérer les anciennes. Les liens non reconnus MUST être refusés. reuse-readonly MUST vérifier les trois artefacts broker sans installation ou bascule. Le succès MUST prouver les versions chargées 1.10.4, la reconnexion broker et les identités conservées avant reprise métier explicite.

#### Scenario: Après récupération mixte
- **WHEN** complete a réussi et une seconde maintenance ordinaire est explicitement autorisée
- **THEN** le contrôleur, le superviseur, le broker et le Web sont alignés sans fermeture OpenCode ni effacement de son historique

#### Scenario: Échec après bascule ordinaire
- **WHEN** le chargement échoue sous HELD après installation des nouvelles releases
- **THEN** les pointeurs et versions actives précédents sont restaurés lorsque le repli reste possible, ou la récupération sous gel est exigée après l'intention reuse-readonly, sans modifier les anciennes releases ni rejouer une permission

### Requirement: Transition mixte bornée au rétablissement
Le profil gelé MAY charger le contrôleur 1.10.4 avec broker, superviseur et Web 1.7.1 conservés, uniquement pour maintenance et récupération resource-scoped-v1 qualifiées. Il MUST publier séparément version du paquet, empreinte du contrôleur chargé et versions des processus préservés. Une autre version ou une capacité inconnue MUST refuser cette transition ; elle MUST NOT annoncer tout le runtime aligné en 1.10.4.

#### Scenario: Broker original conservé jusqu'au prévol
- **WHEN** le contrôleur 1.10.4 réconcilie puis reprend le prévol via le broker 1.7.1 conservé
- **THEN** les échanges MCP et la permission fraîche restent corrélés, le broker reste vivant et l'état mixte reste explicitement annoncé

### Requirement: Frontière avant reprise métier
Le profil mixte MUST conserver les pairs sous PAUSE explicite et limiter la reprise ciblée au prévol. complete MUST NOT valoir autorisation de mandat métier dans ce profil. Le pilotage MUST attendre un alignement homogène 1.10.4 vérifié par maintenance ordinaire distinctement autorisée, puis une reprise explicite ; aucune reconnexion ou relance MUST découler du seul incrément de version.

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
- **WHEN** les fichiers sont 1.10.4 mais le broker vivant est encore 1.7.1
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

### Requirement: Transition du broker chargé 1.9.0 vers 1.10.0
La politique ordinaire reuse-readonly de CAB 1.10.4 MUST accepter une preuve exacte de broker chargé 1.9.0, avec les artefacts externes 1.10.4 inchangés. Elle MUST conserver les contrôles de propriétaire, groupe, manifeste, processus, PAUSE et maintenance. Les versions inconnues MUST rester refusées ; la version chargée MUST NOT être remplacée par la version sur disque dans la preuve.

#### Scenario: Broker 1.9.0 et artefacts 1.10.0
- **WHEN** les quatre services chargent 1.9.0 et les trois artefacts broker externes correspondent à 1.10.4 sous leur UID réel
- **THEN** la maintenance qualifiée conserve OpenCode, les artefacts et les PAUSE, puis prouve quatre briques 1.10.4 avant libération du gel

#### Scenario: Version chargée inconnue
- **WHEN** la preuve annonce une version hors de la liste qualifiée
- **THEN** le validateur refuse avant mutation sans contourner une garde de propriété ou de processus

#### Scenario: Déconnexion appliquée et réponse perdue
- **WHEN** une déconnexion sous HELD est appliquée mais son résultat devient ambigu
- **THEN** la reprise utilise le même journal, conserve le gel jusqu'à réconciliation et ne restaure ni ancien processus ni état métier

### Requirement: Registre de maintenance borné à seize Mio
L'updater ordinaire MUST lire intégralement jusqu'à 16 Mio le GET exact /runs et le fichier privé controller-runs.json. Les autres réponses HTTP MUST conserver 2 Mio et les autres fichiers 4 Mio. Il MUST compter les octets reçus avant de parser le JSON. Un dépassement MUST être refusé sans troncature, purge ou admission partielle. Les contrôles d'identité, génération, permissions, PAUSE et HELD MUST rester appliqués.

#### Scenario: Registre valide au-delà des anciennes limites
- **WHEN** le snapshot dépasse 2 Mio et le fichier privé dépasse 4 Mio, chacun sous 16 Mio
- **THEN** la maintenance conserve toutes les identités et preuves et peut poursuivre après les gardes ordinaires

#### Scenario: Dépassement du registre HTTP
- **WHEN** GET /runs fournit plus de 16 Mio
- **THEN** la lecture échoue avec update-response-too-large avant utilisation du snapshot

#### Scenario: Autre réponse volumineuse
- **WHEN** /status dépasse 2 Mio
- **THEN** sa limite reste appliquée et aucune augmentation globale n'est déduite de l'exception /runs

### Requirement: Réparation explicite du lecteur sous gel existant
Une réparation autorisée MUST conserver le même identifiant de maintenance, HELD et générations, vérifier PAUSE, quiescence native, OpenCode et broker déconnecté. Elle MUST préserver le journal et stages initiaux et ne réviser que le candidat de code explicitement qualifié. Le registre métier et les anciennes releases MUST NOT être réécrits. Une dérive MUST refuser avant application.

#### Scenario: Lecteur incompatible avec une clé historique
- **WHEN** le contrôleur cible échoue à restaurer une histoire valide et la correction du lecteur est qualifiée
- **THEN** un plan récupérable prépare une nouvelle release immuable sous le même journal, puis l'updater vérifie versions et identités avant toute libération

#### Scenario: Candidat ou autorité divergent
- **WHEN** le code contient une autre modification ou le HELD, le registre, les permissions ou le processus OpenCode divergent
- **THEN** aucune révision technique n'est appliquée et le gel reste conservé

#### Scenario: Reprise du plan interrompu
- **WHEN** la même réparation est réémise avec le même candidat et autorisation
- **THEN** les copies et étapes déjà prouvées sont réutilisées sans nouvelle maintenance ni restauration de données métier

### Requirement: Identification du broker enfant de tout thread OpenCode
La découverte du broker MUST examiner les enfants de tous les threads du processus OpenCode déclaré et dédupliquer leurs PID. Elle MUST conserver les contrôles d'UID, PPID, forme de lancement, point d'entrée, identité stable et unicité. Elle MUST recontrôler l'identité OpenCode après découverte. La disparition concurrente d'un thread MAY être ignorée ; toute autre erreur MUST rester bloquante. La découverte MUST NOT exposer d'environnement ou d'argv brut.

#### Scenario: Broker créé depuis un thread secondaire
- **WHEN** le broker unique déclaré est lancé par un thread secondaire du même OpenCode
- **THEN** sa preuve est reconnue avec les mêmes contrôles stricts et le processus OpenCode est conservé

#### Scenario: Enfant absent ou multiple
- **WHEN** aucun candidat ou plusieurs candidats satisfont les contrôles
- **THEN** la vérification est refusée et la maintenance reste gelée

#### Scenario: Parent ou lancement divergent
- **WHEN** l'UID, le PPID, la commande, le point d'entrée ou l'identité OpenCode diffère de la preuve
- **THEN** aucun candidat divergent n'est reconnu et aucune permission n'est accordée

### Requirement: Origine chargée 1.10.2 qualifiée
La maintenance reuse-readonly vers 1.10.4 MUST admettre une preuve exacte de broker chargé 1.10.2 et conserver les contrôles de propriétaire, artefacts, processus, PAUSE et HELD. La qualification MUST employer deux UID réels et préserver OpenCode, identités et données. La préparation source MUST NOT activer le runtime.

#### Scenario: Transition depuis la release précédente
- **WHEN** le banc isolé met à jour un jeu chargé 1.10.2 vers les artefacts 1.10.4
- **THEN** les quatre versions sont vérifiées avec OpenCode, sources broker et pauses conservés, y compris après réponse de déconnexion perdue

### Requirement: Transition ordinaire depuis le jeu précédent 1.10.3
La maintenance reuse-readonly vers 1.10.4 MUST conserver 1.10.3 parmi les origines admises, avec preuves exactes d'artefacts, UID, processus, PAUSE et HELD. Une version inconnue MUST rester refusée. La qualification MUST employer deux UID réels sans écriture dans les artefacts broker par l'acteur de maintenance.

#### Scenario: Transition depuis 1.10.3
- **WHEN** le banc isolé passe du jeu chargé 1.10.3 aux artefacts 1.10.4
- **THEN** succès et réponse de déconnexion perdue sont vérifiés avec les quatre versions finales, identités et OpenCode conservés, sans activation consommateur
