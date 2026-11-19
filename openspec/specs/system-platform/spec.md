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
Le catalogue MUST conserver les projets dans PostgreSQL et préserver leurs identités et relations. `/projects` MUST fournir une liste et un bouton d’ajout. L’administrateur MAY créer un projet ou ajouter un dossier existant, sans écrasement ni rejeu d’une création incertaine.

#### Scenario: Création d’un projet
- **WHEN** un administrateur valide le nom et le dossier d’un nouveau projet
- **THEN** le projet est conservé dans projects, son dossier utilise les UID/GID configurés et il apparaît sélectionné dans la liste de gauche

#### Scenario: Chemin choisi et projet existant
- **WHEN** un administrateur crée ou ajoute un projet et saisit ou sélectionne un chemin absolu
- **THEN** CAB conserve ce chemin dans PostgreSQL ; le chemin par défaut est la racine configurée suivie de l’identifiant si aucun chemin n’est fourni.

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
Administration et Projets MUST disposer d’un menu latéral au bord gauche, sans marge extérieure. L’administration MUST proposer les routes /administration/agents, /administration/database, /administration/interface, /administration/projects et /administration/web-server. /administration MUST afficher le titre Administration sans contenu de section. /administration/database MUST afficher les paramètres de base de données.

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
Les parents partagés .cab-tests/<change> nouvellement créés par le service MUST
utiliser le groupe du projet et le mode0770, avec setgid pour l'héritage.
La reprise MUST préserver les modes existants et demander à l'OS l'accès effectif.
Elle MUST NOT refuser un parent à cause de son mode ou de son propriétaire POSIX.
Les chemins liés ou divergents MUST rester refusés pour préserver l'intégrité.
Les dossiers RUN et reçus existants MUST être conservés sans rejeu.

#### Scenario: Parent du service inaccessible au codeur
- **WHEN** un atelier existe avec des modes différents mais un accès OS suffisant
- **THEN** CAB le reprend sans chmod, sans chown et sans changer ses reçus ; un refus OS est diagnostiqué sans réparation de droits

#### Scenario: Parent non sûr
- **WHEN** le parent est un lien symbolique ou son chemin canonique diverge
- **THEN** CAB refuse la préparation sans changer les droits de la cible

### Requirement: Réconciliation propriétaire après archivage
Le propriétaire d’un RUN direct WORKING ou FINALIZATION_PENDING MUST pouvoir appeler run.reconcile_archive
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

### Requirement: Accueil et navigation du projet
Le clic sur un projet MUST ouvrir /projects/<ID>. Cette route MUST afficher
l'accueil. La maison avant Sessions MUST ouvrir cet accueil et porter un nom
accessible. Sessions MUST ouvrir /projects/<ID>/sessions. Incidents, archives
et détails RUN MUST conserver leurs routes et protections.

#### Scenario: Sélection et navigation
- **WHEN** un utilisateur sélectionne un projet puis Sessions puis la maison
- **THEN** il voit successivement l'accueil, les sessions et le même accueil

### Requirement: Réconciliation d’archive dans un périmètre parent
CAB MUST accepter la réconciliation d’une archive dont le change et l’archive
sont déjà inclus dans un même répertoire parent du mandat, après les contrôles
d’identité, de preuve, d’absence d’effets en cours et de révision habituels.
Un périmètre étranger MUST rester refusé.

#### Scenario: Répertoire parent déjà cadré
- **WHEN** le mandat couvre le dossier parent du change et de son archive
- **THEN** CAB réconcilie le RUN sans élargir ni modifier les chemins cadrés

### Requirement: Rattachement natif d’un worktree Git
CAB MUST accepter une session native dont le répertoire est un worktree Git
enregistré du dépôt du projet, après vérification du dépôt commun et des racines.
Une identité différente, un autre dépôt ou un répertoire non enregistré MUST
rester refusé ; les contrôles de propriété et d’identité du journal sont conservés.

#### Scenario: Session dans un worktree du projet
- **WHEN** le répertoire natif est un worktree enregistré du dépôt du projet
- **THEN** CAB peut rattacher le journal à ce projet sans changer son identité

### Requirement: Bloc Git du projet
La page Forges du projet MUST afficher le bloc Git en premier, avant les cartes
de forges. Son titre MUST présenter le logo Git, le nom Git et un séparateur
vertical.

Le bloc Git MUST afficher après le courriel le nombre de commits accessibles depuis le commit courant. Ce nombre MUST être conservé dans PostgreSQL, recalculé en arrière-plan et diffusé via Electric lorsqu’il change. Un dépôt sans commit affiche zéro.

#### Scenario: Affichage du nombre de commits
- **WHEN** CAB mesure l’état Git d’un projet
- **THEN** le nombre de commits accessibles depuis le commit courant est enregistré et affiché dans le bloc Git.

#### Scenario: Affichage du bloc Git
- **WHEN** un utilisateur ouvre la page Forges d’un projet
- **THEN** il voit le bloc Git en premier, suivi des cartes des forges.

### Requirement: Version Git locale mutualisée
La version Git locale MUST être mutualisée en base et synchronisée via Electric,
puis affichée à côté du titre en plus petit. Elle MUST être vérifiée au maximum
une fois par 24 heures avec un décalage aléatoire mémorisé lors des redémarrages.

#### Scenario: Affichage de la version Git
- **WHEN** la version Git locale est connue
- **THEN** elle est affichée à côté du titre Git depuis la valeur mutualisée

### Requirement: Versions des forges mutualisées
Les versions Forgejo et GitLab et la dernière version disponible de l’API GitHub
MUST être mutualisées par instance et stockées en base. Les versions des forges
distantes MUST NOT être affichées dans les titres des blocs. Le résultat
d’authentification MUST porter le libellé « API ». Chaque version MUST être
vérifiée au maximum une fois par 24 heures avec un décalage aléatoire mémorisé.

#### Scenario: Version de forge connue
- **WHEN** une version de forge distante est connue
- **THEN** sa valeur reste conservée en base sans être affichée dans le titre

### Requirement: Configuration Git du projet
Le bloc Git MUST afficher sur deux colonnes les valeurs présentes de
GIT_USER_NAME, GIT_USER_EMAIL et LOCAL_DEFAULT_BRANCH avec des libellés lisibles.
Ces valeurs MUST suivre la projection PostgreSQL et Electric depuis project.env.
Un bouton MUST permettre de modifier ces trois valeurs dans project.env avec le
contrôle de révision existant, sans modifier les autres variables.

#### Scenario: Modification de la configuration Git
- **WHEN** un administrateur édite les valeurs Git du projet
- **THEN** seules les trois variables demandées peuvent être modifiées

### Requirement: Initialisation Git du projet
L’état Git MUST être conservé dans les données du projet et projeté via Electric :
1 si le dépôt est initialisé, 0 s’il est absent. La présence de .git MUST être
réconciliée en arrière-plan ; un bouton MUST permettre son initialisation uniquement
lorsque l’état conservé est 0. En cas d’état réel illisible, la dernière valeur
connue MUST être conservée.

#### Scenario: Dépôt non initialisé
- **WHEN** l’état conservé vaut 0
- **THEN** le bouton d’initialisation du dépôt Git est affiché

### Requirement: État Git local du projet
À l’ouverture d’un projet, CAB MUST mesurer son état Git local en arrière-plan
et conserver une seule image par projet dans git_projects. La page MUST afficher
l’image enregistrée immédiatement puis recevoir les changements via Electric.
Une mesure indisponible MUST conserver la dernière image et signaler son
indisponibilité. Aucune analyse distante ni fetch ne sont réalisés.

#### Scenario: Mise à jour de l’état Git
- **WHEN** un projet est ouvert ou que le bouton de rafraîchissement Git est sélectionné et que l’état local diffère
- **THEN** CAB met à jour la même ligne et la page affiche la nouvelle image

### Requirement: Présentation de l’état Git local
Le bloc Git MUST présenter le dernier commit, son horodatage local au format
jj.mm.AA hh.mm, ses tags sous « Tag », l’état et les nombres de fichiers
suivis, modifiés, indexés, ignorés, non suivis et en conflit. Le bouton de
rafraîchissement MUST être animé pendant la mesure, à l’ouverture comme après
un clic.

#### Scenario: Affichage de l’état Git
- **WHEN** l’état Git est disponible
- **THEN** ses indicateurs sont affichés dans le bloc Git du projet

### Requirement: Stockage des objets Git
Le bloc Git MUST afficher les nombres et tailles des objets libres et compactés, le nombre de packs, les objets libres déjà compactés et les fichiers inutiles. CAB MUST mesurer ces indicateurs avec l’état Git, les conserver en PostgreSQL et diffuser leurs changements par Electric.

#### Scenario: Réconciliation des objets Git
- **WHEN** la page Forges est chargée ou que l’état Git est rafraîchi automatiquement ou manuellement
- **THEN** CAB actualise les indicateurs et les diffuse si leurs valeurs changent.

### Requirement: Indexation des fichiers suivis modifiés
Le bloc Git MUST proposer sur la ligne « Modifiés » une action visible uniquement lorsque le compteur est supérieur à zéro. CAB MUST afficher avant confirmation la liste des fichiers suivis concernés, y compris les suppressions suivies, sans inclure les fichiers non suivis. Après confirmation, CAB MUST vérifier que l’état observé n’a pas changé, indexer uniquement les fichiers listés et actualiser l’état Git diffusé via PostgreSQL et Electric. Tout résultat incertain MUST être signalé sans rejouer automatiquement l’opération.

#### Scenario: Examiner et indexer les fichiers modifiés
- **WHEN** l’utilisateur sélectionne l’action d’indexation des fichiers modifiés
- **THEN** CAB affiche la liste et attend une validation avant toute modification de l’index.

### Requirement: Commit local depuis le bloc Git
Un administrateur MUST pouvoir ouvrir une fenêtre de commit avec tag et description facultatifs. Le champ du tag MUST être vide par défaut et rester facultatif. CAB MUST indexer les modifications et créer le commit avec l’identité du projet et la description ou un message automatique. Il MUST créer le tag uniquement s’il est renseigné et diffuser l’état Git via PostgreSQL et Electric. Il MUST NOT lancer de push ou CI/CD.

#### Scenario: Suivi du commit
- **WHEN** un administrateur lance le commit depuis la fenêtre
- **THEN** la fenêtre se transforme en console et présente les étapes, les sorties réelles des commandes et le résultat en direct. Les étapes sont diffusées via PostgreSQL et Electric ; les sorties de console sont transmises à la session sans être stockées en base.

#### Scenario: Modifications disponibles
- **WHEN** un administrateur lance le commit et que des modifications sont indexées
- **THEN** CAB crée un commit local et réconcilie l’état Git.

#### Scenario: Tag existant
- **WHEN** le tag demandé existe déjà
- **THEN** CAB demande si le tag local doit être déplacé avant toute indexation.
- **AND** si le déplacement est confirmé, CAB protège la valeur observée du tag contre une modification concurrente et le déplace vers le nouveau commit.
- **AND** si le déplacement est refusé, CAB ne modifie pas le dépôt.

#### Scenario: Aucune modification
- **WHEN** aucune modification n’est à enregistrer
- **THEN** CAB ne crée pas de commit vide et réconcilie l’état Git.

### Requirement: Retrait du dernier commit local
Le bloc Git MUST proposer une corbeille pour le dernier commit. La fenêtre MUST permettre de retirer ce commit en conservant les modifications ou de revenir aux fichiers du premier parent. CAB MUST vérifier la référence observée avant de la déplacer et actualiser PostgreSQL et Electric. Les tags existants et les forges distantes MUST rester inchangés.

#### Scenario: Conserver les modifications
- **WHEN** l’administrateur choisit de conserver les modifications
- **THEN** CAB replace la branche sur le premier parent et conserve les fichiers et l’index.

#### Scenario: Revenir à l’état précédent
- **WHEN** l’administrateur choisit de supprimer les modifications du commit
- **THEN** CAB affiche une seconde fenêtre détaillant les fichiers à restaurer ou supprimer avant validation, y compris les fichiers présents dans les dossiers non suivis.
- **AND** après validation, CAB vérifie que la liste et la référence n’ont pas changé, replace la branche et les fichiers sur le premier parent, et supprime les modifications locales et les fichiers non suivis non ignorés.

#### Scenario: Référence modifiée ou résultat partiel
- **WHEN** le commit a changé depuis l’ouverture ou que la restauration des fichiers échoue après déplacement
- **THEN** CAB signale le résultat sans rejouer automatiquement l’opération.

### Requirement: Édition du tag Git local
Dans le bloc Git, chaque tag du dernier commit MUST ouvrir une fenêtre permettant de modifier son nom et sa description. CAB MUST vérifier que le tag et le commit observés n’ont pas changé, refuser un nom déjà utilisé et appliquer les changements localement sans publier vers les forges. Les changements MUST actualiser l’état PostgreSQL et Electric.

#### Scenario: Renommage ou description du tag
- **WHEN** un administrateur enregistre un tag valide dont la référence observée est inchangée
- **THEN** CAB conserve le commit ciblé et actualise le nom et la description du tag local.

#### Scenario: Nom du tag effacé
- **WHEN** un administrateur enregistre la fenêtre avec le champ Tag vide
- **THEN** CAB supprime uniquement le tag local, conserve le commit et actualise l’état Git.

#### Scenario: Ajout d’un tag absent
- **WHEN** le commit courant n’a pas de tag et qu’un administrateur sélectionne sa ligne Tag
- **THEN** CAB ouvre une fenêtre pour créer un tag local avec un nom et une description facultative, sans changer le commit.

#### Scenario: Corbeille du tag
- **WHEN** un administrateur sélectionne la corbeille associée à un tag local
- **THEN** CAB supprime ce tag sans confirmation supplémentaire, conserve le commit et actualise l’état Git.

#### Scenario: Modification concurrente
- **WHEN** le tag ou le commit a changé depuis l’ouverture de la fenêtre
- **THEN** CAB refuse la modification sans écraser la nouvelle référence.

### Requirement: Nettoyage des objets Git déjà compactés
Le bloc Git MUST proposer une action de nettoyage sur la ligne des objets à nettoyer uniquement lorsque leur nombre est supérieur à zéro. Cette action MUST supprimer seulement les objets libres déjà présents dans les packs, puis relire l’état Git et actualiser la projection PostgreSQL diffusée par Electric.

#### Scenario: Nettoyage demandé
- **WHEN** un administrateur sélectionne le nettoyage des objets déjà compactés
- **THEN** CAB exécute le nettoyage local et réconcilie l’état Git, ou signale son échec.

### Requirement: Consultation des modifications non indexées
Lorsque l’état Git affiche « Modifications », il MUST permettre d’ouvrir une
fenêtre en lecture seule présentant le résumé et la liste des modifications
non indexées du projet autorisé. Si aucune modification non indexée n’existe,
la fenêtre MUST le signaler.

#### Scenario: Détail des modifications
- **WHEN** un utilisateur sélectionne l’état « Modifications »
- **THEN** CAB affiche le résumé et la liste des fichiers non indexés

### Requirement: Consultation des compteurs Git
Les compteurs Suivis, Modifiés, Indexés, Ignorés, Non suivis et Conflits MUST
ouvrir une fenêtre en lecture seule listant les fichiers correspondants du projet
autorisé. Les listes volumineuses MUST être paginées et signaler toute troncature.

#### Scenario: Consultation d’un compteur
- **WHEN** un utilisateur sélectionne un compteur Git
- **THEN** CAB affiche les fichiers correspondants ou indique qu’il n’y en a aucun

### Requirement: Détail des changements indexés
Modifiés MUST réutiliser la fenêtre des modifications non indexées. Indexés MUST
afficher le résumé des changements indexés avant la liste des fichiers.

#### Scenario: Consultation des fichiers indexés
- **WHEN** un utilisateur sélectionne le compteur Indexés
- **THEN** le résumé des changements précède la liste des fichiers

### Requirement: Recherche dans les compteurs Git
Chaque fenêtre de compteur MUST proposer une recherche filtrant immédiatement
les lignes affichées. Le champ MUST se placer au-dessus de Fermer, à droite de
la pagination si présente.

#### Scenario: Filtrage des fichiers
- **WHEN** un utilisateur saisit une recherche dans une fenêtre de compteur
- **THEN** seules les lignes correspondantes restent affichées

### Requirement: Consultation des branches Git
La valeur de branche dans le bloc Git MUST ouvrir une fenêtre en lecture seule
présentant les branches locales et les références distantes connues localement,
leur synchronisation et les dépôts distants configurés. La consultation MUST
fonctionner sans connexion réseau et masquer les identifiants sensibles dans
les adresses.

#### Scenario: Consultation des branches
- **WHEN** un utilisateur sélectionne la valeur de branche du projet
- **THEN** CAB affiche les branches et les informations locales des dépôts

### Requirement: Consultation de l’historique des commits locaux
Le nombre de commits du bloc Git MUST ouvrir une fenêtre de consultation de l’historique du projet autorisé, avec au plus 25 commits par page. Chaque commit MUST apparaître sur une seule ligne avec son identifiant court, sa date, son auteur, ses références et son message. La pagination MUST afficher la page courante et le nombre total de pages, permettre de parcourir l’historique jusqu’au dernier commit et conserver le point de départ de la consultation. Un filtre de recherche MUST affiner à la saisie l’ensemble de l’historique selon les informations affichées, et adapter la pagination aux résultats. Chaque identifiant MUST ouvrir une fenêtre de détail par-dessus l’historique, limitée aux commits accessibles depuis la branche affichée et au projet autorisé.

#### Scenario: Ouvrir et parcourir l’historique
- **WHEN** un utilisateur sélectionne le nombre de commits dans le bloc Git
- **THEN** CAB affiche la première page et permet de naviguer entre les pages disponibles.

### Requirement: Retrait de commits sélectionnés dans l’historique
L’historique Git MUST permettre de sélectionner un ou plusieurs commits, à l’exception du commit HEAD, et de demander leur retrait de la branche locale. Une case « Tout cocher » MUST sélectionner ou désélectionner les commits de la page affichée, sauf HEAD, sans modifier les sélections des autres pages. CAB MUST conserver l’arbre et les modifications locales, vérifier que HEAD n’a pas changé et ne pas déplacer les tags ni les autres branches. Les commits descendants réécrits changent d’identifiant ; CAB MUST en avertir l’utilisateur. CAB MUST refuser la réécriture de commits signés qu’il ne peut préserver.

#### Scenario: Demander la suppression sans sélection
- **WHEN** l’utilisateur demande la suppression sans commit coché
- **THEN** CAB l’invite à sélectionner au moins un commit.

#### Scenario: Confirmer la suppression de commits
- **WHEN** l’utilisateur demande la suppression avec des commits cochés
- **THEN** CAB présente une fenêtre de confirmation indiquant que les fichiers et modifications restent conservés et précisant l’effet sur les identifiants et les tags.

### Requirement: Consultation du dernier commit
L’identifiant du dernier commit dans le bloc Git MUST ouvrir une fenêtre de
consultation en lecture seule présentant son identifiant complet, son auteur,
sa date locale, ses références locales et le résumé des fichiers modifiés.
Le détail MUST être limité au dernier commit connu et aux projets autorisés.

#### Scenario: Ouverture du détail
- **WHEN** un utilisateur sélectionne l’identifiant du dernier commit
- **THEN** la fenêtre affiche ses informations et le résumé de ses fichiers

### Requirement: Consultation du dernier commit distant
Le dernier commit affiché par chaque forge MUST ouvrir une fenêtre en lecture seule présentant les informations disponibles auprès de la forge, notamment son identifiant, son auteur, sa date, son message et, lorsque disponible, le résumé des fichiers modifiés. CAB MUST limiter la consultation au dernier commit observé et au projet autorisé, sans exposer le token.

#### Scenario: Ouverture du détail distant
- **WHEN** un utilisateur sélectionne le dernier commit d’une forge
- **THEN** CAB lit les informations de ce commit auprès de la forge et les affiche dans une fenêtre de consultation.

### Requirement: Métadonnées publiques du fichier projet
project.env à la racine canonique MUST être la source de vérité des métadonnées
publiques. CAB MUST mémoriser leur instantané dans projects. L’accueil MUST
afficher PROJECT_NAME en grand et gras et PROJECT_VERSION ; PROJECT_TYPE est
présenté dans le bloc Configuration dans l’ordre de déclaration.

#### Scenario: Présentation
- **WHEN** un projet contient un nom, une version et plusieurs types
- **THEN** le nom et la version sont affichés en titre et les langages dans Configuration

### Requirement: Cartes et suppression des métadonnées
Les cartes Forgejo, GitHub et GitLab MUST afficher les variables publiques
présentes de leur famille REMOTE respective, sauf les valeurs SSL_VERIFY,
qui restent conservées dans la projection sans être affichées. Un fichier absent, ambigu ou
inaccessible MUST être signalé sans contenu brut. Les variables retirées
MUST disparaître de l'instantané.

#### Scenario: Accès au dépôt distant
- **WHEN** l’URL, l’utilisateur et le dépôt d’une forge sont configurés
- **THEN** le nom de la forge ouvre le dépôt à l’adresse construite à partir de ces trois valeurs.

#### Scenario: Token dans la configuration de forge
- **WHEN** une carte Forgejo, GitHub ou GitLab est affichée
- **THEN** aucune ligne Token n’est affichée dans la carte et le token reste disponible dans la configuration de la forge.

#### Scenario: Bloc de configuration du projet
- **WHEN** la fiche d’un projet est affichée
- **THEN** le bloc « Configuration » de l’accueil affiche ID, nom, langages, publication et version depuis PostgreSQL, puis Electric.
- **AND** les langages reconnus sont représentés dans l’ordre de `PROJECT_TYPE` par des logos liés à leur site officiel ; les valeurs non reconnues restent lisibles.
- **AND** les logos Debian et Docker sont affichés lorsque leur variable vaut « Yes » et renvoient vers leurs sites officiels.

#### Scenario: Chemin d’un projet initialisé
- **WHEN** un administrateur modifie le chemin d’un projet initialisé
- **THEN** CAB le conserve uniquement dans PostgreSQL, sans écrire de variable de chemin dans `project.env`, après vérification que le nouveau dossier contient un `project.env` de contenu identique.
- **AND** la clé interne et les relations sont conservées ; le bloc est actualisé par Electric et le changement est refusé si une opération est active.

#### Scenario: Édition de la configuration du projet
- **WHEN** un administrateur ouvre le stylo du bloc « Configuration »
- **THEN** il peut modifier les six variables publiques du bloc dans `project.env` ; CAB vérifie la révision et l’unicité de l’identifiant avant d’enregistrer et synchronise PostgreSQL puis Electric.
- **AND** un changement d’identifiant actualise l’adresse canonique sans modifier la clé interne du projet.

#### Scenario: Métadonnées et cartes
- **WHEN** le fichier contient une seule forge puis la retire
- **THEN** seule sa carte est affichée puis elle disparaît

### Requirement: État des dépôts distants
Les blocs Forgejo, GitHub et GitLab MUST afficher le dernier commit de la branche distante, son horodatage, ses versions, le nombre de commits et la taille du dépôt lorsque la forge fournit ces informations. CAB MUST conserver la dernière observation en PostgreSQL et diffuser ses changements par Electric, sans exposer les tokens.

#### Scenario: Réconciliation des dépôts distants
- **WHEN** un utilisateur ouvre la page Forges d’un projet
- **THEN** CAB affiche les données enregistrées puis vérifie les dépôts en arrière-plan si le délai minimal automatique est écoulé.

#### Scenario: Vérification quotidienne
- **WHEN** l’horaire quotidien aléatoire mémorisé pour une forge et un projet est atteint
- **THEN** CAB vérifie le dépôt en arrière-plan et programme la prochaine vérification 24 heures après, même si aucune page n’est ouverte.

#### Scenario: Mesure indisponible
- **WHEN** une forge ou une information est indisponible
- **THEN** CAB conserve les dernières données valides du même dépôt, signale l’indisponibilité et ne présente pas une valeur inconnue comme zéro.

### Requirement: Rafraîchissement manuel des forges
Chaque bloc de forge MUST proposer un bouton de rafraîchissement manuel. Son icône MUST être animée pendant la vérification de cette forge, y compris lors de l’ouverture de la page et des vérifications automatiques. L’état de vérification MUST être diffusé aux pages ouvertes via PostgreSQL et Electric.

#### Scenario: Rafraîchissement demandé
- **WHEN** un utilisateur sélectionne le rafraîchissement d’une forge configurée
- **THEN** CAB vérifie son dépôt et son authentification en arrière-plan, actualise les données et arrête l’animation à la fin.

### Requirement: Intervalle automatique des forges
CAB MUST limiter les vérifications automatiques de chaque forge et projet à une par intervalle minimal, réglable dans Administration / Git en minutes et conservé en PostgreSQL. Le défaut MUST être 60 minutes. Une vérification manuelle MUST rester possible sans attendre cet intervalle. La vérification quotidienne existante demeure active sous cette limite.

#### Scenario: Page ouverte plusieurs fois
- **WHEN** la page Forges est rouverte avant l’expiration de l’intervalle configuré
- **THEN** CAB affiche les valeurs mémorisées sans relancer la vérification automatique.

### Requirement: Synchronisation de branche et des tags vers une forge
Chaque bloc de forge distante MUST proposer une action « Synchroniser » après « Envoyer ». CAB MUST présenter un aperçu de la branche cible, des commits et des tags à créer, modifier ou supprimer avant confirmation. La branche distante configurée MUST être alignée sur HEAD local et les tags distants sur tous les tags locaux ; les tags distants absents localement MUST être supprimés, sans déplacer d’autres branches. Un renommage de tag se traduit par la suppression de son ancien nom et la création du nouveau.

CAB MUST utiliser les identifiants de forge qu’il gère, vérifier les références et tags locaux et distants observés, protéger chaque mise à jour par une lease explicite et demander une transaction Git atomique. CAB MUST vérifier l’état distant après l’envoi et signaler un résultat incertain sans rejeu automatique si la confirmation échoue. Les modifications non commitées MUST rester locales.

#### Scenario: Examiner la synchronisation
- **WHEN** l’administrateur ouvre la synchronisation d’une forge
- **THEN** CAB affiche les différences de branche et de tags sans modifier la forge.

#### Scenario: Confirmer la synchronisation
- **WHEN** l’administrateur confirme un aperçu encore valide
- **THEN** CAB synchronise la branche et les tags dans une transaction atomique et vérifie le résultat distant.

### Requirement: Envoi manuel de branche vers les forges
Chaque bloc de forge MUST proposer un bouton « Envoyer » après le rafraîchissement. CAB MUST utiliser les identifiants de forge chiffrés qu’il gère, présenter la branche cible et le commit local avant confirmation, puis envoyer uniquement ce commit sur la branche distante avec un force-with-lease explicite sur la valeur observée. CAB MUST NOT créer, comparer ou publier de tag pour cette action.

#### Scenario: Confirmation de l’envoi
- **WHEN** l’administrateur confirme l’envoi préparé et que les références n’ont pas changé
- **THEN** CAB envoie la branche avec protection de la valeur distante, sans envoyer de tag, puis actualise l’état de la forge.

#### Scenario: Résultat incertain
- **WHEN** l’envoi est interrompu ou son résultat n’est pas confirmé
- **THEN** CAB signale un résultat incertain et interdit le rejeu automatique.

### Requirement: Comparaison des forges avec Git local
Chaque bloc de forge MUST afficher après la branche un état comparant son commit observé au commit local courant. La comparaison MUST distinguer les commits d’avance et de retard de la forge, être mémorisée en PostgreSQL et diffusée via Electric, puis recalculée à chaque actualisation locale ou distante. CAB MUST afficher une indisponibilité si les commits nécessaires ne sont pas connus localement et MUST NOT effectuer de fetch implicite.

#### Scenario: Détail de la comparaison
- **WHEN** l’utilisateur sélectionne l’état d’une forge
- **THEN** CAB affiche les commits comparés, les nombres d’avance et de retard et les commits distincts disponibles localement.

### Requirement: Authentification des forges
À l’ouverture de la page Forges d’un projet, CAB MUST afficher l’état d’authentification mémorisé pour chaque forge puis, lorsque l’intervalle automatique est écoulé, vérifier en arrière-plan l’identité avec ses données stockées. Le résultat MUST être conservé dans PostgreSQL et transmis par Electric. Les secrets MUST rester absents de la projection publique.

#### Scenario: Diagnostic interactif
- **WHEN** un utilisateur sélectionne l’authentification d’une forge
- **THEN** CAB ouvre une console, lance la vérification et affiche ses étapes et son résultat en direct, avec possibilité de la relancer, sans exposer le token.

#### Scenario: Modification des identifiants
- **WHEN** le compte ou le token d’une forge change
- **THEN** CAB invalide l’ancien état, planifie automatiquement une nouvelle vérification et transmet son résultat par PostgreSQL et Electric, même si une vérification précédente est encore en cours.

#### Scenario: Utilisateur ou token absent
- **WHEN** l’utilisateur ou le token de la forge est absent ou vide
- **THEN** CAB ne lance pas de tentative d’authentification, conserve l’état indéterminé `null` dans PostgreSQL et affiche « ... » via Electric.

#### Scenario: Identité vérifiée ou refusée
- **WHEN** la forge confirme l’identité attendue ou refuse l’authentification
- **THEN** le bloc affiche respectivement une coche verte ou une croix rouge.

#### Scenario: Accès Forgejo par le dépôt
- **WHEN** le token ne permet pas la lecture du profil utilisateur Forgejo
- **THEN** CAB vérifie le dépôt configuré et ne confirme l’authentification que si la réponse démontre un accès supérieur à la réponse anonyme ; un dépôt public accessible sans distinction reste non vérifié.

#### Scenario: Token GitHub ou GitLab limité au dépôt
- **WHEN** l’API du profil ne peut pas confirmer le compte configuré
- **THEN** CAB vérifie l’accès Git HTTPS au dépôt et ne confirme l’authentification que si l’accès authentifié est distinct de l’accès anonyme ; un dépôt public sans distinction reste non vérifié.

#### Scenario: Vérification indéterminée
- **WHEN** la forge est indisponible, la portée du token insuffisante ou les identifiants non configurés
- **THEN** le bloc indique que l’état n’est pas vérifié sans conclure à un échec d’authentification.

### Requirement: Édition des forges et chiffrement TPM
Chaque carte de forge MUST proposer une édition administrateur de ses variables et de son token local, masqué par défaut et affichable par un bouton. Les fichiers MUST être surveillés ; PostgreSQL conserve le token chiffré par le TPM et Electric ne reçoit aucun token en clair. Le paquet Debian MUST dépendre de systemd fournissant systemd-creds.

#### Scenario: Enregistrement d’un token
- **WHEN** un administrateur modifie un token de forge
- **THEN** CAB écrit `config/<forge>.token` et `config/<forge>.username` avec le propriétaire de la forge, puis synchronise le token chiffré par le TPM dans PostgreSQL, sans l’écrire dans project.env.

#### Scenario: Fichier modifié ou TPM indisponible
- **WHEN** la configuration a changé depuis l’ouverture ou que le TPM est inaccessible
- **THEN** CAB refuse l’enregistrement plutôt que d’écraser la modification concurrente ou de substituer un chiffrement logiciel.

### Requirement: Lecture littérale sans effet
CAB MUST NOT exécuter project.env. Seule une édition administrateur explicite des variables du projet ou de la forge sélectionnée MAY modifier ce fichier ; les autres lignes MUST être conservées. Les clés dupliquées, expressions, liens et fichiers non réguliers MUST être refusés.

#### Scenario: Syntaxe active
- **WHEN** le fichier contient une substitution shell
- **THEN** elle est refusée et aucun effet n'est exécuté

### Requirement: Liste publique fermée
Seuls PROJECT_ID, PROJECT_NAME, PROJECT_VERSION, PROJECT_TYPE, PROJECT_DOCKERED, PROJECT_DEBIAN_PACKAGE et les REMOTE_(FORGEJO|GITHUB|GITLAB) aux suffixes BASE_URL, OWNER, REPOSITORY, NAME, BRANCH, SSL_VERIFY MAY être publiés après validation. Les URL avec identifiants, requête ou fragment et les valeurs incertaines MUST être exclues. Electric et la projection publique MUST NOT contenir de secrets en clair. Seul un administrateur MAY consulter les tokens sans cache.

#### Scenario: Secrets
- **WHEN** le fichier contient un jeton ou une URL authentifiée
- **THEN** ces données ne sont ni mémorisées ni projetées

### Requirement: Actualisation du projet sélectionné
La sélection MUST afficher immédiatement l'instantané de base puis provoquer
une relecture autorisée. Tant que l'accueil est affiché, une modification,
suppression ou substitution atomique externe du fichier MUST actualiser
l'instantané et l'affichage via Electric sans rechargement de page. Les
abonnements MUST être libérés à la sortie. Les shapes MUST être limitées
au projet autorisé et à ses colonnes publiques, sans configuration privée.

#### Scenario: Modification externe et reconnexion
- **WHEN** project.env change pendant l'affichage, puis Electric se reconnecte
- **THEN** les dernières valeurs autorisées sont visibles sans double effet

#### Scenario: Isolation
- **WHEN** un utilisateur demande la shape ou le rafraîchissement d'un projet étranger
- **THEN** l'accès est refusé sans aucune donnée du projet

### Requirement: Cohérence des versions avant préparation du paquet
La préparation MUST valider la version du moteur contre les manifestes
CAB/CCAB/CABU, leurs commandes et les métadonnées frontend et Python.
Elle MUST refuser une divergence ou un fichier requis manquant avant toute
écriture du payload. La finalisation installée MUST conserver son refus
indépendant des versions divergentes.

#### Scenario: Plugin périmé
- **WHEN** un manifeste embarqué annonce une autre version que le moteur
- **THEN** la préparation échoue avant copie ou archivage et conserve le payload précédent

#### Scenario: Versions alignées
- **WHEN** moteur, commandes, manifestes et métadonnées partagent la version3.2.1
- **THEN** la préparation conserve cette version dans le manifeste runtime et la finalisation peut vérifier les mêmes contenus

### Requirement: Demande MCP agnostique de mise à jour CAB
cab_update MUST accepter une demande explicite provenant d’un acteur CAB actif
authentifié, indépendamment du compte, UID ou agent. Le request_id MUST être
durable et idempotent. Seules une version SemVer optionnelle et la source
officielle CAB MUST être admises ; aucun shell, URL ou paquet local du client.
Une demande concurrente MUST être refusée et une demande divergente MUST NOT
réutiliser le même identifiant. Le demandeur MUST être audité.

#### Scenario: Demande CABU
- **WHEN** un client CAB authentifié invoque CABU via le MCP
- **THEN** CAB enregistre le job sans sudo client ni liste de comptes imposée

#### Scenario: Réponse perdue
- **WHEN** le client relit ou répète la même demande
- **THEN** il obtient le même job sans réinstaller ni créer un deuxième effet

### Requirement: Installation autonome hors du service actualisé
CAB MUST exécuter le téléchargement officiel, le contrôle SHA256 et Debian,
l’installation et les vérifications via une unité système distincte de
cab.service. Ce parcours MUST survivre au redémarrage de CAB sans intervention
LLM. Les étapes et reçus MUST être durables. Un effet non réconcilié MUST
rester UNKNOWN et protégé contre tout rejeu automatique.

#### Scenario: Redémarrage pendant installation
- **WHEN** le paquet redémarre cab.service
- **THEN** le worker indépendant continue et le client MCP reprend la lecture du même job

### Requirement: Résultat OK uniquement après activation vérifiée
Le MCP MUST retourner state=OK et la version nouvelle uniquement après
confirmation du paquet entièrement configuré, du service READY à cette version
et de la finalisation vérifiée. Un échec MUST être explicite sans prétendre
à une réussite. Les gardes de maintenance existantes MUST rester applicables.

#### Scenario: Installation partielle
- **WHEN** postinst échoue ou le service n’atteint pas la version cible
- **THEN** la demande n’annonce pas OK et conserve son diagnostic et ses preuves

### Requirement: Disponibilité GitHub vérifiée en arrière-plan
Le chargement de l’accueil CAB MUST demander une vérification asynchrone de
la release GitHub officielle. CAB MUST partager un cache unique : une vérification faite depuis moins
de24heures MUST NOT être rejouée, même au chargement de l’accueil. Le prochain
contrôle automatique MUST être tiré au sort dans les24heures suivant
l’expiration de ce délai minimal. Les appels réseau MUST rester hors du rendu et des boucles métier.

#### Scenario: Accueil chargé pendant une réponse GitHub lente
- **WHEN** la vérification distante est en cours
- **THEN** CAB affiche immédiatement sa page et ses données disponibles et continue ses opérations

### Requirement: Étiquette de mise à jour dans le bandeau
Une version stable officielle confirmée plus récente MUST faire apparaître
une étiquette Mise à jour à côté de la version CAB. Son clic authentifié MUST
créer le même job autonome que le MCP, sans sudo ni LLM intermédiaire. Les
états et la nouvelle version vérifiée MUST être affichés ; une demande en cours
MUST NOT être réémise après navigation ou indisponibilité temporaire.

#### Scenario: Clic sur l’étiquette
- **WHEN** un utilisateur authentifié clique Mise à jour
- **THEN** CAB conduit l’installation du même job et annonce OK seulement après activation vérifiée

### Requirement: Page administrative de mise à jour manuelle
/administration/update MUST afficher la version locale et la version en ligne,
et fournir un bouton manuel permanent utilisant le job système commun. Chaque
ouverture authentifiée de cette page MUST demander un contrôle GitHub forcé,
hors de la limite du cache automatique24h, toujours sans bloquer le rendu.

#### Scenario: Consultation administrative
- **WHEN** l’administrateur ouvre la page de mise à jour
- **THEN** les versions connues et le bouton apparaissent immédiatement et le contrôle distant est demandé en arrière-plan

### Requirement: Contrat initial de finalisation autonome
CAB MUST conserver le cadrage métier immutable par RUN : nature, critères,
preuves attendues et décisions réservées. Les clients MUST pouvoir le déclarer
au cadrage. Une adoption explicite unique MAY être admise avant effet/revue/gel ;
les RUN anciens ou importés MUST NOT être migrés implicitement. Le seul argv
d'un contrôle récupérable MAY être révisé par son codeur propriétaire, directement
ou en piloté, sans validation intermédiaire, avec justification et empreinte attendue.

#### Scenario: Cadrage direct ou piloté
- **WHEN** un contrat couvre les critères avec checks ou preuves attendues
- **THEN** CAB le conserve et pilote sa finalisation sans soumission finale du codeur

#### Scenario: Validation pure du cadrage
- **WHEN** un agent consulte cab_contract ou finalization_validate avant admission
- **THEN** il reçoit les champs stricts, les natures et types de preuves, puis le contrat validé ou le code de refus, sans création de RUN ni effet

#### Scenario: Correction du contrat au prévol
- **WHEN** l'autorité corrige le contrat avant toute opération, preuve, modification de source, revue, gel ou import
- **THEN** finalization.configure accepte un contrat couvrant les mêmes critères, conserve l'ancien contrat et ses empreintes dans l'événement, et ne déclenche aucun travail

#### Scenario: Correction autonome d'un contrôle
- **WHEN** le propriétaire corrige un contrôle non exécuté, échoué ou périmé sans effet indécis, bail, gel, import, revue ou clôture
- **THEN** CAB conserve ancien contrat et reçus, incrémente la révision du contrôle et exige une preuve nouvelle sans modifier les exigences métier

#### Scenario: Requête concurrente ou retour à un ancien contrôle
- **WHEN** une révision vise une empreinte périmée ou réutilise un ancien argv
- **THEN** CAB refuse la concurrence périmée et ne réactive jamais un succès d'une révision antérieure ; un doublon identique conserve son reçu

### Requirement: Registre de preuves authentifiées agnostique
CAB MUST lier chaque preuve à son producteur authentifié, projet, RUN, change,
révision et artefact applicable. Seuls les exécuteurs CAB ou producteurs autorisés
MUST pouvoir fournir des attestations. Une déclaration de codeur ou un document
libre MUST NOT devenir un reçu de test. Aucun couplage métier DIU n'est REQUIRED.

#### Scenario: Reçu réel et doublon
- **WHEN** un reçu réel identique est observé plusieurs fois
- **THEN** une seule preuve est conservée ; même identité et contenu différent sont refusés

#### Scenario: Usurpation ou portée divergente
- **WHEN** un codeur soumet une preuve de producteur ou cible un autre RUN sans habilitation
- **THEN** CAB refuse sans créer ni modifier de reçu d'exécution

### Requirement: Finalisation mécanique et attentes explicites
CAB MUST assembler et vérifier les preuves au fil des événements et au redémarrage.
Le contrat satisfait MUST conduire à CLOSED11/11, périodes et statistiques finalisées,
sans commande finale du LLM. Les validations réservées MUST rester exigées.
Les preuves manquantes, échouées ou périmées MUST apparaître avec actions précises
et identités des contrôles ou requêtes concernés. CAB MUST NOT déduire un succès,
réexécuter un travail ni transformer un ancien journal en reçu d'exécution.

#### Scenario: Contrat satisfait sans soumission du LLM
- **WHEN** les checks cadrés sont réussis, les preuves attendues reçues et le change archivé
- **THEN** CAB ferme la période du seul RUN sur snapshot réel et émet un reçu unique de clôture

#### Scenario: Reprise ou protection
- **WHEN** le service redémarre, un effet est UNKNOWN ou une source a changé
- **THEN** CAB expose les actions nécessaires et reprend ses contrôles sans rejouer de travail ni lever de protection

#### Scenario: Contrat ou preuve manquante
- **WHEN** un RUN attend un contrat, une exécution, un producteur, une archive ou une revue
- **THEN** le statut indique la commande ou l'autorité requise et ses faits manquants, sans action implicite ni fermeture inventée

### Requirement: Preuves adaptées à la nature et à la portée
CAB MUST distinguer développement, livraison, activation et service. Une preuve
commune MAY être référencée par plusieurs RUN si son périmètre est explicitement
vérifié, sans duplication d'exécution ni de statistiques. Une fin de tour LLM
ou une inactivité MUST NOT prouver la fin d'une session.

#### Scenario: Activation sans nouvelle exécution de tests
- **WHEN** un RUN d'activation reçoit les preuves d'installation et disponibilité cadrées
- **THEN** CAB le finalise sans inventer de tests de développement

#### Scenario: Service sans preuve de fin
- **WHEN** aucune attestation terminale du service n'est disponible
- **THEN** sa finalisation reste en attente, sans tâche ou résultat supposé

### Requirement: Relais MCP rechargeable sans rejeu
CAB MUST fournir un relais stdio stable pour Codex/OpenCode, indépendant du
moteur remplaçable. Il MUST conserver les requêtes métier et serveur en vol,
attendre une frontière sûre et MUST NOT rejouer un appel après redémarrage.
Seul le handshake protocolaire MAY être réinitialisé.

#### Scenario: Requête métier active pendant installation
- **WHEN** la version change alors qu'une requête est encore en vol
- **THEN** CAB diffère le remplacement, conserve le canal et transmet le reçu unique

#### Scenario: Frontière sûre
- **WHEN** aucun appel métier ni demande serveur ne reste indécis
- **THEN** le relais recharge le moteur et notifie le changement de catalogue

### Requirement: Preuve de moteur et de catalogue
CAB MUST enregistrer identité de processus, UID/profil, génération et version
chargée. Une lecture tools/list achevée MUST prouver la version de catalogue.
Une notification seule MUST NOT valoir acquittement de rechargement client.

#### Scenario: Catalogue non relu
- **WHEN** le moteur est rechargé mais le client n'a pas relu son catalogue
- **THEN** le reçu expose l'attente, sans prétendre que les outils sont actualisés

### Requirement: CABU et attente durable de son initiateur
Le relais MUST pouvoir maintenir l'attente du même job CABU pendant son propre
rechargement, par lectures seulement après admission unique. Le reçu MUST
séparer installation vérifiée et reconnexion effective des connecteurs actifs.

#### Scenario: CABU invoqué par le connecteur à remplacer
- **WHEN** la nouvelle version est prête alors que cab_update attend son reçu
- **THEN** le relais recharge son moteur sans réadmettre le job ni perdre sa réponse

### Requirement: Compatibilité et protections des anciens connecteurs
CAB MUST détecter les anciens connecteurs et signaler RELOAD_REQUIRED si aucune reprise sûre n'est disponible. Une reprise contrôlée du client MAY utiliser l’autorité bornée de sa demande CABU vérifiée, sans confirmation supplémentaire, avec identité kernel, quiescence, PIDFD et reçu durable. CAB MUST NOT arrêter arbitrairement un client ni injecter des requêtes dans son canal privé. SID/RUN, générations, secrets et reçus MUST rester conservés.

#### Scenario: Ancien connecteur sans interface de rechargement
- **WHEN** un processus déjà chargé n'a ni relais ni interface native accessible
- **THEN** CAB expose la reprise contrôlée nécessaire et son autorité, sans prétendre que son exécution ou sa reconnexion sont prouvées

### Requirement: Actualisation native du catalogue Codex
L'intégration CAB MAY activer mcp_tool_list_changed via la CLI native si elle
est disponible et sans choix explicite existant. Elle MUST préserver une
désactivation explicite, les autres configurations et les secrets. Une capacité
absente MUST rester diagnostiquée, sans déclaration de catalogue rechargé.

#### Scenario: Option disponible sans choix utilisateur
- **WHEN** la CLI native annonce cette option et aucun override n'existe
- **THEN** CAB l'active par cette CLI et vérifie sa valeur

#### Scenario: Désactivation explicite
- **WHEN** le profil déclare false
- **THEN** CAB conserve cette décision et expose la limite de reconnexion

### Requirement: Arrêt MCP borné à frontière sûre
CAB MUST arrêter seulement son moteur MCP enfant identifié par UID/PPID,
boot/start et pidfd. Il MUST vérifier la quiescence avant toute action et tout
signal. Arrêt gracieux puis SIGTERM MAY précéder SIGKILL si autorisé. Une
requête en vol/indécise, un PID divergent ou une sortie non prouvée MUST protéger
le processus ; aucune application native ni appel métier MUST être rejoué.

#### Scenario: Moteur ignorant SIGTERM
- **WHEN** le moteur reste vivant après les délais et la frontière reste sûre
- **THEN** CAB utilise SIGKILL par pidfd si autorisé puis vérifie sa sortie avant remplacement

#### Scenario: Protection ou désactivation
- **WHEN** un appel est indécis, l'identité diverge ou SIGKILL est désactivé
- **THEN** CAB refuse l'escalade correspondante et conserve un diagnostic

### Requirement: Politique et journalisation d'arrêt
CAB MUST valider mcp_reload dans /etc/cab/cab.json : graceful_timeout_seconds,
term_timeout_seconds et kill_timeout_seconds bornés0.1–120s, allow_sigkill booléen.
Il MUST fournir les seuls paramètres utiles au relais et enregistrer les étapes
techniques sans secrets ni contenu métier. Une politique indisponible MUST NOT
permettre SIGKILL. Un ancien relais MUST NOT être déclaré porteur du nouveau code.

#### Scenario: Politique modifiée
- **WHEN** l'administrateur enregistre une politique valide
- **THEN** les relais compatibles la lisent au prochain arrêt sans accès au fichier privé

### Requirement: Versions MCP observées diffusées en direct
CAB MUST exposer une projection autorisée minimale des connecteurs réellement
connectés, versions moteur/catalogue/relais et profil. Electric MUST pousser les
changements et déconnexions observés sans rafraîchissement de page. Aucun PID,
secret ni chemin privé MUST être exposé par ce flux.

#### Scenario: Changement ou déconnexion
- **WHEN** une nouvelle version ou une déconnexion est observée
- **THEN** Agents et le bandeau sont actualisés sur le même abonnement Electric

### Requirement: Libellés de versions avec indicateur connecté
Le bandeau MUST afficher à gauche d'API les groupes de connecteurs connectés,
avec boule verte et texte vert gras MCP Codex/OpenCode vX.Y.Z. Agents MUST afficher
les versions du même profil. Les versions différentes d'un profil MUST rester
visibles et un catalogue ancien MUST NOT être présenté comme actualisé.

#### Scenario: Plusieurs profils et versions
- **WHEN** Codex et OpenCode sont connectés avec plusieurs versions
- **THEN** les libellés sont groupés depuis API vers la gauche et les deux pages suivent les mutations sans reload

### Requirement: Accès effectifs sans politique de modes POSIX
CAB MUST utiliser l'accès effectif accordé par l'OS. Il MUST NOT refuser un profil,
un état, une preuve ou une ressource selon des bits POSIX ni normaliser les modes
existants. L'authentification, les identités de processus, l'intégrité des objets
et les refus réels d'accès MUST rester contrôlés sans exposer de credentials.

#### Scenario: Profil lisible aux droits hétérogènes
- **WHEN** le compte effectif peut lire son profil CAB régulier en 0770 ou autre mode
- **THEN** CAB le charge sans chmod et utilise son authentification normale

### Requirement: Surveillance permanente des connecteurs MCP CAB
Le service CAB MUST surveiller en permanence les connecteurs CAB des agents OpenCode, Codex et Codex CLI, indépendamment des pages ouvertes. Une reprise automatique MUST cibler une instance identifiée, préserver les opérations actives et conserver un reçu durable ; un résultat incertain MUST NOT être rejoué automatiquement.

#### Scenario: Relais OpenCode disparu
- **WHEN** OpenCode V2 indique le connecteur CAB connecté mais que son relais est absent et que l’instance et la frontière sûre sont vérifiées
- **THEN** CAB demande une reconnexion ciblée et confirme la reprise uniquement après réception d’un nouveau heartbeat.

#### Scenario: Connecteur Codex ou Codex CLI disparu
- **WHEN** un relais CAB est absent et que son contrôle natif est identifié et utilisable
- **THEN** CAB planifie une reprise par le contrôle natif existant, sous les mêmes protections d’opérations actives et de non-rejeu.

#### Scenario: Instance non identifiée ou effet incertain
- **WHEN** l’instance ne peut être identifiée, qu’une opération est active ou qu’une reprise est incertaine
- **THEN** CAB s’abstient de déclencher ou de rejouer la reconnexion.

### Requirement: API native prioritaire de rechargement MCP
CAB MUST privilégier l'API native de l'instance réelle de Codex, Codex CLI ou
OpenCode avant ses replis possédés. Un socket d'un autre app-server MUST NOT
attester la reprise d'un client existant. Chaque requête MUST garder son reçu ;
un effet indécis MUST interdire rejeu et escalade. La reprise MUST préserver
SID/RUN et exiger moteur et catalogue observés dans la version cible.

#### Scenario: API disponible
- **WHEN** l'instance autorisée expose une API native compatible à frontière sûre
- **THEN** CAB demande d'abord son rechargement puis observe le catalogue réel

#### Scenario: API absente ou effet indécis
- **WHEN** aucun point compatible n'est disponible ou son effet reste inconnu
- **THEN** CAB distingue indisponibilité et incertitude, conserve les preuves et ne rejoue aucune requête métier

### Requirement: Dépendance Debian inotify-tools
Le paquet Debian CAB MUST déclarer inotify-tools parmi ses dépendances.

#### Scenario: Construction du paquet Debian
- **WHEN** le paquet Debian CAB est construit
- **THEN** son champ Depends contient inotify-tools

### Requirement: Dépendance Debian Git
Le paquet Debian CAB MUST déclarer git parmi ses dépendances.

#### Scenario: Métadonnées du paquet
- **WHEN** la release Debian est construite
- **THEN** son champ Depends contient git

### Requirement: Profils et versions distincts des agents
CAB MUST distinguer le connecteur codex-cli de codex et leurs profils par compte.
Il MUST chercher la dernière version CLI sur les releases GitHub stables officielles,
et celle de Codex Desktop dans le dépôt APT ChatGPT, indépendamment du SDK embarqué.
Les caches MUST être distincts et vérifiés quotidiennement à instant aléatoire.
La configuration optionnelle codex_desktop_release_url MUST être une URL HTTPS sans credentials.

#### Scenario: Root CLI et Desktop ade
- **WHEN** les deux programmes sont présents sous des comptes différents
- **THEN** leurs commandes, profils, connexions et fournisseurs de version restent distincts

### Requirement: Première adoption native explicite
CAB MUST préparer les endpoints sous le compte effectif, sans déclarer raccordé
un frontend qui tourne encore en stdio. Le lanceur Codex MUST permettre son
raccordement au daemon fournisseur et la CLI MUST conserver le SID lors de resume.

#### Scenario: Client ancien sans socket
- **WHEN** son daemon est préparé mais son frontend n'est pas encore raccordé
- **THEN** CAB expose adoption_required et attend une vraie liaison IPC sans inventer de preuve

### Requirement: Finalisation du profil Codex CLI dédié
La validation du plan CABU MUST accepter codex-cli au même titre que codex et
opencode. Elle MUST conserver le compte et le profil dédiés du connecteur CLI.

#### Scenario: Profil CLI enrôlé
- **WHEN** un acteur codex-cli valide possède son profil local authentifié
- **THEN** cab finalize installe et vérifie ses intégrations au lieu de refuser son plan

### Requirement: Version corrective après échec CABU
finalization.retarget_release MUST permettre à l'autorité ou à l'admin local de
cibler le patch immédiatement suivant après CABU FAILED. La transition MUST être
idempotente et tracée, sans installation. Elle MUST conserver critères métier,
contrôles, producteurs et revue, ainsi que mandat, contrat et échec initiaux.
Seule la version littérale change ; une nouvelle preuve MUST être exigée.

#### Scenario: Patch correctif validé
- **WHEN** une livraison FAILED non encore prouvée est suivie d'une version corrective autorisée, avec empreinte courante, justification, nouvel identifiant CABU et sans effet, bail, gel, import ou revue
- **THEN** le même SID/RUN conserve son historique et attend le nouveau CABU sans rejouer l'ancien

#### Scenario: Effet indécis ou saut de version
- **WHEN** le CABU précédent est UNKNOWN ou la cible dépasse le patch immédiatement suivant
- **THEN** CAB refuse la transition et conserve toutes les protections

### Requirement: Catalogue et navigation des agents
La page /agents MUST présenter les trois fiches et une colonne latérale listant les agents déclarés dans la table PostgreSQL `agents`, dans l'ordre Codex, Codex CLI, OpenCode. Les liens /agents/codex, /agents/codex-cli et /agents/opencode MUST afficher chacun la fiche correspondante sans recharger le document. Les états de processus, versions et connexions MUST rester issus des observations courantes et les secrets MUST NOT être stockés dans ce catalogue.

#### Scenario: Accueil des agents
- **WHEN** la page `/agents` présente les trois agents
- **THEN** leurs blocs ne présentent pas les lignes « Binaire », « Connecteur MCP » ou « Configurations MCP » ; ces informations restent disponibles dans la fiche individuelle.

#### Scenario: Sélection d'un agent
- **WHEN** un administrateur sélectionne un agent dans la colonne
- **THEN** sa fiche, son nom comme titre principal et une barre de navigation avec un lien vers /agents sont affichés ; les autres agents restent accessibles dans le menu.

#### Scenario: Organisation d'une fiche agent
- **WHEN** une fiche agent est ouverte
- **THEN** les informations générales, les utilisateurs liés, les configurations MCP, la configuration générale et la configuration des plugins sont présentés dans cinq blocs distincts, adaptés à la largeur disponible.

### Requirement: Utilisateurs déclarés par agent
CAB MUST permettre à un administrateur de déclarer un compte présent dans `/etc/passwd` et doté d'un répertoire personnel existant. L'association à l'agent MUST être conservée dans `agent_users` et affichée par ordre alphabétique avec le chemin de configuration lorsqu'il existe, ou « Configuration non présente » sinon. Le retrait MUST supprimer seulement l'association. Cette opération MUST NOT modifier le compte système ni configurer le MCP.

#### Scenario: Compte et Home valides
- **WHEN** un administrateur déclare un compte local dont la Home existe
- **THEN** CAB l'associe à l'agent sans créer de doublon et affiche son identifiant et l'état de son fichier de configuration.

#### Scenario: Compte ou Home absent
- **WHEN** le compte est inexistant ou sa Home absente
- **THEN** CAB affiche respectivement « Compte inexistant » ou « Home inexistante pour le compte <USER> », sans créer d'association.

#### Scenario: Retrait d'un utilisateur
- **WHEN** l'administrateur utilise la corbeille d'un utilisateur
- **THEN** seule l'association affichée à cet agent est retirée de `agent_users`.

### Requirement: Réconciliation MCP des utilisateurs déclarés
La fiche MUST afficher les configurations des utilisateurs associés depuis PostgreSQL puis Electric. À chaque ouverture et tant que la fiche reste ouverte, CAB MUST réconcilier périodiquement leurs déclarations MCP en arrière-plan selon les scénarios ci-dessous. Un conflit ou un effet incertain MUST être signalé sans écrasement ni rejeu automatique. Le bloc MCP MUST afficher l’état de chaque utilisateur.

#### Scenario: État MCP par utilisateur
- **WHEN** un utilisateur est associé à l’agent
- **THEN** sa ligne affiche « OK · MCP cab · Déclaré » si la déclaration est vérifiée, « NOK · MCP cab · Non Déclaré » si elle est absente, ou « NOK · MCP cab · À vérifier » si son état est inconnu.

#### Scenario: Fichier Codex présent
- **WHEN** le fichier `.codex/config.toml` d'un utilisateur déclaré est présent et compatible
- **THEN** CAB assure de façon idempotente l'entrée MCP `cab`, affiche le chemin et indique « Déclaré ».

#### Scenario: Compte partagé entre Codex et Codex CLI
- **WHEN** le même compte est déclaré pour Codex et Codex CLI
- **THEN** l'entrée `cab` commune cible Codex en priorité.

#### Scenario: Fichier OpenCode présent ou absent
- **WHEN** un utilisateur déclaré dispose de `.config/opencode/opencode.json` ou `.config/opencode/opencode.jsonc`
- **THEN** CAB réconcilie leur contenu dans `opencode.jsonc`, conserve les valeurs non conflictuelles, privilégie celles du JSONC en cas de conflit, sauvegarde les fichiers initiaux puis retire le JSON après écriture vérifiée ; il assure la déclaration `mcp.servers.cab` compatible OpenCode V2.
- **WHEN** aucun de ces fichiers n'existe
- **THEN** CAB crée `.config/opencode/opencode.jsonc` dans la Home du compte avec le schéma OpenCode, les valeurs par défaut natives et la déclaration MCP CAB V2, puis affiche le chemin et l'état depuis PostgreSQL via Electric.
- **AND** les commentaires et les virgules finales d'un fichier JSONC existant sont conservés.
- **AND** CAB vérifie ou crée un profil d’authentification OpenCode propre au compte, sans écraser un profil existant ni renouveler un secret ; un conflit ou un résultat incertain est signalé.

#### Scenario: Aucun utilisateur déclaré
- **WHEN** aucun compte n'est associé à l'agent
- **THEN** le bloc Configuration MCP n'affiche aucun profil.

### Requirement: Consultation locale de la configuration d'un agent
Un administrateur MUST pouvoir ouvrir en lecture seule le fichier de configuration associé à un utilisateur déclaré. Sur demande explicite, la fenêtre MUST afficher le contenu complet directement au navigateur, sans journalisation ni mise en cache. CAB MUST contrôler l'identité du compte, le propriétaire et le type du fichier, refuser les liens symboliques et limiter la taille lue.

#### Scenario: Consultation autorisée
- **WHEN** l'administrateur sélectionne le chemin d'un fichier accessible et sûr
- **THEN** une fenêtre affiche son contenu complet en lecture seule, sans modifier le fichier.

#### Scenario: Accès non autorisé ou fichier non sûr
- **WHEN** le demandeur n'est pas administrateur ou que le fichier ne satisfait pas les contrôles de sécurité
- **THEN** CAB refuse la lecture et n'affiche pas le contenu.

### Requirement: Version CAB issue de la configuration
La version déclarée dans `/etc/cab/cab.json` MUST être conservée dans l'entrée `cab` de la table PostgreSQL `configuration`. CAB MUST surveiller le fichier et actualiser cette entrée et une projection Electric limitée à la version. Le bandeau et la version locale de la page de mise à jour MUST afficher la valeur enregistrée, puis les changements reçus par Electric. Une lecture invalide MUST préserver la dernière valeur valide ; la projection MUST NOT exposer d'autres données privées du fichier.

#### Scenario: Modification de la version déclarée
- **WHEN** le fichier contient une nouvelle version valide
- **THEN** l'entrée PostgreSQL, la projection Electric et l'affichage web sont actualisés sans rechargement de page.

#### Scenario: Configuration indisponible ou invalide
- **WHEN** le fichier ne peut pas être lu ou contient une version invalide
- **THEN** CAB conserve la dernière valeur valide et ne publie aucune valeur inventée.

#### Scenario: Base indisponible
- **WHEN** le catalogue ne peut pas être lu
- **THEN** l'interface signale l'indisponibilité sans inventer de données.

### Requirement: Statut courant des agents
La table `agents` MUST conserver l'installation, l'état du processus et la version locale observés, avec une valeur inconnue avant observation. CAB MUST actualiser ces valeurs en arrière-plan et les diffuser par Electric aux administrateurs. La fiche MUST afficher le dernier état enregistré dès son chargement, puis refléter les changements sans rechargement. Le titre MUST être vert et gras si l'agent est installé ; une pastille indique l'état du processus et la version locale suit le titre.

#### Scenario: Changement de processus
- **WHEN** l'observateur constate le démarrage ou l'arrêt d'un agent installé
- **THEN** PostgreSQL et la pastille de sa fiche sont actualisés par Electric.

#### Scenario: Première observation absente
- **WHEN** aucun état fiable n'a été observé
- **THEN** CAB conserve un état inconnu au lieu d'inventer une installation ou un arrêt.

### Requirement: Statut MCP mémorisé par agent
La table `agents` MUST conserver l'état MCP et les versions observées des connexions actives. CAB MUST actualiser ces données à partir des connexions authentifiées, les diffuser par Electric et afficher une pastille verte si au moins une connexion est active, rouge sinon. En l'absence d'observation, l'état MUST rester inconnu ; après déconnexion les dernières versions connues restent identifiées comme historiques.

#### Scenario: Connexion ou déconnexion MCP
- **WHEN** une connexion MCP authentifiée apparaît ou disparaît
- **THEN** l'état enregistré et la fiche correspondante sont actualisés sans rechargement ; plusieurs versions actives restent visibles.

#### Scenario: Binaire absent
- **WHEN** le binaire d'un agent est absent
- **THEN** sa fiche affiche la ligne « Binaire » avec « Non installé » à la place du chemin.

### Requirement: Vérification sur l'hôte autorisée par l'administrateur
Un administrateur local authentifié par le pair Unix root MUST pouvoir autoriser sur l'hôte un contrôle existant d'un RUN direct. CAB MUST vérifier la politique et la révision, exécuter les arguments exacts sous l'identité du propriétaire et conserver l'autorisation et un reçu `host-authorized`. Les contrôles ordinaires MUST rester isolés et les protections et reçus antérieurs MUST être préservés.

#### Scenario: Contrôle autorisé
- **WHEN** l'administrateur local autorise un contrôle existant et que sa politique reste courante
- **THEN** CAB l'exécute une seule fois sur l'hôte sous l'identité du propriétaire et conserve son reçu corrélé.

#### Scenario: Injection ou politique modifiée
- **WHEN** un codeur tente d'injecter l'autorisation ou que la politique a changé
- **THEN** CAB refuse l'exécution sur l'hôte.

### Requirement: Retrait observé des anciens services importés
CAB MUST pouvoir clôturer automatiquement un service interne CCAB ou SGS importé
lorsque son identité est prouvée par le snapshot intact, son acteur composant est
inactif, aucun effet, bail ou mesure n'est ouvert, aucun processus/unité historique
n'est actif et cab.service est READY. Il MUST conserver IMPORT_PROTECTED et
émettre un reçu du constat courant sans inventer de date historique de fin.

#### Scenario: Ancien composant remplacé
- **WHEN** toutes les preuves de retrait et de remplacement sont observées
- **THEN** CAB conserve l'import, passe le RUN en CLOSED11 et le rend archivable sans rejeu

#### Scenario: Service encore actif ou observation incomplète
- **WHEN** le composant fonctionne encore ou une preuve ne peut pas être vérifiée
- **THEN** CAB conserve le RUN et ses protections sans le clôturer

### Requirement: Suppression explicite d'une session CAB
CAB MUST proposer une corbeille à droite de la ligne et une prévisualisation de
suppression transactionnelle du RUN sélectionné et de ses données propres.
La confirmation irréversible et, en cas de transversalité, la confirmation des
liens partagés MUST être exigées. SID, change et import partagés MUST être
conservés. La suppression MUST refuser un effet, bail, reçu ou incident non résolu.
Les fichiers de projet MUST NOT être supprimés et un reçu minimal MUST subsister.

#### Scenario: Session partagée
- **WHEN** le RUN partage son SID, son change, son import ou ses avis avec d'autres RUN
- **THEN** la fenêtre affiche les liens et exige une confirmation supplémentaire ; toute référence de coordination encore utilisée empêche la suppression

#### Scenario: Validation fraîche et suppression
- **WHEN** une session CLOSED prouvée est confirmée sur un aperçu courant
- **THEN** CAB supprime ses enregistrements propres atomiquement, conserve les ressources partagées et restitue le même reçu après une répétition de la même requête

### Requirement: Retrait administratif explicite d'une session technique importée
Sur décision explicite du développeur, un administrateur MUST pouvoir retirer
une session technique directe importée sans preuve de fin historique. CAB MUST
vérifier le snapshot, l'acteur inactif et l'absence d'opération, bail, mesure ou
session active liée. Le reçu MUST dater le constat actuel, conserver les limites
et IMPORT_PROTECTED, sans acceptation métier ni rejeu, puis autoriser l'archivage.

#### Scenario: Retrait technique autorisé
- **WHEN** la décision explicite, le motif et l'empreinte d'import concordent avec une session admissible
- **THEN** CAB enregistre le reçu et son audit, conserve SID et génération, clôture CLOSED11 et permet l'archivage sans exiger une archive métier inexistante

#### Scenario: Autorisation absente ou contexte protégé
- **WHEN** une autorisation manque ou un effet, acteur actif ou snapshot divergent empêche le retrait
- **THEN** CAB refuse sans modifier le RUN

### Requirement: Constat d'arrêt sans résultat d'un test local
CAB MUST réconcilier de façon autonome un test local sandbox UNKNOWN/ProcessLookupError
selon sa politique de service. Un administrateur MAY aussi demander ce constat
explicitement. CAB MUST vérifier l'intégrité
du reçu, le même atelier, l'absence observée de processus et de spool, et les
baux de fichiers du projet à la bonne génération. Le reçu UNKNOWN et son empreinte
MUST rester intacts ; un constat distinct MUST tracer l'arrêt sans résultat.

#### Scenario: Arrêt constaté et résultat indisponible
- **WHEN** les vérifications passent et le retrait du blocage est autorisé
- **THEN** l'état opérationnel devient CANCELLED, les seuls baux concernés sont libérés et l'audit conserve le reçu original sans déclarer de tests réussis ni rejouer la commande

#### Scenario: Atelier actif ou effet hors sandbox
- **WHEN** un processus utilise encore l'atelier, une observation manque ou le test était autorisé sur l'hôte hors sandbox
- **THEN** CAB refuse cette réconciliation bornée et conserve les protections

#### Scenario: Supervision autonome sans décision par opération
- **WHEN** un RUN actif non suspendu possède un cadrage résolu, un acteur actif et un test sandbox admissible dont l'arrêt est prouvé
- **THEN** le superviseur applique seul le constat avec authority=cab-policy, conserve le reçu et ne demande aucune validation humaine par opération

#### Scenario: Identité d'exécuteur encore vivante ou preuve incomplète
- **WHEN** le processus enregistré reste vivant, l'atelier ne peut pas être vérifié ou le test est externe ou autorisé sur l'hôte
- **THEN** CAB conserve UNKNOWN et ses baux ; le statut expose le motif de protection sans effet ni rejeu

### Requirement: Arrêt borné de l'exécuteur et conservation de sa sortie
L'exécuteur MUST borner la sortie capturée et l'attente. Il MUST envoyer au plus
une tentative d'arrêt au groupe vivant, tolérer sa disparition observée, garder
la sortie partielle et enregistrer l'identité du processus. Un arrêt non confirmé
MUST rester UNKNOWN ; une limite atteinte MUST NOT être assimilée à une réussite.

#### Scenario: Sortie dépassant la limite
- **WHEN** la capture atteint sa limite et le groupe se termine
- **THEN** CAB conserve la sortie bornée et le résultat natif sans renvoyer de signaux répétés à un groupe disparu

### Requirement: PostgreSQL multi-majeur
CAB MUST prendre en charge PostgreSQL 17 et 18. Son paquet MUST dépendre de
postgresql et postgresql-common. La référence de version et de cluster MUST
être persistée sous /etc/cab indépendamment de DIU. L'amorçage Web MUST choisir
la version supportée fournie par Debian sans créer de base avant validation.

#### Scenario: Installation Forky
- **WHEN** le premier parcours Web est validé sur une machine fournie en PG18
- **THEN** le cluster CAB utilise PG18 et sa référence est enregistrée

### Requirement: Migration majeure protégée
CAB MUST comparer au démarrage la référence, le serveur réel et la cible Debian.
Un écart MUST déclencher une qualification puis migration du seul cluster cab,
avec sauvegarde et reçu durable. CAB MUST vérifier l'intégrité avant adoption
et conserver l'ancien cluster, les SID/RUN et reçus, sans rejouer les opérations.

#### Scenario: Passage de PG17 à PG18
- **WHEN** la cible Debian installée devient PG18 et le cluster CAB est en PG17
- **THEN** CAB sauvegarde et migre à frontière sûre, vérifie les données et reprend Electric

#### Scenario: Migration interrompue
- **WHEN** CAB retrouve un reçu de migration non terminal après dispatch
- **THEN** les deux clusters et les preuves restent conservés et aucun effet n'est rejoué

### Requirement: Frontière et reprise PostgreSQL
Un effet indécis ou un client actif MUST interdire la bascule PostgreSQL.
Une migration interrompue MUST NOT être réémise automatiquement. Electric MUST
reconstruire son flux après une migration logique sans ancienne projection.

#### Scenario: Opération protégée
- **WHEN** une opération possède un reçu UNKNOWN non réconcilié
- **THEN** la migration est refusée et ce reçu demeure intact

### Requirement: Interface CAB adaptée aux écrans
L’interface CAB MUST adapter ses pages, sa navigation et ses fenêtres à la largeur disponible. La présentation existante en 3840 × 2160 MUST rester la référence sur grand écran. Les données, états et actions MUST rester accessibles.

#### Scenario: Grand écran de référence
- **WHEN** une page CAB est affichée en 3840 × 2160
- **THEN** elle conserve ses dispositions de référence et ses commandes.

#### Scenario: Détail d’un agent en 4K
- **WHEN** une page de détail d’agent est affichée en 3840 × 2160
- **THEN** ses blocs occupent toute la largeur disponible, avec au maximum quatre blocs de même largeur par ligne.

#### Scenario: Détail d’un agent en Full HD
- **WHEN** une page de détail d’agent est affichée avec une largeur disponible de 1920 pixels
- **THEN** quatre blocs restent sur la première ligne et la typographie varie progressivement avec la largeur jusqu’au référentiel 4K.

#### Scenario: Téléphone ou tablette
- **WHEN** la largeur disponible ne permet plus la présentation de référence
- **THEN** la navigation, les blocs et les fenêtres s’adaptent sans débordement horizontal de la page et les textes longs restent lisibles.

#### Scenario: Sessions sur écran contraint
- **WHEN** un tableau de sessions ou d’archives ne dispose pas de la largeur nécessaire
- **THEN** ses données et actions restent accessibles dans une présentation adaptée avec leurs libellés.

#### Scenario: Contenu et opérations préservés
- **WHEN** la présentation change selon la taille de l’écran
- **THEN** CAB conserve les mêmes données, les mises à jour en direct et les mêmes actions métier.

### Requirement: Attente du catalogue MCP sans rechargement répété
Lorsqu’un relais dispose déjà d’un moteur vivant à la version cible mais attend encore la lecture du catalogue par le client, CAB MUST conserver cet état d’attente sans redémarrer le moteur en boucle. La reconnexion et la mise à jour MUST rester en attente jusqu’à observation du catalogue réel ou d’un état terminal admissible.

#### Scenario: Catalogue encore non lu
- **WHEN** le moteur est chargé à la version cible et que le catalogue du client n’est pas encore observé
- **THEN** CAB attend le catalogue sans rejouer le rechargement ni déclarer le connecteur prêt.

#### Scenario: Déconnexion explicitement confirmée
- **WHEN** un administrateur confirme la déconnexion d’un relais ciblé après vérification de l’arrêt de ce relais et de son moteur, sans requête ni effet incertain à la dernière observation
- **THEN** CAB conserve un reçu de déconnexion explicite, sans déclarer le catalogue lu ni le relais reconnecté, et réévalue la mise à jour concernée.

#### Scenario: Relais de remplacement
- **WHEN** un relais ciblé disparaît mais que son client reste actif
- **THEN** CAB ne considère comme remplacement qu’un relais nouveau lié à la même instance ; un autre relais déjà présent ne constitue pas une preuve.

### Requirement: Réglages responsives partagés
CAB MUST fournir six profils de référence : mobile 390 px, tablette 768 px, HD 1366 px, Full HD 1920 px, QHD 2560 px et 4K 3840 px. Chaque profil MUST comporter deux multiplicateurs réglables de 50 à 150 %, l’un pour la taille générale de l’interface et l’autre pour les polices ; tous valent 100 % par défaut et conservent les comportements responsives existants. Entre deux références, les multiplicateurs MUST être interpolés linéairement et rester constants hors de la plage.

#### Scenario: Modification partagée entre pages
- **WHEN** un administrateur enregistre les pourcentages d’un profil
- **THEN** CAB les conserve en PostgreSQL et diffuse une projection limitée aux préférences d’interface via Electric ; les pages ouvertes les appliquent sans rechargement.

#### Scenario: Ancien client
- **WHEN** un client ancien enregistre le thème ou la police globale sans profils responsives
- **THEN** les profils préexistants sont conservés.

#### Scenario: Mode développeur
- **WHEN** un administrateur active le mode développeur depuis la page de mise à jour
- **THEN** CAB affiche dans le bandeau des pages ouvertes les commandes d’échelle de l’interface et des polices pour le profil de résolution le plus proche ; les modifications sont persistées et diffusées par Electric.
- **AND** la désactivation masque ces commandes sans modifier les réglages des profils.

### Requirement: Références responsives propres aux pages
CAB MUST conserver en base des références de taille d’interface et de police propres à chaque page et chaque profil de résolution. Une référence non renseignée vaut 100 %. Le changement d’une référence depuis le bandeau MUST affecter uniquement la page visée et être synchronisé par Electric avec les autres fenêtres de cette page.

#### Scenario: Multiplicateur global
- **WHEN** les pourcentages globaux sont modifiés dans l’administration
- **THEN** chaque page applique le produit de ses propres références et des facteurs globaux, sans effacer ses références.

#### Scenario: Mode développeur
- **WHEN** un administrateur active le mode développeur depuis la page de mise à jour
- **THEN** les commandes du bandeau modifient les références de la page courante pour le profil de résolution le plus proche.
- **AND** le mode développeur est désactivé par défaut sur une installation neuve.

### Requirement: Confirmation administrative d’une liaison MCP arrêtée
CAB MUST permettre à un administrateur de confirmer explicitement la déconnexion d’un relais ciblé par un reçu de mise à jour, uniquement après vérification de l’arrêt effectif du relais et de son moteur et de l’absence de requête ou d’effet incertain à la dernière observation et d’opération ou de bail actif pour son acteur. CAB MUST conserver la décision et ses identités dans le reçu et l’audit, sans la présenter comme une reconnexion ou une lecture de catalogue.

#### Scenario: Confirmation de la déconnexion
- **WHEN** la cible du reçu est arrêtée et que l’administrateur confirme sa déconnexion
- **THEN** CAB enregistre l’état DISCONNECTED et réévalue le même reçu sans lancer une nouvelle installation.

#### Scenario: Cible vivante ou effet incertain
- **WHEN** l’arrêt ne peut pas être prouvé ou qu’un effet reste incertain
- **THEN** CAB refuse la confirmation et conserve la protection de la mise à jour.

### Requirement: Surveillance récursive et limitation des analyses Git
CAB MUST surveiller récursivement les dossiers des projets enregistrés, adapter la surveillance aux ajouts, suppressions, renommages et déplacements de projet et regrouper les événements dans une file en mémoire par projet. Il MUST limiter à une analyse Git simultanée pour CAB et appliquer les délais configurés uniquement aux analyses automatiques. Un clic manuel MUST les ignorer. Une perte d’événements MUST déclencher une reconstruction de la surveillance et une réconciliation.

#### Scenario: Activité continue
- **WHEN** des fichiers changent sans interruption
- **THEN** CAB regroupe les événements et lance une analyse au plus tard après le délai maximal, sous réserve de l’intervalle minimal et de la disponibilité du worker

#### Scenario: Relance manuelle
- **WHEN** un utilisateur demande une relance manuelle
- **THEN** CAB ignore les délais automatiques tout en conservant une seule analyse simultanée

### Requirement: Réglages Git en base
Administration / Git MUST permettre de modifier les délais en secondes conservés dans PostgreSQL : calme, intervalle minimal et attente maximale. Les valeurs initiales MUST être 7, 30 et 70 et s’appliquer sans redémarrage.

#### Scenario: Modification des délais
- **WHEN** un administrateur enregistre des délais valides
- **THEN** CAB les conserve en base et les applique aux prochaines analyses

### Requirement: Navigation Forges d’un projet
Le menu des projets MUST présenter les entrées Archives, Forges, Incidents et Sessions par ordre alphabétique. La page `/projects/<identifiant>/forges` MUST afficher le nom et la version du projet à partir de ses métadonnées, avec actualisation via Electric.

#### Scenario: Ouverture de la page Forges
- **WHEN** un utilisateur ouvre Forges depuis un projet accessible
- **THEN** CAB affiche la page propre à ce projet avec son nom, sa version, le sous-titre « DEPÔTS DU PROJET », puis les blocs Git et forges.
- **AND** les lectures Git et les vérifications de forges déclenchées à l’ouverture sont effectuées depuis cette page plutôt que depuis l’accueil.

#### Scenario: Présentation commune des pages du projet
- **WHEN** un utilisateur ouvre Archives, Incidents ou Sessions
- **THEN** CAB présente le nom et la version du projet suivis du nom de la page, avec la même typographie et le même menu que Forges.

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

### Requirement: Versions et tags de version sans préfixe
CAB MUST produire et persister les versions du projet et de release, ainsi que les nouveaux tags de version Git et de release, sans préfixe v. Une version transmise par la session MUST déterminer le tag ; à défaut, le tag par défaut MUST être égal à la version du projet.

#### Scenario: Version transmise ou défaut
- **WHEN** une session transmet une nouvelle version ou qu'un tag de version est demandé sans version fournie
- **THEN** CAB utilise respectivement la version transmise ou PROJECT_VERSION, sans ajouter de v.
- **AND** une saisie préfixée est refusée avant mutation et les lecteurs historiques restent compatibles sans renommer les anciens tags.

### Requirement: Indexation immédiate des documents de clôture
CAB MUST indexer chaque rapport statistique après son écriture, avant libération de sa réservation. Il MUST indexer immédiatement le BLOCKERS.md attribuable au RUN après sa création ou son amendement, sans absorber une réservation étrangère.

#### Scenario: Rapports et dépendance non satisfaite
- **WHEN** CAB produit les statistiques du change puis le global, ou observe un BLOCKERS.md attribuable au RUN
- **THEN** les seuls documents concernés sont indexés et leurs empreintes sont conservées.

### Requirement: Dernier commit confirmé avant clôture
Lorsqu'une livraison Git est requise, CAB MUST publier un dernier commit limité
aux rapports du change, au global et au BLOCKERS.md éventuel avant clôture. Les
reçus MUST lier documents et destinations au RUN et protéger les effets incertains.
Un développement explicitement autorisé en clôture hôte sans livraison MUST
conserver archive, preuves et rapports sans commit ni envoi.

#### Scenario: Clôture achevée
- **WHEN** les critères et la livraison Git applicables sont confirmés
- **THEN** CAB termine les statistiques, vérifie le dernier commit local et ses envois distants, puis seulement rend CLOSED.

#### Scenario: Clôture bloquée
- **WHEN** une session avec livraison Git s'arrête pour une dépendance non satisfaite avec BLOCKERS.md
- **THEN** CAB publie les mêmes documents finaux et le fichier de blocage avant de rendre BLOCKED, en conservant le change ouvert et le code non livré.

#### Scenario: Échec ou réponse perdue
- **WHEN** un commit ou un envoi ne peut pas être confirmé
- **THEN** CAB expose l'étape et son reçu, ne déclare pas la clôture réussie et ne répète pas un effet confirmé ou incertain.

#### Scenario: Clôture hôte sans livraison
- **WHEN** ce mode de développement direct est autorisé explicitement avec index libéré et aucune obligation de publication
- **THEN** CAB vérifie archive et preuves courantes, indexe les rapports et rend CLOSED sans commit ni envoi
- **AND** le reçu distingue l'absence de livraison d'une publication réussie

### Requirement: Mesures terminales non récursives
CAB MUST générer les rapports finaux à partir des snapshots de fin des périodes closes. Le commit et les envois des métadonnées MUST NOT provoquer une boucle de régénération et de commits du même bilan.

#### Scenario: Publication du bilan figé
- **WHEN** la période de codage est terminée et le bilan terminal est publié
- **THEN** les observations postérieures ne modifient pas rétroactivement cette période et une reprise conserve le même reçu.

### Requirement: Tag de version déplacé par le moteur à la clôture
Lorsqu'un commit terminal est requis, CAB MUST déplacer automatiquement le tag
de version sur ce commit sans changer la version ni ajouter de v. Branche et tag
MUST être modifiés atomiquement avec valeurs attendues et vérification distante.
La clôture hôte explicitement sans livraison MUST NOT déplacer un tag.

#### Scenario: Commit terminal et tag concordants
- **WHEN** le dernier commit des statistiques et du BLOCKERS.md éventuel est créé
- **THEN** CAB déplace le tag de la version transmise, ou de PROJECT_VERSION à défaut, vers ce commit.
- **AND** l'envoi de la branche et du tag est atomique et le reçu confirme leur commit cible identique.

#### Scenario: Référence concurrente ou résultat indécis
- **WHEN** la branche ou le tag a changé depuis l'observation ou que l'envoi n'est pas confirmé
- **THEN** CAB préserve l'incertitude et ne déclare pas de clôture réussie ni ne force un déplacement non vérifié.

### Requirement: Centre de notifications global persistant
CAB MUST afficher une cloche permanente près du contrôle du thème, animée tant
que des notifications non lues existent. Les notifications MUST être stockées
dans `cab_notifications` et synchronisées via Electric pour les administrateurs.
L'expéditeur MUST être le nom du projet associé, ou CAB pour un message global.

#### Scenario: Lecture et navigation
- **WHEN** le développeur ouvre la cloche et parcourt les notifications
- **THEN** l'overview présente leur expéditeur et contenu avec flèches précédente/suivante
- **AND** chaque message affiché est supprimé de la base à sa première lecture
- **AND** les messages consultés restent parcourables dans cet overview jusqu'à sa fermeture
- **AND** fermer vide cet aperçu sans supprimer les messages jamais affichés

#### Scenario: Centre vide
- **WHEN** aucune notification n'existe
- **THEN** la cloche reste visible et ouvre une fenêtre indiquant l'absence de message

### Requirement: Questions interactives durables
CAB MUST pouvoir émettre une question avec plusieurs choix. Une question non
répondue MUST rester disponible après fermeture de l'overview. La réponse MUST
être validée, enregistrée une seule fois avec un reçu corrélé puis retirer la
question du centre. Une réponse MUST NOT exécuter une commande arbitraire.

#### Scenario: Réponse après réouverture
- **WHEN** une question lue est fermée puis rouverte sans réponse
- **THEN** ses choix restent proposés
- **AND** une réponse valide crée un reçu durable et retire la question
- **AND** une tentative concurrente contradictoire est refusée

### Requirement: Livraisons dans les notifications
CAB MUST supprimer l'affichage du journal CI/CD dans le bloc Git et présenter
ses étapes publiques dans une notification attribuée au projet concerné.

#### Scenario: Résultat de livraison après lecture de son avancement
- **WHEN** une livraison évolue après lecture de sa notification d'avancement
- **THEN** son résultat terminal est publié en notification non lue distincte
- **AND** les détails de livraison ne sont plus affichés dans le bloc Git

### Requirement: Nom du change dans le commit final
Le moteur CAB MUST utiliser l'identifiant du change comme message du commit
final de clôture, à la place du libellé générique des statistiques. Il MUST
conserver les garanties de commit unique et le déplacement du tag sans v.

#### Scenario: Clôture achevée ou bloquée
- **WHEN** CAB crée le commit final des statistiques et des dépendances éventuelles
- **THEN** le message du commit est l'identifiant du change concerné
- **AND** les commits historiques déjà publiés restent inchangés

### Requirement: Autorité de sélection de version
En direct, le codeur MUST choisir une version cohérente avec le versionnement du
projet sans la redemander au développeur. En piloté, l'orchestrateur MUST choisir
et déclarer la version ; le service MUST refuser une livraison sans cette
déclaration ou avec un autre numéro. Les skills et plugins MUST porter cette
répartition. Une version imposée par le développeur MUST primer.

#### Scenario: Livraison directe sans numéro fourni
- **WHEN** le développeur demande une CI/CD sans préciser de version
- **THEN** le codeur direct consulte le versionnement du projet et choisit le numéro adapté
- **AND** CAB enregistre sa sélection à l'admission de la livraison

#### Scenario: Livraison pilotée
- **WHEN** l'orchestrateur déclare une version pour le RUN piloté
- **THEN** seul ce numéro peut être livré par le codeur
- **AND** la déclaration d'un autre numéro par le codeur est refusée avant toute opération Git

### Requirement: Libération après travail hôte sans livraison
CAB MUST permettre au codeur de libérer les réservations de son RUN après
validation et indexation des fichiers, sans commit ni push. Le service MUST
vérifier leur concordance avec l'index isolé, conserver cet index et ses objets,
et refuser une libération si une livraison ou un effet incertain existe.

#### Scenario: Commit manuel après validation hôte
- **WHEN** le codeur libère ses fichiers validés et indexés sans CI/CD
- **THEN** CAB retire uniquement ses réservations actives et conserve un reçu idempotent
- **AND** le commit manuel ne reste plus bloqué par ces réservations
- **AND** les réservations des autres sessions restent protégées

#### Scenario: Modifications pas encore indexées
- **WHEN** un fichier réservé diffère de l'index de session ou n'y figure pas
- **THEN** CAB refuse de libérer les réservations

### Requirement: Édition des métadonnées depuis le détail d'un commit
CAB MUST proposer Éditer à côté de Fermer dans le détail d'un commit local.
L'overview MUST permettre de modifier message, auteur, courriel, date avec
fuseau, tag et description du tag. Message et description du tag MUST être
distincts. L'historique parent MUST rester ouvert et être actualisé après édition.

#### Scenario: Édition d'un commit de l'historique
- **WHEN** le développeur valide le formulaire d'édition
- **THEN** CAB réécrit le commit choisi et ses descendants sur la branche locale
- **AND** les arbres des commits, l'index et les fichiers de travail restent identiques
- **AND** les autres branches et dépôts distants restent inchangés
- **AND** les tags locaux concernés suivent les nouveaux commits

#### Scenario: Édition ou création d'un tag
- **WHEN** un nom et une description de tag sont fournis
- **THEN** CAB crée ou modifie le tag choisi avec cette description
- **AND** un nom vide supprime le tag choisi et une description sans nom est refusée

#### Scenario: Éditeur commun depuis la ligne Tag
- **WHEN** le développeur clique sur un tag du bloc Git ou sur l'ajout d'un tag
- **THEN** CAB ouvre le même overview complet de métadonnées que depuis l'historique
- **AND** le tag cliqué est présélectionné ou le nom proposé suit le défaut du projet
- **AND** la corbeille conserve son parcours de suppression directe du tag
- **AND** le sélecteur Tag à éditer reste visible sans tag existant avec le choix Créer un nouveau tag

#### Scenario: Édition depuis le dernier commit
- **WHEN** le développeur clique sur Éditer dans l'overview Dernier commit
- **THEN** CAB ouvre l'éditeur commun dans un second overview
- **AND** fermer ou annuler ce second overview conserve le détail du commit ouvert
- **AND** après enregistrement le détail du commit est actualisé

#### Scenario: Métadonnées du futur commit
- **WHEN** le développeur ouvre Nouveau commit depuis le titre du bloc Git
- **THEN** CAB propose message, auteur, courriel, date, tag et description du tag
- **AND** l'auteur et le courriel proviennent du projet et la date est préremplie
- **AND** les valeurs saisies s'appliquent au commit créé et à son tag
- **AND** message du commit et description du tag restent indépendants
- **AND** le suivi console et la confirmation de déplacement d'un tag existant sont conservés

#### Scenario: Concurrence ou signature protégée
- **WHEN** HEAD, branche ou tags ont changé depuis la lecture, ou une signature serait invalidée
- **THEN** CAB refuse l'édition avant de déplacer une référence
- **AND** un reçu incertain n'est pas rejoué automatiquement

### Requirement: Navigation de l'accueil Projets
La page /projects MUST remplacer son titre central Projets par une maison
cliquable vers cette même page, dans une barre de navigation utilisant la même
présentation et le même séparateur horizontal que les pages d'un projet.

#### Scenario: Accueil de la zone
- **WHEN** le développeur ouvre /projects sans projet sélectionné
- **THEN** la maison remplace le titre central et renvoie vers /projects
- **AND** le séparateur horizontal reprend la présentation des menus d'un projet

### Requirement: Retour depuis le titre latéral Projets
Le libellé Projets du menu latéral MUST être un lien vers /projects sur toutes
les pages qui utilisent cette barre latérale.

#### Scenario: Retour à la liste
- **WHEN** le développeur clique sur Projets dans la colonne gauche d'un projet ou d'une sous-page
- **THEN** CAB revient à /projects sans modifier le projet

### Requirement: Tableau global des sessions de projets
CAB MUST proposer Sessions dans le menu de /projects et exposer la page
/projects/sessions. Cette page MUST reprendre le tableau des sessions par projet
avec une colonne Projets contenant son identifiant cliquable vers son accueil.

#### Scenario: Sessions de plusieurs projets
- **WHEN** le développeur ouvre /projects/sessions
- **THEN** les sessions non archivées des projets accessibles apparaissent dans le tableau
- **AND** la colonne Projets mène à l'accueil de chaque projet
- **AND** les liens RUN et actions restent rattachés au bon projet
- **AND** les pages de sessions par projet conservent leur présentation

### Requirement: Portée et actualisation des sessions globales
Le flux Electric global MUST être authentifié et calculer sa portée côté
serveur. Les acteurs non administrateurs MUST recevoir uniquement les projets
autorisés. Les sessions MUST être actualisées sans rechargement de la page.

#### Scenario: Acteur limité
- **WHEN** un acteur demande le flux global avec des paramètres de table ou de filtre arbitraires
- **THEN** CAB conserve la projection et le filtre de projets autorisés calculés côté serveur
- **AND** aucun projet autorisé implique un résultat vide
- **AND** une demande non authentifiée ne transmet aucune requête à Electric

#### Scenario: Changement d'étape
- **WHEN** une session visible change d'étape en base
- **THEN** la ligne correspondante est actualisée par Electric sans rechargement

### Requirement: Nouvelle réservation d'un snapshot libéré
CAB MUST pouvoir réserver un fichier déjà libéré par le même acteur et la même
session native si son index protégé, son empreinte et le contenu du fichier
correspondent toujours au reçu de libération. Les modifications nouvelles et
les réservations étrangères MUST rester protégées.

#### Scenario: Évolution hôte successive
- **WHEN** une nouvelle évolution réserve un fichier modifié mais déjà validé et libéré dans cette session
- **THEN** CAB autorise la reprise seulement après vérification de son snapshot conservé
- **AND** un contenu changé depuis sa libération est refusé

### Requirement: Archives globales des projets
CAB MUST proposer /projects/archives dans le menu commun et reprendre le tableau
des archives avec une colonne Projets affichant l'identifiant cliquable vers son
accueil. Liens RUN et actions MUST rester rattachés au bon projet.

#### Scenario: Archives de plusieurs projets
- **WHEN** le développeur ouvre Archives dans le menu Projets
- **THEN** les archives de ses projets accessibles sont affichées
- **AND** Projets mène à l'accueil correspondant et les pages par projet restent disponibles

### Requirement: Pagination à dix lignes
Les listes Sessions et Archives, globales et par projet, MUST afficher au plus
dix lignes par page avec Premier, Précédent, Page X / Y, Suivant et Dernier.
Les archives MUST être paginées côté serveur après filtrage des autorisations.

#### Scenario: Parcours complet
- **WHEN** plus de dix éléments existent
- **THEN** les pages permettent de parcourir tous les éléments autorisés sans omission
- **AND** les commandes indisponibles sont désactivées et une page devenue inexistante est ramenée à la dernière

### Requirement: Portée des archives et actualisation
CAB MUST filtrer les archives et leur flux Electric selon les projets autorisés
de l'acteur actif. Le client MUST NOT pouvoir remplacer le filtre serveur.

#### Scenario: Consultation et changements
- **WHEN** une archive est ajoutée ou retirée dans le périmètre autorisé
- **THEN** le tableau est actualisé via Electric avec le rafraîchissement de secours existant
- **AND** les acteurs inactifs, non authentifiés ou sans projet n'obtiennent aucune archive

### Requirement: Clôture hôte validée sans livraison
Sur autorisation administrative explicite, un RUN direct de développement sans
obligation de publication ou installation MUST pouvoir être déclaré sans
livraison après libération de son index. Archive, preuves courantes et rapports
MUST rester obligatoires. Le reçu CLOSED MUST déclarer delivered=false.

#### Scenario: Travail hôte achevé
- **WHEN** l'autorité déclare ce mode sur un index libéré sans effet protégé ni livraison commencée
- **THEN** le processeur normal clôture seulement après vérification des preuves et de l'archive
- **AND** les rapports sont indexés, l'index est conservé et aucun commit, tag ou push n'est effectué

#### Scenario: Réservation pendant la préparation d'archive
- **WHEN** des fichiers restent réservés par le RUN
- **THEN** la clôture attend leur indexation puis leur libération
- **AND** une reprise explicite d'un index libéré n'est admise que si son snapshot conservé est inchangé

### Requirement: Révision des critères avant qualification
Une autorité administrative MUST pouvoir réviser les critères avant toute
opération ou preuve avec empreintes attendues et motif explicite. L'ancien
contrat MUST être conservé ; commandes, producteurs et revue MUST rester inchangés.

#### Scenario: Précision de la demande avant contrôle
- **WHEN** le développeur précise dix lignes au lieu de vingt-cinq avant toute qualification
- **THEN** CAB conserve le contrat précédent et exige une nouvelle preuve du contrat révisé
- **AND** opération, preuve, gel, import, revue ou effet protégé interdisent cette révision
- **AND** un doublon identique conserve le reçu tandis qu'un contenu contradictoire est refusé

### Requirement: Annulation prouvée d'une initialisation d'index non publiée
Un administrateur MUST pouvoir régulariser un essai d'indexation UNKNOWN limité
à la préparation si l'index est identique à sa base et aucune référence de
snapshot n'existe. Le reçu original MUST rester intact et l'index de base MUST
être conservé en sauvegarde. Ce parcours MUST NOT rejouer l'essai original.

#### Scenario: Aucun fichier n'a été indexé
- **WHEN** l'administrateur cible l'effet avec empreinte attendue et autorisation explicite
- **THEN** CAB vérifie absence de verrou, de snapshot et d'autres effets protégés
- **AND** il conserve le reçu original, annule cet essai et permet un nouvel essai distinct
- **AND** toute donnée indexée ou référence existante interdit cette annulation

### Requirement: Liaison native et connecteur distingués
CAB MUST retourner séparément la liaison du journal natif et celle du connecteur authentifié. Il MUST NOT présenter une liaison de journal seule comme une autorisation Git. Une réparation MUST préserver les identités et les effets indécis, sans rejouer de requête métier.

#### Scenario: Journal lié sans worker reconnu
- **WHEN** le journal est vérifié mais le worker appelant ne correspond à aucun connecteur vivant authentifié
- **THEN** `native.bind` indique `connector_bound=false` et les opérations Git restent refusées.

#### Scenario: Worker réel reconnu
- **WHEN** le worker appelant appartient au relais authentifié enregistré et la liaison de RUN est admissible
- **THEN** `native.bind` indique `connector_bound=true` et le contexte Git identifie ce seul RUN.

#### Scenario: Récupération du couple réel sans heartbeat observé
- **WHEN** le worker authentifié et son parent CAB sont vérifiés par UID, agent, PPID, PID/start/boot, sans registre concurrent ni liaison de RUN incompatible
- **THEN** CAB peut créer une observation conservatrice `OBSERVED` permettant le rattachement du RUN vérifié ; versions et catalogue restent inconnus, incertitude vraie, sans prétendre à un heartbeat ou une disponibilité CABU.

#### Scenario: Heartbeat réel après récupération
- **WHEN** le parent authentifié fournit ensuite son vrai heartbeat pour le même couple kernel
- **THEN** CAB adopte atomiquement la liaison dans le registre du heartbeat, conserve l'ancienne observation `SUPERSEDED` et garantit un seul connecteur sélectionnable.

### Requirement: Contestation administrative d'un contrôle non probant
CAB MUST permettre à un administrateur authentifié de contester une preuve CAB de contrôle courant en désignant RUN, check, opération, preuve et leurs empreintes exactes. Il MUST conserver les originaux, l'autorité, la raison et l'autorisation dans un événement durable, exclure cette preuve et incrémenter la révision du seul contrôle après correction de son argv. Critères, producteurs et revue MUST rester inchangés. La contestation MUST NOT exécuter de commande ni lever une protection.

#### Scenario: Contrôle réussi sans test découvert
- **WHEN** l'administrateur démontre que la réussite courante ne mesure pas le critère et transmet un argv corrigé
- **THEN** CAB conserve le reçu initial intact, exclut la preuve contestée et exige une nouvelle exécution à la nouvelle révision ; la seule preuve contestée ne permet aucune clôture.

#### Scenario: Répétition et concurrence
- **WHEN** une demande identique est répétée ou une demande concurrente porte une empreinte périmée
- **THEN** CAB retourne le même reçu dans le premier cas et refuse le second ; aucun autre contrôle n'est modifié.

#### Scenario: Frontière protégée
- **WHEN** un effet est indécis, un bail détenu, le RUN gelé, importé, revu ou clôturé
- **THEN** CAB refuse la contestation et conserve toutes les protections et preuves.

### Requirement: Récupération autonome bornée du parcours de livraison
CAB MUST permettre une correction administrative de préqualification `development` vers `delivery` uniquement avant toute opération ou preuve et si une publication est déjà cadrée. Les critères, checks, producteurs et revue MUST rester inchangés ; empreintes, historique et protections MUST être conservés. CAB MUST inclure les rapports CAB vérifiés des archives validées appartenant explicitement au lot de la même session, sans réservation ou édition des statistiques par le LLM.

#### Scenario: Admission de livraison corrigée avant qualification
- **WHEN** l'administrateur transmet les empreintes exactes, l'autorisation et `nature=delivery` avant opération, preuve, effet, bail, revue, gel ou import, avec publication déjà cadrée
- **THEN** CAB conserve le contrat initial, corrige seulement la nature, exige les nouvelles preuves et refuse toute autre transition.

#### Scenario: Rapports générés des archives du lot
- **WHEN** des archives de RUN CLOSED prouvés du même projet, acteur et SID ont proposal.md et tasks.md réservés dans l'index courant
- **THEN** CAB inclut leurs rapports générés prêts, sans override, dont le SHA entier correspond au fichier vérifié ; une réservation contradictoire ou un contenu modifié empêche son adoption et aucun rapport étranger n'est absorbé.

#### Scenario: Réservation après archivage vérifié
- **WHEN** la réconciliation officielle du même RUN constate une archive unique réelle et l'absence de la source, avec les anciens chemins réservés dans le même index, acteur et session
- **THEN** CAB reconnaît automatiquement les mêmes fichiers relatifs sous leur chemin d'archive, conserve la provenance dans le reçu de réservation et refuse toute cible non régulière, étrangère ou concurrente ; les captures initiales restent intactes.

### Requirement: Récupération statistique sur état initial prouvé
CAB MUST réconcilier uniquement une publication arrêtée dont l'état avant des fichiers et de l'index est vérifié sous verrous. Le propriétaire MUST être arrêté ou localement inactif avec identité exacte. CAB MUST conserver UNKNOWN et son empreinte dans un événement, classer FAILED_NO_CHANGE sans succès ni rejeu et poursuivre la finalisation normale. Toute ambiguïté MUST rester protégée.

#### Scenario: Écriture non retenue
- **WHEN** propriétaire et écrivain sont arrêtés et fichier/index correspondent à leurs états avant vérifiés sans activité concurrente
- **THEN** CAB enregistre FAILED_NO_CHANGE, conserve le constat UNKNOWN et ne rejoue aucune écriture.

#### Scenario: Propriétaire local après sortie de son exécution
- **WHEN** l'identité du processus propriétaire est celle du processus courant, le job n'est plus ACTIVE sous les verrous et tous les autres constats d'état avant sont prouvés
- **THEN** CAB peut réconcilier sans redémarrage du processus, en distinguant l'arrêt de l'exécution de celui du processus ; un job ACTIVE ou un propriétaire extérieur vivant reste refusé.

### Requirement: Paquets publics utilisables indépendamment de l’umask du service
CAB MUST borner l’umask au seul subprocess de build et conserver celle du service. Avant APT, CABU MUST refuser un paquet dont les fichiers et répertoires publics attendus ne disposent pas des droits de lecture/exécution requis. Les chemins privés MUST rester hors correction.

#### Scenario: Service sous umask restrictive
- **WHEN** le service construit un paquet sous umask077
- **THEN** les données publiques du paquet restent0644 et les répertoires0755, sans changement de l’umask du parent.

#### Scenario: Paquet privatisé
- **WHEN** un paquet présente un fichier public0600 ou un répertoire0700
- **THEN** CABU refuse avant toute invocation APT et conserve le motif vérifiable.

### Requirement: Acquittement de négociation observé par le relais
Après une réponse initialize réussie observée, CAB MUST reconnaître un premier appel du client comme acquittement suffisant pour superviser son worker possédé, même sans notification initialized. Le relais MUST conserver les identités, les résultats indécis et l’interdiction de rejeu métier.

#### Scenario: Client sans notification initialized
- **WHEN** le client négocie avec succès puis envoie tools/list sans notification initialized
- **THEN** le relais reste capable de recharger son worker arrêté à frontière sûre sans rejouer une requête métier.

### Requirement: Autorisation de reprise nécessaire à CABU
Une demande CABU authentifiée MUST autoriser les reprises nécessaires de son instance observée, pour son UID et sa version, sans confirmation supplémentaire. Le service MUST conserver ce périmètre et sa provenance dans le reçu. Une autorisation révoquée, une instance divergente ou un effet incertain MUST bloquer la reprise sans rejeu. L’autorisation MUST NOT prouver la disponibilité technique ni la reconnexion.

#### Scenario: Reprise dans la mise à jour autorisée
- **WHEN** le paquet est vérifié et la même instance atteint une frontière sûre
- **THEN** CAB admet sa reprise nécessaire sans nouvelle confirmation et conserve un reçu corrélé

#### Scenario: Révocation avant dispatch
- **WHEN** le demandeur révoque cabu_recovery_authorized avant une reprise en attente
- **THEN** CAB bloque son dispatch sans changer la génération fournisseur ni rejouer un effet

#### Scenario: Ancien reçu ou instance étrangère
- **WHEN** le reçu ne porte pas d’instance observée ou la cible diffère
- **THEN** CAB expose le motif technique sans inventer d’autorisation ni demander une confirmation répétitive

### Requirement: Admission explicite d'un fichier préexistant
CAB MUST permettre une admission administrative ciblée des fichiers réguliers préexistants explicitement autorisés dans un RUN natif. Un CAS et un reçu idempotent MUST lier contexte et empreintes observés. Baseline, fichiers, index et preuves MUST rester inchangés. La réservation native MUST revérifier le contexte du chemin et tracer l'autorisation.

#### Scenario: Inspection administrative sans contenu
- **WHEN** l'administrateur authentifié inspecte des chemins littéraux cadrés
- **THEN** CAB restitue identité du RUN/SID, cadrage, révision, baseline, HEAD, index, statuts et empreintes des fichiers, sans leur contenu ni modification

#### Scenario: DEVOPS.md préexistant explicitement autorisé
- **WHEN** l'administrateur autorise l'état exact de DEVOPS.md dans le mandat après inspection
- **THEN** le codeur peut le réserver dans le même RUN/SID et la baseline initiale reste inchangée

#### Scenario: Source ou contexte modifiés
- **WHEN** le fichier, HEAD, l'index, le cadrage ou la baseline ne correspond plus à l'état autorisé
- **THEN** la prise en charge est refusée, sans adoption implicite ou restauration d'une ancienne autorisation

#### Scenario: Frontière protégée ou donnée étrangère
- **WHEN** un effet est indécis, un bail détenu, un fichier réservé, un gel/import/revue/clôture applicable, un lien ou un contenu déjà modifié dans l'index partagé
- **THEN** l'admission est refusée et les états et données restent protégés

#### Scenario: Répétition administrative
- **WHEN** une demande identique est répétée ou une autre entrée réutilise son request_id
- **THEN** CAB retourne le même reçu dans le premier cas et refuse le conflit dans le second

### Requirement: Baseline historique et propreté actuelle distinguées
Un statut dirty historique MUST NOT empêcher une réservation lorsque le chemin actuellement propre correspond aux octets du HEAD observé et au mode exécutable si Git le suit. CAB MUST respecter core.filemode=false sans changer les permissions ni la configuration. CAB MUST journaliser ce constat sans modifier la baseline ni reconstruire le contenu historique.

#### Scenario: Modifications précédentes publiées
- **WHEN** un chemin dirty à la capture initiale est désormais propre et identique à HEAD selon les règles de suivi Git
- **THEN** CAB autorise sa réservation actuelle et conserve le constat historique

#### Scenario: Mode exécutable ignoré par Git
- **WHEN** core.filemode=false, les octets correspondent à HEAD et seul le bit exécutable diffère
- **THEN** CAB autorise la réservation sans chmod, changement de configuration ou de baseline

#### Scenario: Statut clean sans concordance de contenu
- **WHEN** le statut masque des octets différents de HEAD, même avec core.filemode=false
- **THEN** CAB refuse la prise en charge automatique

#### Scenario: Mode suivi ou configuration instable
- **WHEN** Git suit un mode divergent ou la configuration est invalide ou change pendant la comparaison
- **THEN** CAB refuse la prise en charge automatique

### Requirement: Rapport réel d’une session canonique
Un RUN de livraison sans dossier de change MUST produire son rapport sous statistics/runs/<identité>/STATISTICS.md s’il cadre une spécification canonique réelle. Le chemin MUST dériver du projet, RUN, SID et génération. CAB MUST projeter le maître local en PG, borner ses mesures au RUN et conserver N/A. Un ChangeSource disparu MUST NOT devenir un repli canonique.

#### Scenario: Livraison canonique prouvée
- **WHEN** les preuves courantes sont acquises sans dossier de change et la spécification canonique cadrée existe
- **THEN** CAB produit un rapport réel sans créer ChangeSource, tâches ou archive artificiels

#### Scenario: Rapport de session et global
- **WHEN** CAB publie le rapport canonique puis le global
- **THEN** il indexe les seuls documents concernés, conserve leurs empreintes et inclut le maître une seule fois sans compter les autres RUN

#### Scenario: Source disparue ou document étranger
- **WHEN** un ancien ChangeSource a disparu ou la cible appartient à un autre RUN ou à une réservation étrangère
- **THEN** CAB conserve le blocage et ne remplace aucun document ou contexte

### Requirement: Clôture canonique confirmée par le moteur
CAB MUST utiliser son moteur de commit terminal pour publier le rapport canonique et le global avant CLOSED. Il MUST vérifier le namespace exact du RUN et conserver les protections des états inconnus. La reprise MUST NOT réexécuter la livraison ni retirer l’exigence de publication terminale.

#### Scenario: Rapport prêt après livraison
- **WHEN** le rapport canonique réel est publié et indexé après une livraison confirmée
- **THEN** CAB effectue le seul commit terminal et vérifie ses destinations avant clôture

#### Scenario: Commit terminal indécis
- **WHEN** le commit terminal ou son envoi est UNKNOWN
- **THEN** CAB conserve le reçu et expose le blocage sans créer une nouvelle livraison ou un autre commit

### Requirement: Visibilité des blocages postérieurs au dossier
La consultation de finalisation MUST exposer les manques persistés après le dossier de preuves, avec la phase réelle et les actions correspondantes. Elle MUST NOT annoncer READY tant qu’un rapport ou commit terminal requis reste bloqué. Seule une progression réelle MAY retirer cette attente.

#### Scenario: Rapport manquant malgré preuves valides
- **WHEN** le dossier est valide et la phase FINALIZING attend un rapport ou un commit
- **THEN** le statut et la réévaluation affichent cette attente au lieu d’un faux READY

### Requirement: Registre PostgreSQL des incidents CCAB
Les déclarations d’incident CCAB MUST être stockées dans la table PostgreSQL ccab avec identifiant, catégorie, résumé, preuves, état, claim, résolution, date et relations projet/RUN. La migration de la table existante MUST préserver toutes les données. Les commandes CCAB et leur contrat de consultation historique MUST rester compatibles.

#### Scenario: Conservation du registre
- **WHEN** la migration vers ccab est appliquée
- **THEN** les déclarations existantes conservent leurs identifiants, preuves, claims et résolutions

### Requirement: Tableau des incidents du projet
La page Incidents d’un projet MUST présenter un tableau paginé et responsive contenant les informations principales de ses déclarations. La consultation MUST être limitée aux projets autorisés et inclure tous les états d’incident.

#### Scenario: Consultation d’un projet
- **WHEN** un utilisateur ouvre la page Incidents d’un projet autorisé
- **THEN** il voit ses déclarations avec identifiant, catégorie, résumé, état, date, responsable et nombre de preuves

### Requirement: Détail d’une déclaration CCAB
L’identifiant d’une déclaration MUST ouvrir une fenêtre en lecture seule contenant son résumé, ses preuves, son claim et sa résolution. La déclaration complète MUST être consultable sans modifier son état.

#### Scenario: Ouverture du détail
- **WHEN** un utilisateur sélectionne une déclaration dans le tableau
- **THEN** CAB affiche son détail complet sans prendre ni résoudre l’incident

### Requirement: Reprise bornée du commit non émis
CAB MUST inspecter et reprendre administrativement le même reçu PARTIAL dont le commit a échoué avant les références. Le CAS MUST lier RUN/SID/génération/acteur, état autorisé, projet, source, politique, HEAD/index/réservations et version. L’échec et son reçu MUST rester conservés ; seule une nouvelle tentative corrélée du commit MAY être admise. Version et projection MUST NOT être rejouées.

#### Scenario: Même livraison après conflit de version
- **WHEN** le commit est FAILED avant références et toutes les étapes aval restent non émises
- **THEN** CAB admet une nouvelle tentative corrélée après inspection et CAS exacts sans recréer une livraison

#### Scenario: État fermé, incertain ou protégé
- **WHEN** le RUN est CLOSED, BLOCKED ou FINALIZING, ou un effet est UNKNOWN, un bail ou une opération reste actif
- **THEN** CAB refuse la reprise et conserve tous les reçus et protections

#### Scenario: Réponse perdue ou appels concurrents
- **WHEN** la même demande est répétée après perte de réponse ou présentée simultanément
- **THEN** CAB retourne le même reçu sans déclencher une seconde tentative et refuse toute entrée différente sous le même identifiant

### Requirement: Résolution explicite et limitée des conflits
CAB MAY résoudre automatiquement un scalaire de version déclaré égal à la cible si tout autre contenu et le mode sont identiques à HEAD. Un conflit de code MUST rester refusé sauf résolution manuelle portant chemin réservé, OID/modes et diff exacts approuvés par propriétaire et responsable. Le CAS MUST lier les références de revue ; CAB MUST NOT effectuer un choix ours implicite.

#### Scenario: Métadonnée de version seule
- **WHEN** seul le scalaire de version change vers la version déjà admise
- **THEN** CAB applique ce scalaire au seul candidat en conservant tout le reste de HEAD

#### Scenario: Résolution manuelle revue
- **WHEN** les références et empreintes exactes des blobs et du diff ont été approuvées
- **THEN** CAB applique uniquement ces résolutions nommées dans l’index candidat et refuse tout chemin ou blob divergent

### Requirement: Contexte revérifié avant l’effet de reprise
Le worker MUST reprendre le même verrou Git, réobserver le CAS admis et normaliser seulement ses propres transitions corrélées avant prepare ou commit. Une divergence de HEAD, source, version ou périmètre MUST refuser l’effet. La continuation MUST exécuter seulement les étapes aval jamais émises et conserver le parcours normal sans double dispatch.

#### Scenario: Contexte changé après admission
- **WHEN** HEAD, source ou version locale change entre admission et worker
- **THEN** aucun commit, mutation de version ou projection n’est exécuté et CAB expose le refus

#### Scenario: Continuation et parcours normal
- **WHEN** le commit unique est confirmé
- **THEN** forges, build, vérification et clôture sont poursuivis une seule fois dans le même reçu
