# codex-integration-distribution Specification

## Purpose
Cette capacité définit l'intégration locale de CAB dans Codex et les conditions minimales de distribution reproductible.

## Requirements

### Requirement: Plugin Codex structuré
Le plugin CAB SHALL être distribué depuis la racine du dépôt, avec une
marketplace dans `.agents/plugins/marketplace.json` et un plugin dans
`plugins/cab-approval-bridge/`. Ce plugin SHALL fournir un manifeste
`.codex-plugin/plugin.json`, la skill CAB et les scripts de contrôleur,
healthcheck et SSE dans une arborescence distribuable cohérente.

#### Scenario: Validation du plugin
- **WHEN** le manifeste du plugin est soumis au validateur Codex
- **THEN** il est accepté et les chemins déclarés existent dans l'artefact

#### Scenario: Localisation du plugin
- **WHEN** une distribution CAB est préparée
- **THEN** la marketplace et le plugin sont pris depuis la racine du dépôt, sans déplacement sous `.codex/`

### Requirement: Commande de pilotage sûre
La commande Codex `/cab` SHALL être versionnée dans
`.codex/commands/cab.md` et proposer `start`, `run`, `test`, `update` et
`stop`. Elle SHALL orchestrer les ressources de communication CAB entre le
broker MCP et l'agent Codex, sans rendre de décision d'approbation ni modifier
le projet piloté. Elle SHALL préserver OpenCode et le broker MCP géré par
OpenCode lors de l'arrêt.

Avant de créer une session de codage, `/cab start` SHALL consulter `GET /mcp`
du serveur OpenCode et exiger que `cgpt-validation` soit `connected`. En cas
d'échec, elle MAY réinitialiser l'instance par `POST /instance/dispose`, puis
SHALL attendre un état sain ; elle SHALL ne jamais démarrer ni arrêter le
broker directement. Après la purge d'un nouveau RUN et ce contrôle, elle SHALL créer une nouvelle
session maîtresse OpenCode persistante. Elle MAY réutiliser la session seulement
pour la reprise du même RUN, sans purge. Elle SHALL transmettre les mandats par
la messagerie native de cette session.

Après la preuve MCP et avant de créer cette session persistante,
`/cab start` SHALL vérifier le fournisseur, le modèle et le niveau de
raisonnement effectivement configurés pour l'agent de codage ciblé. Elle SHALL
vérifier leur disponibilité via l'API OpenCode, soumettre une requête
temporaire sans outil ni accès au projet et contrôler les métadonnées
réellement observées. Si une valeur est absente, indisponible ou divergente,
elle SHALL publier `CAB_INACTIF` avec la cause et ne créer aucune session
persistante. Elle SHALL ne jamais modifier la configuration choisie par le
développeur.

`/cab update` SHALL vérifier que la marketplace `cab_codex_plugins` utilise la
source Git `AzenorPixs/cab-codex-plugins`, branche `main`, avec une extraction
sparse `.agents/plugins` et `plugins`. Si une source locale homonyme est
détectée, elle SHALL mémoriser sa racine, la remplacer par la source Git et la
restaurer si l'ajout Git échoue. Elle SHALL actualiser l'instantané Git par
`codex plugin marketplace upgrade cab_codex_plugins`, comparer le manifeste
distant de `cab-approval-bridge` à la version installée et appeler
`codex plugin add cab-approval-bridge@cab_codex_plugins` seulement si le
manifeste distant est strictement plus récent. Elle SHALL refuser une version
absente ou invalide et SHALL vérifier la version installée après la réinstallation.

`/cab update` SHALL aussi télécharger exclusivement
`.codex/commands/cab.md` depuis `https://github.com/AzenorPixs/cab-codex-plugins`,
branche `main`, vérifier son frontmatter versionné et comparer cette version
SemVer à la copie de profil Codex. Elle SHALL remplacer atomiquement cette
copie seulement si GitHub fournit une version strictement plus récente. Une
copie locale sans version MAY être remplacée par une copie GitHub valide. Un
échec réseau, une redirection d'hôte, une version invalide ou une version
distante égale ou antérieure SHALL préserver la copie locale. Elle SHALL ne
démarrer, arrêter ni modifier aucune ressource CAB ou configuration Codex, à
l'exception du déploiement atomique du superviseur et de son unité systemd
utilisateur ainsi que de la migration réversible de sa marketplace locale vers
la source Git spécifiée. Elle SHALL installer ou actualiser le superviseur
depuis le plugin installé lorsqu'il est absent ou divergent, puis recharger
systemd sans l'activer ni le démarrer.

À la fin, `/cab update` SHALL afficher un résumé séparant les versions GitHub
et locales du manifeste du plugin, du contrôleur, du superviseur, du broker et
de la commande `/cab`. La version locale du superviseur SHALL provenir du
script déployé dans le profil Codex. La version locale du broker SHALL provenir de
`broker_readiness.server_version`. Toute version indisponible SHALL être
signalée comme telle sans être déduite d'une autre source.

#### Scenario: Démarrage CAB
- **WHEN** `/cab start` est exécutée
- **THEN** elle purge le runtime selon le contrat de nouvelle session, vérifie `/mcp`, initialise le contrôleur et la supervision CAB, puis crée une nouvelle session maîtresse sans prendre de décision métier

#### Scenario: MCP non connecté
- **WHEN** `GET /mcp` ne présente pas `cgpt-validation` comme `connected`
- **THEN** `/cab start` réinitialise seulement l'instance OpenCode, attend une preuve de connexion et échoue sans créer de session si cette preuve reste absente

#### Scenario: Prévol conforme du modèle OpenCode
- **WHEN** le MCP est connecté et que le prévol constate une réponse avec le fournisseur, le modèle et le raisonnement configurés
- **THEN** `/cab start` clôt la session temporaire et peut créer la nouvelle session maîtresse

#### Scenario: Prévol divergent ou indisponible
- **WHEN** le prévol ne peut pas confirmer le fournisseur, le modèle ou le raisonnement configurés
- **THEN** `/cab start` publie `CAB_INACTIF` et ne crée aucune session persistante

#### Scenario: Test CAB
- **WHEN** `/cab test` est exécutée
- **THEN** elle vérifie le chemin de validation complet dans la session persistante, sans modifier le projet piloté

#### Scenario: Arrêt CAB
- **WHEN** `/cab stop` est exécutée
- **THEN** elle ferme seulement les ressources CAB qu'elle a créées et ne ferme ni OpenCode ni le broker MCP géré par OpenCode

#### Scenario: Mise à jour disponible
- **WHEN** `/cab update` constate une version marketplace strictement plus récente que la version installée
- **THEN** elle exécute une seule fois l'actualisation native Codex et annonce le succès seulement après vérification de la version installée

#### Scenario: Plugin déjà à jour
- **WHEN** `/cab update` constate une version installée égale ou plus récente
- **THEN** elle n'exécute aucune actualisation et signale que le plugin est à jour

#### Scenario: Métadonnées non exploitables
- **WHEN** la marketplace, le plugin ou l'une des versions nécessaires est absent ou invalide
- **THEN** `/cab update` échoue sans actualiser ni modifier de configuration

#### Scenario: Migration depuis un marketplace local
- **WHEN** `cab_codex_plugins` désigne une source locale
- **THEN** `/cab update` la remplace par la source Git CAB et restaure la source locale si l'ajout Git échoue

#### Scenario: Commande de profil plus récente sur GitHub
- **WHEN** `/cab update` télécharge une commande GitHub valide dont la version est strictement plus récente que la copie de profil
- **THEN** elle remplace atomiquement la copie de profil et vérifie sa version avant d'annoncer le succès

#### Scenario: Commande de profil non actualisable
- **WHEN** la source GitHub est inaccessible, redirigée vers un autre hôte, invalide ou pas plus récente
- **THEN** `/cab update` préserve la copie locale et rapporte la cause observée

#### Scenario: Résumé des versions
- **WHEN** `/cab update` termine, avec succès ou échec
- **THEN** elle affiche les versions GitHub et locales exigées, et signale séparément toute valeur indisponible

#### Scenario: Superviseur absent ou divergent
- **WHEN** `/cab update` a validé le plugin installé et constate que le script
  ou l'unité du superviseur est absent ou divergent dans le profil Codex
- **THEN** elle les déploie atomiquement, recharge systemd et ne démarre ni
  n'active le service

### Requirement: Version et publication cohérentes
Les artefacts distribués CAB SHALL partager une version de projet explicite ou documenter leur relation. Un catalogue marketplace SHALL référencer le plugin publié, ou être absent tant qu'aucune publication n'est définie.

#### Scenario: Préparation de release
- **WHEN** une release est préparée
- **THEN** la version du broker, du plugin et du catalogue est vérifiée avant publication

### Requirement: Distribution du superviseur local

Le plugin CAB SHALL distribuer le superviseur persistant et son unité systemd
utilisateur avec le contrôleur. `/cab start` SHALL installer et démarrer
explicitement le superviseur après le contrôleur, sans l'activer au login.
`/cab stop` SHALL refuser l'arrêt normal tant qu'un job armé ne possède pas un
gate terminal validé, puis arrêter explicitement le superviseur avant le
contrôleur. Les artefacts distribués du broker, du contrôleur et du
superviseur SHALL annoncer la même version de base.

#### Scenario: Démarrage d'un superviseur distribué

- **WHEN** `/cab start` a confirmé les préconditions CAB et installé les
  ressources locales
- **THEN** il démarre le superviseur utilisateur, vérifie son état local et ne
  l'active pas pour le login

### Requirement: Skill de statistiques embarqué dans CAB

Le plugin `cab-approval-bridge` SHALL distribuer le skill
`coding-session-statistics` et ses métadonnées sous son répertoire `skills/`.
Son installation SHALL rendre ce skill disponible sans plugin Tools Codex
et sans skill `cgpt` externe. Le protocole et la commande CAB SHALL imposer
sa production de statistiques après chaque archivage réussi selon
`archive-session-statistics`. Les composants versionnés SHALL partager la
version de base `0.87.1`, le plugin pouvant ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills `approval-bridge` et `coding-session-statistics` sont présents dans le paquet et résolus depuis son manifeste

#### Scenario: Release cohérente
- **WHEN** la release est validée
- **THEN** le broker, le contrôleur, le superviseur, le plugin et la commande annoncent tous la version de base `0.87.1`

### Requirement: Réinitialisation obligatoire d'une nouvelle session CAB

La commande `/cab start` et la skill SHALL purger le runtime avant chaque
nouvelle session CAB. Une reprise du même RUN, un compactage, une reconnexion
ou `run`, `test`, `update`, `stop` SHALL conserver le runtime, sauf l'exception
« Nouvelle session après prévol de récupération divergent » définie ici.

#### Scenario: Ancien état disponible
- **WHEN** `/cab start` ouvre une nouvelle session et aucun travail précédent n'est actif
- **THEN** le protocole purge les états historiques du broker, du contrôleur et du superviseur sans réadopter leur job ou leurs décisions

#### Scenario: Reprise du même RUN
- **WHEN** CAB reprend le même RUN sans satisfaire l'exception de prévol divergent
- **THEN** les preuves et demandes restent conservées sans purge

#### Scenario: Sous-commande sans nouveau démarrage
- **WHEN** `run`, `test`, `update` ou `stop` est exécutée sans l'exception
- **THEN** elle ne déclenche aucune purge de début de session

### Requirement: Arrêt contrôlé avant purge

L'orchestrateur SHALL prouver propriété et inactivité du contexte, sans session
occupée, mandat en cours ni permission non résolue. Un RUN actif SHALL
interdire la purge, sauf son job technique gelé neutralisé selon l'exception
de prévol divergent. Il SHALL arrêter les ressources CAB, déconnecter le
broker nativement et vérifier son verrou, sans tuer le broker ni fermer ou
redémarrer OpenCode.

#### Scenario: Travail actif ou inactivité non prouvée
- **WHEN** un travail reste actif, une propriété est inconnue ou un effet reste non réconcilié
- **THEN** la purge est refusée sans effacer le runtime

### Requirement: Outil de purge distribué et borné
Le plugin SHALL distribuer `scripts/cgpt-approval-bridge-reset.py`. L'outil
SHALL exiger une confirmation de nouvelle session et contrôler toutes les
cibles avant suppression. Il SHALL refuser les chemins relatifs, traversants,
non dédiés, symboliques ou imbriqués et les verrous occupés, non ordinaires ou
à liens matériels. Une erreur ou un état recréé SHALL interdire le démarrage.

#### Scenario: Verrou détenu ou cible invalide
- **WHEN** un broker conserve le verrou ou une cible de purge est invalide
- **THEN** l'outil échoue avant toute suppression
- **AND** une cible déjà contrôlée conserve ses données

#### Scenario: Purge échouée
- **WHEN** une suppression échoue ou qu'un autre processus recrée l'état
- **THEN** l'outil signale l'échec et CAB ne démarre pas une session sur cet état partiel

### Requirement: Prévol neuf après purge

Après purge, CAB SHALL reconnecter le broker, vérifier contexte et modèle,
créer une nouvelle session et exiger broker_readiness READY sans demande ni
permission parasite. Un test CAB SHALL prouver décision explicite, réponse MCP
corrélée et exécution unique de true ; dans l'exception de prévol divergent,
la commande SHALL être exactement /usr/bin/true avec le change_id attendu.
Aucune ancienne preuve SHALL valider ce prévol.

#### Scenario: Nouvelle session vérifiée
- **WHEN** la purge réussit et la nouvelle session passe sa readiness et son test CAB
- **THEN** seuls ces résultats neufs autorisent le premier mandat

### Requirement: Prévention des outils natifs en lecture seule
Le protocole distribué MUST demander à l'orchestrateur de désactiver explicitement bash, edit, write, apply_patch, task et skill pour tout mandat d'inventaire ou d'analyse en lecture seule. Les outils de lecture et recherche autorisés MAY rester disponibles. 

#### Scenario: Inventaire protégé
- **WHEN** un inventaire lecture seule est transmis par l'API de messagerie OpenCode
- **THEN** ses outils natifs et d'écriture sont désactivés explicitement et aucun mandat exécutable implicite n'est accordé

### Requirement: Réactivation limitée des outils exécutables
La restriction lecture seule MUST NOT modifier la configuration persistante OpenCode ni produire une approbation générale. Un futur mandat exécutable MUST réactiver uniquement ses outils nécessaires, conserver une permission native ask et un mandat CAB unitaire.

#### Scenario: Mandat exécutable suivant
- **WHEN** l'orchestrateur passe d'un inventaire à une opération native
- **THEN** seuls les outils nécessaires sont réactivés et l'opération exige sa propre décision CAB

### Requirement: Nouvelle session après prévol de récupération divergent

Après le feu vert, l'orchestrateur MUST déclencher sans nouvelle confirmation
une nouvelle session CAB pour un prévol divergent ou incomplet prouvé et
refusé avant exécution sans effet, après toutes les préconditions de sûreté.
Le mandat MUST rester refusé sans normalisation. L'automatisation MUST
appartenir à l'orchestrateur ; /job/recover MUST NOT purger ni approuver.

#### Scenario: Champ ou délai prescrit omis
- **WHEN** les arguments natifs omettent ou altèrent un identifiant, une cible, une commande, une métadonnée ou un délai prescrit, dont approval_id, files ou timeout_seconds
- **THEN** l'orchestrateur MUST appliquer la procédure après preuve native du refus et de l'absence d'effet ; une demande malformée avant enregistrement MAY être admise sur ces mêmes preuves, sans nouveau feu vert ni état terminal du RUN parent

#### Scenario: Commande ou change divergent
- **WHEN** le prévol transmet true au lieu de /usr/bin/true, un suffixe ou un autre change_id et le mandat est refusé sans effet
- **THEN** l'exception MUST être admissible sans exiger deux écarts simultanés et sans normaliser ni approuver la demande

#### Scenario: Double écart prouvé
- **WHEN** le prévol de récupération échoué a transmis true et un autre change_id
- **THEN** l'orchestrateur MUST appliquer l'exception après ses contrôles obligatoires sans redemander le feu vert

#### Scenario: Autre incident
- **WHEN** l'incident ne prouve pas un prévol divergent admissible et présente seulement un HTTP 409, un texte de l'agent ou un paramètre non prescrit
- **THEN** l'orchestrateur MUST conserver les règles ordinaires sans inventer une divergence ou une autorisation de purge

#### Scenario: Réponse MCP temporairement absente
- **WHEN** request_validation atteint son délai sans preuve native de divergence
- **THEN** l'orchestrateur MUST interroger le même approval_id sans créer une nouvelle demande ni purger pour ce seul délai

#### Scenario: Effet ou propriété incertain
- **WHEN** un effet reste inconnu, une preuve manque ou le contexte n'est pas exclusivement maîtrisé
- **THEN** l'orchestrateur MUST interdire l'exception automatique et demander l'autorité indispensable

### Requirement: Neutralisation avant abandon technique

Avant purge exceptionnelle, l'orchestrateur MUST geler le travail, traiter les
rapports, réconcilier les effets et neutraliser demandes et permissions sans
les approuver. Les gardes de propriété, inactivité et preuves MUST être
établies. Le seul job technique gelé avec gate OPEN MAY être abandonné sans
fabriquer un gate valide ni le désarmer artificiellement.

#### Scenario: Job gelé et sessions inactives
- **WHEN** un prévol admissible, la propriété du contexte, les sessions inactives et l'absence de mandat actif ou en attente, de permission non résolue et d'effet inconnu sont prouvés
- **THEN** l'orchestrateur MUST arrêter les seules ressources CAB du contexte sans fabriquer une clôture normale ni fermer OpenCode

#### Scenario: Demande ou permission restante
- **WHEN** un mandat indécis, une permission divergente ou une transmission reste à réconcilier
- **THEN** l'orchestrateur MUST refuser les permissions divergentes et clôturer les demandes sans les approuver, puis vérifier à nouveau toutes les préconditions avant purge

### Requirement: Deux espaces runtime et preuves hors purge

La purge exceptionnelle MUST utiliser l'outil existant sur les deux espaces
réellement résolus du home OpenCode et de la racine projet, en tenant compte
des chemins personnalisés. Avant suppression, checkpoint métier et preuves
des écritures validées MUST être préservés hors cibles. Un espace partagé avec
un autre travail, une preuve absente ou une cible non sûre MUST interdire la
purge. Les gardes de verrou et de chemin MUST rester inchangées.

#### Scenario: Préservation du travail prouvé
- **WHEN** les deux espaces dédiés sont purgés
- **THEN** approbations, journal, job et autres états techniques disparaissent ; sources, checkpoint métier, rapports et historiques natifs restent hors purge

### Requirement: Prévol exact de la nouvelle session exceptionnelle

Après purge, l'orchestrateur MUST créer une session et un job technique neufs.
Le prévol MUST utiliser exactement /usr/bin/true sans suffixe, le change_id
attendu, une décision explicite, une réponse MCP corrélée, une permission
consommée une fois et exit 0. La readiness finale MUST être READY sans demande
ni permission parasite. Un échec MUST interdire la reprise métier.

#### Scenario: Prévol encore divergent
- **WHEN** un nouveau prévol est refusé sans effet et les préconditions sont à nouveau établies
- **THEN** l'orchestrateur MUST relancer la procédure avec identifiants de session, job, requête et approbation neufs, sans approbation implicite ni état terminal du RUN parent

#### Scenario: Prévol exact réussi
- **WHEN** le nouveau prévol apporte toutes les preuves exactes et la readiness finale requise
- **THEN** le travail métier MAY reprendre au premier jalon non prouvé après réconciliation du checkpoint, du change attendu et des critères

### Requirement: Référence locale du protocole de codage piloté

ORCHESTRATED_CODING.md MAY être absent d'un projet sans besoin de pilotage.
AGENTS.md MUST préciser ce caractère facultatif et conditionnel. Lorsqu'un
projet nécessite une session orchestrateur–agent de codage, il MUST disposer
de ce document et les deux agents MUST le lire avant le pilotage. Le document
MUST définir le protocole technique sans étendre les autorisations.

#### Scenario: Session pilotée
- **WHEN** un orchestrateur prépare une session de codage pilotée dans un projet
- **THEN** les deux agents lisent le document dédié de ce projet avant les opérations de pilotage

#### Scenario: Session directe
- **WHEN** SCM est exécuté directement sans agent de codage piloté
- **THEN** la référence documentaire ne déclenche ni CAB, ni OpenCode, ni sondes statistiques de pilotage

#### Scenario: Projet sans besoin de pilotage
- **WHEN** le projet ne nécessite pas de session menée par un agent orchestrateur
- **THEN** l'absence du fichier facultatif est normale et ne bloque pas le travail direct
