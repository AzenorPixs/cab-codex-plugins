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
L'outil MUST limiter les écritures aux destinations CAB explicites hors workspace, paquet et caches, sauf l'exception `cab-source` définie ci-dessous. Les types, propriétaires et liens MUST être vérifiés. managed-release MAY basculer les liens relatifs reconnus vers une release immuable sans modifier l'ancienne. reuse-readonly MUST exclure les trois artefacts broker de toute destination.

#### Scenario: Lien non géré
- **WHEN** l'entrée est absolue, sort de la racine, traverse un lien interne ou diverge de l'autorisation
- **THEN** aucun arrêt, remplacement ou changement de lien n'est effectué

#### Scenario: Destination dans le projet
- **WHEN** une destination désigne le workspace piloté sans satisfaire l’exception explicite `cab-source`
- **THEN** l'outil refuse sans aucune écriture dans ce workspace

#### Scenario: Release gérée conservée
- **WHEN** le contrôleur est chargé depuis la nouvelle release sous autorité d'amorçage
- **THEN** la release originale reste identique et les processus broker/Web ainsi que les liens non concernés sont préservés

### Requirement: Exception explicite pour les sources CAB
La politique cab-source MUST limiter le broker aux trois modules ordinaires de <workspace>/src. managed-release MAY gérer les scripts des services et le Web. Le projet MUST être nommé cab dans pyproject.toml et son manifeste CAB MUST correspondre au paquet installé. Les contrôles de type, propriétaire et absence de liens broker MUST rester applicables. Toute autre destination dans le workspace ou les caches MUST être refusée.

#### Scenario: Broker source du dépôt CAB
- **WHEN** la politique `cab-source` vise exactement src/ dans un dépôt CAB identifié et conforme au manifeste CAB installé
- **THEN** seuls les trois modules broker nommés sont sauvegardés et remplacés transactionnellement ; les autres sources restent intactes

#### Scenario: Exception source non prouvée
- **WHEN** le projet, le manifeste CAB, le chemin src/ ou les contrôles de liens ne sont pas conformes
- **THEN** l'outil refuse avant arrêt des services ou création du journal de transaction

#### Scenario: Installation mixte prouvée
- **WHEN** cab-source et managed-release sont fournis ensemble avec trois modules broker source ordinaires
- **THEN** les services et le Web basculent par liens gérés, les seuls trois modules broker sont remplacés en fichiers ordinaires et le repli restaure chaque type original

### Requirement: Workspace des services conservé
Avec `cab-source`, l'option explicite `--service-workspace` MAY désigner le workspace absolu existant des services, distinct de la racine source CAB. Les vérifications HTTP et les appels natifs MCP MUST utiliser ce workspace. Les configurations existantes MUST rester intactes. La récupération MUST conserver le même journal et les mêmes destinations d'artefacts.

#### Scenario: Services attachés à un autre projet
- **WHEN** le paquet est préparé depuis CAB et les services existants déclarent un autre workspace explicitement fourni
- **THEN** le contrôle des versions exige ce workspace réel, sans réécriture des configurations

### Requirement: Fermeture indépendante du moniteur
Le jeu indépendant du moniteur MUST inclure le client OpenCode V2 importé par monitor-data, avec la même version que les autres modules.

#### Scenario: Moniteur déployé séparément
- **WHEN** l'updater installe le jeu indépendant Web
- **THEN** les imports du moniteur sont tous présents et le client V2 est sauvegardé et remplacé transactionnellement

### Requirement: Mise à jour forcée des services CAB
Le profil ordinaire MUST valider et sauvegarder le paquet, arrêter controller,
supervisor et monitor, remplacer les quatre briques, recharger systemd puis
démarrer les trois unités. Il MUST NOT consulter les RUN, permissions,
coordinations globales ou états de service comme précondition. OpenCode absent
MUST NOT bloquer l'installation des fichiers broker. Le profil gelé reste
distinct ; aucun profil ne décide ni ne rejoue une permission métier.

#### Scenario: RUN ou coordination active
- **WHEN** des RUN, permissions ou une coordination globale sont actifs au
  début de `/CAB update`
- **THEN** l'update ne les consulte pas pour décider de poursuivre, arrête les
  trois unités systemd CAB, remplace les artefacts et les redémarre.

#### Scenario: OpenCode absent
- **WHEN** l'API ou le processus OpenCode est absent
- **THEN** l'update remplace tout de même les trois fichiers broker et les
  autres artefacts, démarre les trois unités, puis rapporte le broker runtime
  `INDISPONIBLE` sans bloquer la réussite des autres briques.

#### Scenario: États CAB actifs
- **WHEN** des RUN ou une coordination globale sont actifs avant l'update
- **THEN** l'update les laisse intacts pendant son déroulement et ne les utilise
  pas comme précondition d'arrêt, remplacement ou redémarrage

### Requirement: Déploiement des quatre briques
Le profil ordinaire MUST installer broker, contrôleur, superviseur et Web, puis
démarrer les trois unités systemd après chaque update, même si elles étaient
inactives avant. Il MUST NOT activer les unités au login. Le profil gelé garde
ses contrôles spécifiques.

#### Scenario: Web actif et superviseur inactif
- **WHEN** le profil ordinaire met à jour ces composants
- **THEN** le Web, le contrôleur et le superviseur sont tous actifs sur le
  nouveau jeu sans activation au login

#### Scenario: Redémarrage de toutes les unités CAB
- **WHEN** une mise à jour effective atteint la phase de redémarrage
- **THEN** les trois unités systemd CAB sont démarrées sur le jeu vérifié sans
  appel à `systemctl enable`, quels que soient leurs états avant l'update

#### Scenario: Broker non vérifiable après redémarrage
- **WHEN** OpenCode n'est pas joignable après le redémarrage
- **THEN** les fichiers broker restent mis à jour, leur version sur disque est
  rapportée et la version chargée est `INDISPONIBLE`.

### Requirement: Rapport des versions après redémarrage
Le rapport MUST séparer paquet, fichiers et versions réellement servies. OpenCode actif MUST imposer une preuve fraîche de la version cible du broker après reconnexion ; un broker non vérifiable MUST interdire le succès. Seule l'absence prouvée d'OpenCode MAY autoriser le broker runtime `INDISPONIBLE`. Aucun repli V1 MUST être tenté.

#### Scenario: Broker de mauvaise version après reconnexion
- **WHEN** OpenCode est actif et le broker annonce une ancienne version
- **THEN** l'update échoue et conserve le journal de récupération ; le rapport ne déduit jamais la version chargée des fichiers

#### Scenario: Redémarrage natif du broker OpenCode
- **WHEN** OpenCode est accessible et le broker CAB est connecté avant l'update
- **THEN** CAB déconnecte, remplace les fichiers, reconnecte puis vérifie une readiness postérieure portant la version cible sans tuer OpenCode

#### Scenario: Broker initialement en erreur
- **WHEN** l'API V2 est accessible mais le serveur MCP existant est failed ou pending
- **THEN** CABU le déconnecte puis le reconnecte après remplacement et exige la même preuve fraîche que pour un broker initialement connecté

### Requirement: Journal et retour arrière récupérables
Un verrou exclusif MUST protéger un journal privé atomique et les sauvegardes
des seuls artefacts remplacés. Après arrêt, un échec MUST restaurer si possible
les fichiers précédents, recharger systemd et redémarrer les trois unités CAB,
sans restaurer un runtime métier ni un état de service antérieur. Une
interruption MUST être récupérable avant une autre transaction.

#### Scenario: Démarrage de la nouvelle version échoué
- **WHEN** une brique refuse le nouveau jeu
- **THEN** les artefacts précédents et états initiaux sont rétablis lorsque le repli reste possible ; un repli incomplet ou une frontière reuse-readonly franchie conserve le gel et signale la récupération nécessaire

### Requirement: Redémarrage systématique et bilan explicite
Chaque invocation ordinaire de `/CAB update` MUST arrêter puis redémarrer les
trois unités CAB, y compris lorsque les versions de fichiers sont déjà
conformes. Le bilan MUST distinguer le paquet, les fichiers déployés, les
versions réellement actives, le broker non vérifiable, ainsi que tout échec de
remplacement ou de démarrage. Une opération MUST conserver ses sauvegardes et
son repli atomique.

#### Scenario: Deuxième invocation inchangée
- **WHEN** les empreintes et versions sont conformes
- **THEN** les trois unités systemd sont arrêtées puis redémarrées et le bilan
  indique les versions observées après redémarrage

### Requirement: Alignement ordinaire des releases gérées
managed-release MUST préparer les artefacts dans les racines autorisées et
basculer atomiquement les pointeurs après l'arrêt des services, sans altérer les
anciennes releases. Les liens inconnus MUST être refusés. reuse-readonly reste
un profil distinct et conserve sa preuve stricte.

#### Scenario: Après récupération mixte
- **WHEN** complete a réussi et une seconde maintenance ordinaire est explicitement autorisée
- **THEN** le contrôleur, le superviseur, le broker et le Web sont alignés sans fermeture OpenCode ni effacement de son historique

#### Scenario: Échec après bascule ordinaire
- **WHEN** un processus ne démarre pas après installation des nouvelles releases
- **THEN** les pointeurs et fichiers précédents sont restaurés lorsque le repli
  reste possible, puis les trois unités sont redémarrées ; la cause et le
  résultat du repli sont rapportés sans modifier les anciennes releases

### Requirement: Transition mixte bornée au rétablissement
Le profil gelé MAY charger le contrôleur 2.1.9 avec broker, superviseur et Web 1.7.1 conservés, uniquement pour maintenance et récupération resource-scoped-v1 qualifiées. Il MUST publier séparément version du paquet, empreinte du contrôleur chargé et versions des processus préservés. Une autre version ou une capacité inconnue MUST refuser cette transition ; elle MUST NOT annoncer tout le runtime aligné en 2.1.9.

#### Scenario: Broker original conservé jusqu'au prévol
- **WHEN** le contrôleur 2.1.9 réconcilie puis reprend le prévol via le broker 1.7.1 conservé
- **THEN** les échanges MCP et la permission fraîche restent corrélés, le broker reste vivant et l'état mixte reste explicitement annoncé

### Requirement: Frontière avant reprise métier
Le profil mixte MUST conserver les pairs sous PAUSE explicite et limiter la reprise ciblée au prévol. complete MUST NOT valoir autorisation de mandat métier dans ce profil. Le pilotage MUST attendre un alignement homogène 2.1.9 vérifié par maintenance ordinaire distinctement autorisée, puis une reprise explicite ; aucune reconnexion ou relance MUST découler du seul incrément de version.

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
- **WHEN** les fichiers sont 2.1.9 mais le broker vivant est encore 1.7.1
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
La politique ordinaire reuse-readonly de CAB 1.10.5 MUST accepter une preuve exacte de broker chargé 1.9.0, avec les artefacts externes 1.10.5 inchangés. Elle MUST conserver les contrôles de propriétaire, groupe, manifeste, processus, PAUSE et maintenance. Les versions inconnues MUST rester refusées ; la version chargée MUST NOT être remplacée par la version sur disque dans la preuve.

#### Scenario: Broker 1.9.0 et artefacts 1.10.0
- **WHEN** les quatre services chargent 1.9.0 et les trois artefacts broker externes correspondent à 1.10.5 sous leur UID réel
- **THEN** la maintenance qualifiée conserve OpenCode, les artefacts et les PAUSE, puis prouve quatre briques 1.10.5 avant libération du gel

#### Scenario: Version chargée inconnue
- **WHEN** la preuve annonce une version hors de la liste qualifiée
- **THEN** le validateur refuse avant mutation sans contourner une garde de propriété ou de processus

#### Scenario: Déconnexion appliquée et réponse perdue
- **WHEN** une déconnexion sous HELD est appliquée mais son résultat devient ambigu
- **THEN** la reprise utilise le même journal, conserve le gel jusqu'à réconciliation et ne restaure ni ancien processus ni état métier

### Requirement: Registre de maintenance borné à seize Mio
L'updater ordinaire MUST lire intégralement jusqu'à 16 Mio les GET exacts /runs et /status et le fichier privé controller-runs.json. Les autres réponses HTTP MUST conserver 2 Mio et les autres fichiers 4 Mio. Il MUST compter les octets reçus avant de parser le JSON. Un dépassement MUST être refusé sans troncature, purge ou admission partielle. Les contrôles d'identité, génération, permissions, PAUSE et HELD MUST rester appliqués.

#### Scenario: Registre valide au-delà des anciennes limites
- **WHEN** le snapshot dépasse 2 Mio et le fichier privé dépasse 4 Mio, chacun sous 16 Mio
- **THEN** la maintenance conserve toutes les identités et preuves et peut poursuivre après les gardes ordinaires

#### Scenario: Dépassement du registre HTTP
- **WHEN** GET /runs fournit plus de 16 Mio
- **THEN** la lecture échoue avec update-response-too-large avant utilisation du snapshot

#### Scenario: Autre réponse volumineuse
- **WHEN** /api/snapshot dépasse 2 Mio
- **THEN** sa limite reste appliquée et aucune augmentation globale n'est déduite des exceptions /runs et /status

#### Scenario: Statut contrôleur volumineux
- **WHEN** GET /status dépasse2Mio et reste au plus16Mio
- **THEN** le statut complet est lu sans troncature pour vérifier les versions et la readiness

#### Scenario: Statut au-delà de la borne
- **WHEN** GET /status dépasse16Mio
- **THEN** update-response-too-large est conservé et aucun démarrage ou rollback réussi n’est déduit

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
La maintenance reuse-readonly vers 1.10.5 MUST admettre une preuve exacte de broker chargé 1.10.2 et conserver les contrôles de propriétaire, artefacts, processus, PAUSE et HELD. La qualification MUST employer deux UID réels et préserver OpenCode, identités et données. La préparation source MUST NOT activer le runtime.

#### Scenario: Transition depuis la release précédente
- **WHEN** le banc isolé met à jour un jeu chargé 1.10.2 vers les artefacts 1.10.5
- **THEN** les quatre versions sont vérifiées avec OpenCode, sources broker et pauses conservés, y compris après réponse de déconnexion perdue

### Requirement: Transition ordinaire depuis le jeu précédent 1.10.3
La maintenance reuse-readonly vers 1.10.5 MUST conserver 1.10.3 parmi les origines admises, avec preuves exactes d'artefacts, UID, processus, PAUSE et HELD. Une version inconnue MUST rester refusée. La qualification MUST employer deux UID réels sans écriture dans les artefacts broker par l'acteur de maintenance.

#### Scenario: Transition depuis 1.10.3
- **WHEN** le banc isolé passe du jeu chargé 1.10.3 aux artefacts 1.10.5
- **THEN** succès et réponse de déconnexion perdue sont vérifiés avec les quatre versions finales, identités et OpenCode conservés, sans activation consommateur

### Requirement: Transition vers CAB 1.10.6
Le profil de mise à jour MUST traiter 1.10.6 comme version cible et MUST
continuer à accepter le broker chargé 1.10.5 dans la liste fermée des
versions qualifiées précédentes. Les contrôles de propriétaire, manifeste,
processus, PAUSE, HELD et récupération MUST rester inchangés.

#### Scenario: Broker 1.10.5 chargé et artefacts 1.10.6
- **WHEN** le broker chargé est 1.10.5 et les trois artefacts source sont 1.10.6
- **THEN** la preuve admet la version chargée antérieure et compare les artefacts à la cible 1.10.6

#### Scenario: Version postérieure inconnue
- **WHEN** le broker chargé annonce une version postérieure non qualifiée
- **THEN** le validateur refuse avant mutation

### Requirement: Propriétaires distincts des artefacts et processus
La preuve reuse-readonly MUST accepter les champs optionnels artifactOwnerUid et directoryOwnerUid, entiers positifs ou nuls, limités à l'acteur de maintenance ou expectedUid. expectedUid MUST rester l'UID d'exécution OpenCode/broker. L'omission MUST conserver les vérifications précédentes. La maintenance MUST lier et recontrôler les propriétaires, groupes, modes, empreintes et identités réels et MUST NOT modifier les artefacts broker.

#### Scenario: Modules ADE et broker devops
- **WHEN** les modules exacts cibles appartiennent à l'acteur, leur répertoire au broker et les processus à expectedUid sous un autre compte
- **THEN** la maintenance qualifiée peut recharger le broker par OpenCode sans mutation des modules ou des droits

#### Scenario: Propriétaire tiers ou dérive
- **WHEN** un propriétaire n'est ni l'acteur ni expectedUid, ou une identité/empreinte/propriété change
- **THEN** la maintenance refuse ou conserve son gel selon la frontière franchie, sans élargissement de permission

### Requirement: Coupure rapide et restauration sans notification
CABU MUST préparer, vérifier et sauvegarder les artefacts avant la coupure. Il MUST arrêter et redémarrer les trois services sur les versions cibles sans avertir ni modifier les RUN. Les états persistants et décisions consommées MUST être conservés. Les nouvelles opérations dépendantes du transport MUST rester bloquées pendant la coupure. Une issue inconnue MUST NOT être rejouée implicitement.

#### Scenario: Coupure pendant un RUN actif
- **WHEN** CABU est déclenché pendant une session
- **THEN** les briques disparaissent sans notification, puis restaurent leurs états durables sans nouvelle permission implicite

### Requirement: Broker actif rechargé et versions prouvées
Si OpenCode est actif, CABU MUST recharger le broker par les routes natives et vérifier sa version cible et une readiness postérieure à la reconnexion. Un OpenCode absent MAY laisser uniquement le runtime broker indisponible. Les trois services MUST toujours être actifs et servir la version cible pour conclure au succès.

#### Scenario: OpenCode lancé
- **WHEN** le serveur OpenCode est actif
- **THEN** le broker est reconnecté et sa version chargée est prouvée ; une erreur de reconnexion interdit le succès global

### Requirement: Durées mesurées
CABU MUST rapporter préparation, indisponibilité et durée totale. Le banc contrôlé SHOULD atteindre une indisponibilité inférieure à cinq secondes. Les validations en cache MUST être liées au contenu exact et recontrôlées avant coupure.

#### Scenario: Paquet inchangé déjà vérifié
- **WHEN** les empreintes et le runtime de validation sont identiques
- **THEN** les validations syntaxiques en cache sont réutilisées sans supprimer les contrôles d'intégrité ni le redémarrage

### Requirement: Credential contrôlé avant coupure
L’updater MUST vérifier le credential privé avant toute coupure. L’option --opencode-password-env-file MAY le provisionner depuis la seule affectation littérale OPENCODE_PASSWORD du project.env source ou des services. Les sources ambiguës MUST être refusées sans arrêt. Le credential MUST être régulier, privé et détenu par l’utilisateur. Un credential existant différent MUST rester intact. Les valeurs secrètes MUST NOT figurer dans les reçus, empreintes, arguments, environnement ou sorties.

#### Scenario: Credential absent sans source explicite
- **WHEN** le credential est absent et aucune source explicite n’est fournie
- **THEN** la préparation échoue avec une cause dédiée avant toute coupure

#### Scenario: Source explicite valide
- **WHEN** project.env contient une unique affectation littérale valide et le credential cible est absent ; les autres variables sont ignorées sans interprétation shell
- **THEN** seul le processus local provisionne le credential en 0600 puis poursuit sans exposer sa valeur

#### Scenario: Source ambiguë ou conflit
- **WHEN** la source contient une clé dupliquée, une valeur vide, des échappements/interpolations, un chemin non autorisé ou une valeur différente d’un credential existant
- **THEN** l’updater refuse sans remplacement du credential existant ni arrêt de service

### Requirement: Cause systemd conservée par service
Un échec de démarrage ou de vérification MUST conserver dans le reçu une cause filtrée par composant avant tout repli, ainsi que le résultat de ce repli. Le bilan CLI MUST rapporter ces causes même après restauration réussie. Les seules données systemd admises MUST être le composant, ActiveState, SubState, Result et ExecMainStatus ; aucune sortie brute ou secret MUST être exposé.

#### Scenario: Échec de credential au démarrage
- **WHEN** une unité retourne 243/CREDENTIALS après remplacement
- **THEN** le rapport nomme cette unité, son statut 243 et le résultat du repli sans assimiler systemctl start réussi à une application opérationnelle

### Requirement: Empreinte stable de la transition historique
L’empreinte de maintenance MUST protéger toutes les données du registre, sauf les champs déjà neutralisés version et coordination.global et l’annonce publique testResourceProtocol. Cette annonce MUST être absente ou égale à test-resources-v1 ; toute autre valeur MUST être refusée. Son exclusion MUST NOT autoriser une réservation de test ni exclure les données de réservation de l’empreinte.

#### Scenario: Annonce ajoutée sans changement métier
- **WHEN** un lecteur récent ajoute seulement testResourceProtocol=test-resources-v1 à l’observation du registre historique
- **THEN** l’empreinte métier demeure identique sans attribuer cette capacité au processus historique

#### Scenario: Annonce inconnue ou registre modifié
- **WHEN** l’annonce porte une valeur inconnue ou un autre champ métier du registre change
- **THEN** la valeur inconnue est refusée ou l’empreinte change, interdisant une adoption sous l’ancienne preuve

### Requirement: Horodatage cohérent du sceau de maintenance
La création du sceau BOOTSTRAP_HELD MUST utiliser un seul instant pour createdAt et expiresAt, avec expiresAt égal à createdAt plus 60000 ms. La garde de durée maximale MUST rester strictement 60000 ms ; les contrôles d’expiration, d’identité et de preuve MUST rester conservés.

#### Scenario: Frontière de milliseconde
- **WHEN** l’horloge change de milliseconde pendant la création du sceau
- **THEN** sa durée reste exactement 60000 ms et une reprise par ailleurs admissible n’est pas refusée pour une durée artificiellement excessive

### Requirement: Attente bornée du contrôleur effectivement démarré
L’updater MUST attendre la version réelle du contrôleur dans le budget waitMs existant, au démarrage cible comme au rollback. Un démarrage non confirmé MUST rester distinct d’un échec de rechargement du broker. Le dépassement MUST refuser le succès, sans changer les exigences de versions, identités et readiness.

#### Scenario: Contrôleur prêt après dix secondes
- **WHEN** le contrôleur devient prêt après dix secondes mais avant expiration du budget configuré
- **THEN** l’updater poursuit seulement après observation de la version attendue

#### Scenario: Contrôleur indisponible jusqu’au terme
- **WHEN** la version attendue n’est pas observée dans le budget
- **THEN** l’activation échoue avec un diagnostic de démarrage et aucune réussite n’est déduite du seul état systemd

### Requirement: Échec de rollback durablement non terminal
Un échec après coupure ou durant la récupération MUST conserver le journal et ses sauvegardes dans une phase non terminale. ROLLBACK_FAILED MUST NOT devenir PREPARATION_FAILED. La reprise MUST traiter ce journal avant toute nouvelle transaction ; seul un rollback vérifié MAY devenir ROLLED_BACK.

#### Scenario: Reprise du rollback encore en échec
- **WHEN** une reprise d’un journal ROLLBACK_FAILED ne peut pas confirmer les services restaurés
- **THEN** le même journal reste ROLLBACK_FAILED et aucune nouvelle transaction ni donnée métier restaurée n’est créée

#### Scenario: Réparation et reprise ultérieure
- **WHEN** les conditions techniques permettent enfin de vérifier les versions et le broker restaurés
- **THEN** le rollback du même journal peut être confirmé sans modifier les RUN ni rejouer once
