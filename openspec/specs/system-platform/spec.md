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
