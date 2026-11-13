# system-platform Specification

## Purpose
Installer CAB comme plateforme système indépendante des agents avec service
unique, persistance PostgreSQL et profils de codage autonomes.

## Requirements

### Requirement: Service et distribution système
CAB3 MUST être livré par recette Debian DIU, avec connecteurs et contrats
compatibles. Un seul cab.service root MUST superviser les briquesCAB etElectric
au démarrage machine. PostgreSQL MUST rester indépendant. Les agents MUST
rester clients et les règles métier MUST appartenir àDjango.

#### Scenario: Installation neuve
- **WHEN** le paquetCAB est installé
- **THEN** le Webbootstrap8790 est disponible sans créer la baseCAB ni lancer de session

### Requirement: Amorçage Web exclusif
La création initiale de la baseCAB et de toutes ses tables MUST résulter du
premier parcoursWeb authentifié validé. Elle MUST être idempotente. Une
installation configurée MUST reprendre automatiquement ; une erreur de base
MUST NOT devenir une réinitialisation.

#### Scenario: Premier parcours absent
- **WHEN** CAB n’a jamais été initialisé et personne ne valide le parcours
- **THEN** aucune activité métier ou collecte deRUN ne commence

### Requirement: Domaine transactionnel et autorisations
Django MUST porter règles, transactions, commandes etAPI décriteOpenAPI.
Les comptes et modèles MUST rester agnostiques, avec identités et droits
explicites. Une commande externe MUST conserver intention et reçus sans rejeu.
Aucun clientMCP ou Web MUST obtenir un accèsSQL ou un privilège root implicite.

#### Scenario: Réponse perdue
- **WHEN** l’effet d’une opération est incertain
- **THEN** l’identité et les protections restent conservées sans nouvelle exécution

### Requirement: Profils autonomes et reprise
Les codeurs pilotés MUST réaliser, tester, corriger et coordonner sous mandat
sans validation intermédiaire ; le parent MUST traiter seulement exceptions
et revue finale. Les sessions directes MUST utiliser les fonctions nécessaires
sans orchestrateur fictif. La reprise MUST préserverSID/RUN/mandats/baux/reçus.

#### Scenario: Mise à jour du service
- **WHEN** une bascule est autorisée à frontière sûre
- **THEN** CAB arrête, installe, redémarre et vérifie sans réarmer ni rejouer unRUN

### Requirement: Temps réel Electric autorisé
TanStack MUST utiliser la projection de suiviElectric après autorisationDjango.
Electric MUST rester un chemin de lecture ; les mutations MUST passer par
les commandesDjango. Les secrets et données d’un autre périmètre MUST NOT
être exposés par une shape.

#### Scenario: Sessions actives
- **WHEN** un événement deRUN autorisé est validé
- **THEN** sa projection apparaît dans l’interface parElectric et survit à une reconnexion sans double effet

### Requirement: Nettoyage et migration bornés
L’import MUST préserver les sources historiques et les protections incertaines.
Les intégrations obsolètes MUST être retirées uniquement après qualification
de leurs remplaçantes, avec sauvegarde et inventaire exact. La validation
MUST distinguer sources, tests, publication, installation et activation.

#### Scenario: Import répété
- **WHEN** la même source historique est importée deux fois
- **THEN** aucune opération n’est réexécutée et l’historique n’est pas dupliqué

### Requirement: Atelier temporaire des sessions pilotées
Pour les sessions pilotées, CAB MUST déplacer àchaud la racine .cab-tests
sous/tmp dans un espace propre au projet, en conservant change/RUN et
les identités vérifiées, sans lien symbolique ni écrasement des pairs. Les reçus
et preuves durables MUST rester hors/tmp. Les sessions directes MUST conserver
leur profil. Un atelier absent après redémarrage MUST NOT autoriser un rejeu.

#### Scenario: Premier essai piloté
- **WHEN** le codeur demande son premier essai autorisé
- **THEN** CAB crée un atelier temporaire isolé pour sonRUN sans écrire .cab-tests dans le projet

#### Scenario: Atelier disparu
- **WHEN** /tmp a été nettoyé alors qu’une opération reste incertaine
- **THEN** CAB conserve son intention et ses preuves et ne relance pas la commande

### Requirement: Journalisation système configurable
cab.service MUST journaliser dansjournald avec niveau configurable dans
/etc/cab/cab.json parmiDEBUG/INFO/WARNING/ERROR/CRITICAL. Les événements
MUST identifier composant et contexte utile sans secret ou contenu de prompt.
Le rechargement du niveau MUST préserver les sessions et effets en cours.

#### Scenario: Diagnostic activé
- **WHEN** l’administrateur configureDEBUG et recharge le service
- **THEN** journalctl expose les diagnostics expurgés sans redémarrer lesRUN

### Requirement: Navigation Web TanStack
L’interface applicative MUST être rendue par React/TypeScript et TanStack.
Le bandeau MUST proposer Accueil vers / avec contenu vide, puis deux liens
horizontaux en texte Administration vers /administration et Projets vers /projects. La page Projets
MUST conserver le suivi existant.

#### Scenario: Retour à l’accueil
- **WHEN** le visiteur utilise le bouton Accueil du bandeau
- **THEN** / est affiché avec son contenu vide et le bandeau reste accessible

### Requirement: Administration de la configuration
L’administration authentifiée MUST permettre
l’édition validée de /etc/cab/cab.json avec secrets masqués, sauvegarde et
contrôle de révision. Les paramètres techniques MUST attendre le redémarrage,
tandis que le niveau de journalisation MUST être rechargeable sans interruption.

#### Scenario: Paramètre technique modifié
- **WHEN** l’administrateur enregistre une nouvelle configuration technique
- **THEN** le fichier est sauvegardé atomiquement, le besoin de redémarrage est affiché et les sessions conservent leur configuration active

### Requirement: Préférences globales d’affichage persistantes
La page /administration/interface MUST proposer les boutons moins/plus pour les
polices globales. Le bandeau MUST conserver un bouton clair/sombre à côté d’API. Les valeurs validées MUST être enregistrées
dans PostgreSQL dans une table configuration puis restaurées au chargement.
Ces préférences de présentation MUST NOT donner accès aux paramètres privés.
Avant initialisation, leur changement MUST rester temporaire sans créer de base.

#### Scenario: Retour dans l’interface
- **WHEN** une taille et un thème ont été enregistrés puis la page est rechargée
- **THEN** la taille s’applique globalement et le thème est restauré depuis configuration

### Requirement: Catalogue et création de projets
Le catalogue MUST persister les projets dans la table PostgreSQL projects.
La migration MUST conserver les identités et relations existantes. /projects
MUST afficher une liste à gauche avec un bouton + en haut vers /projects/new.
Chaque projet enregistré MUST disposer d’un lien vers /projects/<ID>.
La création authentifiée MUST enregistrer le projet et créer son seul dossier
dans la racine configurée, sans écraser un dossier existant ni rejouer une intention incertaine.

#### Scenario: Création d’un projet
- **WHEN** un administrateur valide le nom et le dossier d’un nouveau projet
- **THEN** le projet est conservé dans projects, son dossier utilise les UID/GID configurés et il apparaît sélectionné dans la liste de gauche

#### Scenario: Page individuelle
- **WHEN** un projet de la liste est sélectionné
- **THEN** /projects/<ID> affiche uniquement le projet demandé et son lien reste sélectionné après rechargement

### Requirement: Réglages POSIX des projets en JSON
L’administration MUST proposer projects_root, projects_user et projects_group,
stockés littéralement dans /etc/cab/cab.json. La racine MUST être absolue,
existante et utilisable par le compte POSIX ; compte et groupe MUST exister.
Ces paramètres MUST s’appliquer aux nouvelles créations sans redémarrage et
MUST NOT modifier les droits ou emplacements des projets existants.

#### Scenario: Réglage enregistré
- **WHEN** les trois réglages valides sont enregistrés dans Administration
- **THEN** le JSON est sauvegardé et la prochaine création utilise ces valeurs

### Requirement: Origines Web configurables sans couplage machine
CAB MUST lire web_allowed_hosts et web_csrf_trusted_origins dans la configuration
JSON de l’hôte, sans nom de machine ou domaine Tailscale codé dans le programme.
Un proxy publiant une origine configurée MUST permettre l’authentification.
La validation du cookie, du jeton CSRF et des origines MUST rester active.

#### Scenario: Publication par proxy
- **WHEN** une requête de connexion porte une origine autorisée et un jeton valide
- **THEN** l’authentification est traitée même si le proxy utilise un autre Host interne

#### Scenario: Origine étrangère
- **WHEN** un formulaire porte une origine non autorisée ou ne fournit pas de jeton
- **THEN** CAB refuse la requête sans authentifier le compte

### Requirement: Administration par sections et menus latéraux
Les espaces Administration et Projets MUST disposer d’un menu latéral directement
au bord gauche de l’écran, sans marge extérieure. L’administration MUST proposer
les routes /administration/agents, /administration/database,
/administration/interface, /administration/projects et /administration/web-server.
/administration MUST ouvrir la section Agents. La version suit la livraison du paquet CAB.

#### Scenario: Navigation entre paramètres
- **WHEN** l’administrateur sélectionne une section dans la barre gauche
- **THEN** la route anglaise correspondante affiche ses seuls paramètres et le menu reste visible

### Requirement: Inventaire des agents et des configurations MCP
L’administration MUST afficher, pour OpenCode et Codex CLI, le chemin absolu,
l’état et la version du binaire disponible, ainsi que les chemins et états des
configurations MCP des comptes CAB. Seuls noms et états des déclarations MCP
MUST être exposés, sans secrets ni commandes. Un MCP déclaré MUST NOT être
présenté comme connecté sans preuve ; aucune session ou serveur MCP n’est lancé.

#### Scenario: Agents installés et MCP désactivé
- **WHEN** les binaires et leurs configurations sont présents
- **THEN** leurs versions et chemins sont visibles et un MCP désactivé est distingué d’un MCP déclaré dont la connexion reste non vérifiée

### Requirement: Chemins des agents modifiables à chaud
Les chemins opencode_binary, codex_binary, opencode_mcp_config et codex_mcp_config
MUST être absolus ou vides pour la détection automatique et modifiables à chaud.
La commande --version MUST être bornée et exécutée sous l’UID propriétaire,
sans élever les droits d’un binaire utilisateur.

#### Scenario: Chemin remplacé
- **WHEN** un chemin absolu absent est enregistré
- **THEN** l’inventaire indique son absence sans installer ni lancer de session

### Requirement: Paramètres techniques répartis
La section database MUST afficher les paramètres PostgreSQL et de réplication,
avec secrets masqués conservés. La section projects MUST porter les trois
réglages POSIX. La section web-server MUST porter web_public_urls,
web_allowed_hosts et web_csrf_trusted_origins, la journalisation et les paramètres
internes Electric. Les paramètres techniques MUST rester appliqués au redémarrage.

#### Scenario: Enregistrement dans une section
- **WHEN** un administrateur sauvegarde des paramètres techniques valides
- **THEN** seuls les champs de cette section sont modifiés et le besoin de redémarrage est affiché

### Requirement: Déclaration des URLs publiques
web_public_urls MUST contenir des origines HTTP/HTTPS exactes. Leurs noms MUST
alimenter les hôtes Django autorisés, sans créer de proxy, de virtual host système
ni de confiance CSRF implicite.

#### Scenario: URL de publication enregistrée
- **WHEN** une URL de virtual host et une origine CSRF de confiance valides sont enregistrées
- **THEN** elles sont conservées dans le JSON et activées au redémarrage sans désactiver la protection CSRF

### Requirement: Accès aux parents des ateliers directs
Les parents partagés .cab-tests/<change> créés par le service MUST utiliser le
groupe du projet et le mode 0770, indépendamment de son umask ; setgid MAY être
conservé pour l’héritage du groupe. La reprise d’un atelier direct connu MUST
vérifier ces parents et réparer uniquement ceux appartenant au service. Les
dossiers RUN existants et leur identité MUST être conservés ; aucun test ou
reçu terminal MUST être rejoué par cette réparation.

#### Scenario: Parent du service inaccessible au codeur
- **WHEN** un parent root créé sous umask 0077 bloque un atelier direct existant
- **THEN** ses droits de groupe sont rétablis, l’UID du codeur peut traverser le chemin et l’inode du dossier RUN reste inchangé

#### Scenario: Parent non sûr
- **WHEN** le parent est un lien symbolique ou possède un propriétaire inattendu
- **THEN** CAB refuse la préparation sans changer les droits de la cible

### Requirement: Réconciliation propriétaire après archivage
Le propriétaire d’un RUN direct WORKING MUST pouvoir appeler run.reconcile_archive
avec project_id, run_id, archive_path et expected_framing_digest. Seuls les chemins
du change disparu MUST être remplacés par son archive datée canonique. La commande
MUST refuser un cadrage périmé, un autre change, une source encore présente, une
opération non terminale ou un bail détenu. Aucun autre champ métier n’est amendable.

#### Scenario: Archivage suivi d’un nouveau test
- **WHEN** le propriétaire soumet l’archive exacte d’un change déplacé et le digest courant
- **THEN** les chemins et la révision sont actualisés avec un événement d’audit, et une nouvelle requête distincte peut être admise

#### Scenario: Réconciliation répétée
- **WHEN** le même appel est répété après une réponse perdue
- **THEN** le résultat précédent est reconnu sans second amendement ou événement

#### Scenario: Protection des effets et identités
- **WHEN** une réconciliation est demandée alors qu’un effet est en cours ou inconnu
- **THEN** CAB refuse et conserve les protections ; les SID, RUN, génération, gel natif, métriques et reçus restent inchangés

### Requirement: Diagnostics MCP corrélés
Les appels MCP d’exécution et de lecture MUST conserver les codes d’erreur publics
et le request_id. Une réponse d’admission perdue MUST rester non confirmée ; une
lecture absente MUST être distinguée d’une opération UNKNOWN. Aucun diagnostic
MUST déclencher de retry d’exécution ou révéler des secrets.

#### Scenario: Reçu absent
- **WHEN** la lecture authentifiée retourne not-found
- **THEN** le client rapporte NOT_FOUND avec l’identité demandée sans relancer la commande

### Requirement: Amorçage CSRF unique du client Web
Le client Web MUST établir son premier cookie CSRF par une seule requête de
santé avant les lectures concurrentes et utiliser le cookie courant pour les
mutations. Il MUST conserver la protection CSRF et MUST NOT rejouer une mutation
après un refus. Ce correctif MUST rester indépendant du compte et de l’hôte.

#### Scenario: Première connexion après chargement parallèle
- **WHEN** les préférences et la santé sont demandées sans cookie préalable
- **THEN** un seul amorçage précède ces lectures et la connexion utilise le jeton correspondant au cookie courant

### Requirement: Runtimes publics lisibles par les clients
L’installation Debian MUST rendre les runtimes publics vérifiés utilisables par
les comptes clients non root : dossiers0755, fichiers0644 ou0755 lorsqu’ils sont
exécutables. Cette normalisation MUST être indépendante de l’umask et limitée au
staging public avant remplacement, sans suivre de lien ou toucher les états privés.

#### Scenario: Installation sous umask privée
- **WHEN** une archive publique contenant des modes restrictifs est installée sous umask0077
- **THEN** un autre UID peut importer les modules et lancer les exécutables publics, tandis que la configuration privée conserve ses droits

#### Scenario: Archive altérée
- **WHEN** l’empreinte de l’archive ne correspond pas au manifeste
- **THEN** l’installation refuse avant extraction et conserve le runtime existant

### Requirement: Finalisation CABU locale du paquet
postinst MUST appeler une finalisation commune après démarrage et contrôle du
service. Elle MUST enregistrer un reçu durable et actualiser les intégrations
configurées sans invoquer APT, dpkg, cab update ou un téléchargement. cab update
MUST réutiliser ce reçu sans doubler les effets de postinst.

#### Scenario: Mise à jour Debian par DIU
- **WHEN** le paquet est installé directement par APT ou DIU
- **THEN** les intégrations et le reçu CABU sont finalisés sans réinstallation récursive

#### Scenario: Reprise d’une finalisation
- **WHEN** une finalisation identique est rappelée
- **THEN** les étapes terminées ne sont pas répétées et les erreurs restent explicites

### Requirement: Distribution des extensions Codex par compte configuré
Le paquet MUST fournir plugins CAB/CCAB/CABU, leurs skills et commandes dans son
payload commun. La finalisation MUST les activer pour les seuls UID configurés,
root compris, avec sauvegarde et préservation des extensions tierces. Elle MUST
conserver SID, RUN, générations, gel et effets protégés, sans relancer les sessions.

#### Scenario: Compte Codex configuré
- **WHEN** le paquet est actualisé pour un compte déclaré
- **THEN** ses trois plugins, leurs skills et commandes sont disponibles sans toucher ses autres extensions

#### Scenario: Bootstrap non validé
- **WHEN** le paquet est installé sur une machine CAB non initialisée
- **THEN** les effets par compte sont reportés sans créer de base ou session avant validation Web

### Requirement: Blocs Agents et états observés
Administration Agents MUST présenter OpenCode et Codex côte à côte, adaptés au
mobile. Le nom MUST être gras et vert si installé, rouge sinon. Les processus et
transports MCP MUST avoir une pastille verte si attestés, rouge sinon avec état
non vérifié lorsque nécessaire. Chemins binaire et connecteur MUST être non éditables.

#### Scenario: Binaire présent sans processus
- **WHEN** le binaire est installé mais aucun processus correspondant n’est observé
- **THEN** le nom est vert et la pastille d’activité est rouge, avec version et chemin installés

#### Scenario: Connecteur local relié
- **WHEN** les extrémités stdio d’un processus CAB MCP ont des pairs ouverts
- **THEN** la connexion du transport est signalée sans confondre déclaration et connexion

### Requirement: Releases GitHub quotidiennes
CAB MUST conserver un cache de versions GitHub consulté une fois par jour UTC
à horaire aléatoire persistant, dans cab.service. Les clés facultatives
opencode_release_repository et codex_release_repository MUST désigner owner/repo.
La page MUST afficher la version disponible si différente, sans accès Web à son
chargement ni installation automatique ; un échec MUST conserver la valeur connue.

#### Scenario: Rechargements de page
- **WHEN** l’administrateur recharge Agents plusieurs fois dans la journée
- **THEN** le cache est affiché sans multiplier les consultations GitHub

### Requirement: Administration sans chemin de configuration technique
Les sous-pages Administration MUST NOT afficher la mention du chemin /etc/cab/cab.json.
Cette présentation MUST NOT changer le stockage ou les droits de la configuration.

#### Scenario: Navigation dans l’administration
- **WHEN** une sous-page Administration est ouverte
- **THEN** le chemin cab.json est absent de l’écran tandis que ses réglages restent utilisables

### Requirement: Entités persistantes de coordination
CAB MUST disposer des tables projects, runs, sessions et changes, avec données
et configuration JSON propres. La migration MUST conserver les identifiants,
SID, générations, mandats, reçus et clés étrangères existants. Une session native
MAY être associée à plusieurs RUN ; chaque RUN MUST référencer son projet, sa
session connue et son change, sans inventer d’identité native absente.

#### Scenario: Migration des RUN existants
- **WHEN** le schéma normalisé est appliqué à une base existante
- **THEN** les relations session/change sont reprises sans changer les identités ou les protections des RUN

### Requirement: Étapes et tâches du tableau des sessions
Le tableau MUST afficher Étape et Tâches réalisées. Le cycle MUST conserver les
onze étapes Initialisation, Prévol, Analyse, Cadrage, Spécification, Implémentation,
Vérifications, Revue, Archivage, Statistiques, Clôture. Une déclaration propriétaire
MUST pouvoir revenir en arrière ; une étape absente MUST rester non renseignée.
Les compteurs MUST provenir du tasks.md canonique du change actif ou archivé.

#### Scenario: Position et avancement distincts
- **WHEN** une étape est déclarée ou les cases de tasks.md changent
- **THEN** la projection temps réel reflète ces données sans valider les autres étapes ni le gate terminal

### Requirement: Détail du RUN lié au change
Un clic sur le RUN MUST ouvrir /projects/<project_id>/runs/<run_id>. La page MUST
afficher identité, état, change, SID, étape, phase, activité observée, mandat,
gate, demandes indécises, jalon prouvé, attente, blocages et les onze étapes.
Elle MUST montrer les tâches du change et leur provenance ; les données absentes
MUST rester Non observé ou Non renseigné, sans inférence de réussite.

#### Scenario: Change archivé ou indisponible
- **WHEN** la page individuelle est consultée
- **THEN** les tâches sont lues du change unique actif ou archivé, ou signalées indisponibles sans lecture hors projet

### Requirement: Tâches mémorisées par change
La table change_tasks MUST conserver chaque tâche avec son change, identité de
source, libellé, état, ordre, ligne, empreinte et date d’observation. tasks.md MUST
rester la source de vérité. Une tâche retirée du fichier MUST être conservée comme
inactive ; un fichier indisponible MUST NOT effacer les observations antérieures.

#### Scenario: Cases modifiées et tâche retirée
- **WHEN** tasks.md est actualisé puis observé
- **THEN** les tâches et compteurs sont actualisés atomiquement, les tâches retirées restent mémorisées et aucun gate du RUN n’est validé par les cases

### Requirement: Agents distincts au menu horizontal
La page /agents MUST figurer après Administration dans le bandeau et MUST quitter
le menu latéral Administration. L’ancien lien /administration/agents MUST rester
compatible. OpenCode, Codex CLI et Codex intégré MUST avoir trois blocs distincts,
avec leurs binaires/versions installés et profils Codex partagés sans confusion.

#### Scenario: Codex intégré actif sans CLI actif
- **WHEN** seul le binaire Codex du bureau est démarré
- **THEN** son bloc indique l’activité et le CLI reste distinct, sans dupliquer ni modifier les profils

### Requirement: Connexions MCP Unix observées par client
La détection MCP MUST supporter pipes et sockets Unix, vérifier les pairs du
transport et les rattacher au programme parent. Elle MUST NOT lire de flux,
reconnecter un client ou créer une session pour l’observer. Un contrôle impossible
MUST rester non vérifié ; le codeur en cours MUST conserver ses identités et effets.

#### Scenario: OpenCode relié par sockets Unix
- **WHEN** OpenCode et son connecteur ont leurs extrémités ouvertes
- **THEN** le bloc OpenCode passe connecté sans être faussement rouge à cause du type socket

### Requirement: Canal de releases OpenCode2
Le contrôle quotidien MUST sélectionner les releases stables2.x d’OpenCode,
sans utiliser une release1.x désignée Latest comme version disponible de ce canal.
La sélection MUST ignorer brouillons/prereleases et conserver un cache en cas d’échec.

#### Scenario: Latest pointe vers1.x
- **WHEN** une release2.x existe dans la liste GitHub
- **THEN** le cache disponible affiche cette branche2, sans réinstaller le binaire

### Requirement: Liens par identifiant métier du projet
Le catalogue MUST conserver un identifiant métier unique et utiliser cet ID dans
/projects/<identifier>, par exemple /projects/pixs. Les PK internes et relations
MUST rester inchangées ; les anciens liens par PK MUST rester compatibles et
être remplacés par l’adresse canonique. La lecture de PROJECT_ID MUST rester
locale, filtrée et littérale, sans exécuter project.env ni exposer d’autres valeurs.

#### Scenario: Projet Pixs existant
- **WHEN** le projet Pixs est sélectionné ou son ancien lien est ouvert
- **THEN** /projects/pixs présente le même projet et utilise la même identité interne pour les protocoles CAB

#### Scenario: Identifiant ambigu
- **WHEN** des projets déclarent le même identifiant ou une valeur non littérale
- **THEN** aucune nouvelle identité ambiguë n’est inventée, et les PK et anciens liens sont préservés

### Requirement: Résolution publique ciblée des sources Codex
CAB MUST proposer native.locate sans création de RUN et permettre native.bind
sans source_file lorsque le stockage natif standard est résoluble. Le compte
POSIX authentifié MUST déterminer la racine par défaut, avec CODEX_HOME explicite
compatible. Aucun compte ni chemin d’utilisateur particulier ne doit être fixé.

#### Scenario: Prévol sans RUN
- **WHEN** un client autorisé indique son projet et son SID
- **THEN** CAB consulte en lecture seule l’index natif pour ce seul SID sous son UID, ou à défaut d’index les seuls noms du jour UUIDv7, puis vérifie le fichier exact par propriétaire/SID/projet, sans contenu de conversation ni écriture

#### Scenario: Candidat absent ou ambigu
- **WHEN** le candidat exact manque, est multiple, lié, non régulier, d’un autre propriétaire ou d’une autre identité
- **THEN** CAB refuse avec un diagnostic stable, sans choisir une autre conversation ni parcourir leur contenu

#### Scenario: Liaison compatible et répétable
- **WHEN** une source explicite valide est fournie ou une résolution automatique réussit
- **THEN** CAB conserve SID, RUN, génération et reçus, accepte la répétition identique sans nouvel effet et refuse un remplacement non autorisé par l’index

#### Scenario: Client ancien déjà chargé
- **WHEN** le client MCP antérieur ne connaît pas encore la nouvelle signature
- **THEN** le CLI public permet la résolution puis la liaison, sans arrêter le client ni rejouer les tests

#### Scenario: Journal repris pour le même SID
- **WHEN** le journal actif indexé a changé et le codeur demande resume=true
- **THEN** CAB exige RUN en travail non gelé, aucun effet ni période ouverte, vérifie ancienne et nouvelle liaisons, conserve l’historique et SID/RUN/génération, puis utilise le fichier indexé sans rejouer de test

### Requirement: Statistiques bornées et propres au change
CAB MUST persister des périodes début/fin liées au change, au RUN et à la session
native. Chaque SID MUST avoir au plus un contexte de mesure actif ; le codeur
MUST pouvoir basculer en autonomie sans validation intermédiaire. Un change MUST
agréger plusieurs RUN et plusieurs sessions sans doubler les compteurs partagés.

#### Scenario: Deux changes successifs dans le même SID
- **WHEN** le codeur commence la mesure du second change
- **THEN** CAB ferme le premier contexte et ouvre le second à une frontière commune, sans attribuer le total antérieur au second

#### Scenario: Reprise et plusieurs sessions
- **WHEN** un change reprend dans un autre RUN ou se réalise dans plusieurs sessions
- **THEN** CAB conserve toutes ses périodes distinctes et agrège seulement les écarts prouvés, sans additionner des totaux de session ni doubler les périodes

#### Scenario: Source ou mesure insuffisante
- **WHEN** une borne manque, la source change, un compteur recule ou une mesure n’est pas attribuable
- **THEN** la mesure reste explicitement indisponible et les anciennes valeurs de session ne servent pas de remplacement

#### Scenario: Reçu répété et clôture
- **WHEN** le même début/fin est répété ou le RUN est gelé puis clôturé
- **THEN** aucune période n’est réouverte ou comptée deux fois et seule sa période active est fermée

#### Scenario: Export individuel
- **WHEN** les statistiques d’un change sont exportées pour SGS
- **THEN** la contribution comporte ses bornes, RUN/SID, écarts et preuves de couverture, sans contenu de conversation ni total d’une session partagé comme total du change

#### Scenario: Compteurs natifs anciens
- **WHEN** aucun compteur natif n’a été actualisé pendant la période ou une borne temporelle manque
- **THEN** CAB indique une mesure indisponible plutôt qu’une consommation nulle, y compris en lecture de périodes anciennes

### Requirement: Statistiques de change prises en charge par CAB
Les rapports locaux STATISTICS.md des changes MUST rester la seule source de
vérité. CAB MUST les projeter dans PostgreSQL, avec historique et métriques
complètes sans inventer de valeur absente. CAB MUST gérer les générations de fin
et les globaux sans rédaction LLM ; le prompt SGS autonome MUST être retiré.

#### Scenario: Édition locale
- **WHEN** un change ou ses statistiques sont modifiés localement
- **THEN** la projection PG est synchronisée rapidement dans le sens local vers base, avec rattrapage quotidien aléatoire au plus24h pour toutes les sources

#### Scenario: Fin de change et global absent
- **WHEN** un change est archivé ou l’inventaire des sources est complet sans global
- **THEN** CAB génère ou amende ses rapports et le global automatiquement, conserve les sources manuelles et signale les lacunes sans dépendre du LLM

#### Scenario: Exclusion mutuelle et migration
- **WHEN** des opérations statistiques concurrentes sont demandées
- **THEN** CAB les sérialise dans PostgreSQL, conserve les effets incertains protégés et ne crée aucun verrou fichier ni moteur autonome contournant CAB

#### Scenario: Change ouvert sans codage
- **WHEN** un change ouvert n’a encore accueilli aucune session de codage
- **THEN** l’absence de STATISTICS.md est normale, aucun fichier individuel n’est créé et cet état ne constitue pas une lacune statistique

### Requirement: Empreinte distincte du code et des statistiques
L’empreinte de validation du code MUST exclure les STATISTICS.md générés du projet
et de ses changes, protégés par leurs propres empreintes. Elle MUST conserver
les chemins cadrés et représenter explicitement l’absence d’un fichier supprimé,
sans le recréer ni accepter silencieusement une autre source.

#### Scenario: Fichier cadré supprimé
- **WHEN** un fichier cadré est supprimé dans le périmètre autorisé
- **THEN** son absence modifie l’empreinte de façon stable, l’atelier ne monte ni ne recrée ce chemin et conserve les refus de chemins ou liens non sûrs

### Requirement: Clôture historique explicite sur preuves
CAB MUST permettre au propriétaire d'un RUN direct WORKING ou à un administrateur
de prévisualiser puis confirmer une clôture historique sur archive datée unique.
La confirmation MUST inclure le digest des preuves calculé par CAB, un reçu stable,
une référence d'autorisation développeur explicite et une justification.

#### Scenario: Archive complète sans reçus modernes
- **WHEN** une confirmation autorisée correspond aux preuves inspectées
- **THEN** le seul RUN ciblé devient CLOSED à l'étape11 avec reçu historique et audit

#### Scenario: Confirmation répétée
- **WHEN** le même reçu et les mêmes paramètres sont présentés après perte de réponse
- **THEN** CAB renvoie le reçu initial sans autre effet ; un contenu différent est refusé

#### Scenario: Preuve modifiée ou effet inconnu
- **WHEN** une preuve change après inspection ou une protection est encore active
- **THEN** CAB refuse et conserve l'état, les reçus et les protections

### Requirement: Protection des preuves historiques
CAB MUST vérifier source active absente, proposal/tasks/review non vides,
tâches présentes toutes cochées et STATISTICS.md local lisible.
CAB MUST refuser maintenance, effet non terminal ou inconnu, bail détenu,
période ouverte, archive ambiguë, chemin non sûr et preuves périmées.

#### Scenario: Période ouverte ou archive incomplète
- **WHEN** une période n'est pas terminée ou une tâche est encore décochée
- **THEN** la clôture est refusée sans modifier le RUN

### Requirement: Provenance et limites de la régularisation
Le reçu et l'audit MUST distinguer CLOSED historique d'une acceptation normale.
Tests et livraison MUST rester documentaires, sans qualification rétroactive.
CAB MUST conserver SID, RUN, génération, mandat, gel et anciens reçus ; il MUST NOT
inventer de reçu de test ou rejouer un travail. Les statistiques MUST rester
sous la responsabilité du service CAB.

#### Scenario: Ancienne exécution non démarrée
- **WHEN** un RUN archivé régularisé possède un reçu FAILED_TO_START
- **THEN** il reste inchangé et le reçu de clôture indique normal_acceptance=false

### Requirement: Évaluation et clôture automatique sur preuves
CAB MUST réévaluer les RUN après observation des sources et au démarrage.
Il MUST fermer automatiquement un RUN seulement si sa revue finale acceptée
est valide, son archive unique complète et ses effets résolus. Les périodes
ouvertes, baux, maintenance et effets inconnus MUST bloquer la clôture.
L'absence de tâches ou leur accomplissement seul MUST NOT valoir acceptation.

#### Scenario: Archive et revue valides
- **WHEN** un RUN accepté possède archive complète et preuves courantes
- **THEN** CAB produit les statistiques et le reçu de clôture, puis affiche CLOSED et étape11

#### Scenario: Preuve périmée ou effet inconnu
- **WHEN** le code a changé depuis l'acceptation ou un effet reste inconnu
- **THEN** CAB conserve les protections et expose les motifs sans rejeu

### Requirement: Services et imports réévalués sans déduction
CAB MUST distinguer état et protection d'import. Il MAY rétablir la clôture
et l'étape11 d'un import si snapshot chiffré intègre, identité et preuve terminale
concordent. La protection MUST rester conservée. Une session de service sans
preuve de fin MUST rester non clôturable ; les tâches MUST rester non applicables.

#### Scenario: Import déjà clôturé
- **WHEN** le snapshot authentifié confirme la clôture du même RUN/SID/projet
- **THEN** CAB expose CLOSED et étape11 sans retirer IMPORT_PROTECTED ni modifier les reçus

#### Scenario: Service sans preuve terminale
- **WHEN** une session service UNKNOWN n'a ni tâches ni preuve de fin
- **THEN** CAB expose service et motif non clôturable sans inventer de tâche

### Requirement: Commande visuelle de réévaluation
L'interface MUST proposer une icône Réévaluer/clôturer avec diagnostic backend.
Une clôture normale admissible MUST être directe ; une régularisation historique
MUST exiger confirmation et justification. Chaque mutation MUST revérifier
preuves et autorité côté serveur, et conserver son reçu idempotent.

#### Scenario: Conditions modifiées après affichage
- **WHEN** une protection apparaît ou une preuve change avant le clic
- **THEN** la fermeture est refusée et le motif actualisé

### Requirement: Archivage des sessions validées
CAB MUST proposer /projects/<ID PROJECT>/archives et un bouton d'archivage pour
les seules sessions CLOSED dont la clôture est prouvée. Une table dédiée MUST
conserver reçu et identité sans supprimer RUN, SID ni relations. Les sessions
archivées MUST quitter la liste courante et rester consultables dans leur projet.

#### Scenario: Session CLOSED validée archivée
- **WHEN** un utilisateur autorisé confirme l'archivage d'une session admissible
- **THEN** CAB conserve un reçu unique, préserve les liens et affiche la session dans Archives

#### Scenario: Session protégée non prouvée ou accès croisé
- **WHEN** une clôture n'est pas prouvée ou le projet n'est pas autorisé
- **THEN** CAB refuse l'archivage sans altérer les protections
