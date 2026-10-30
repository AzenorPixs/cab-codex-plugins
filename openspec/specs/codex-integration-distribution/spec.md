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

La commande Codex `/CAB` SHALL être versionnée dans `.codex/commands/CAB.md` et proposer
`start`, `run`, `test`, `update`, `status` et `stop`. La commande `/CAB` SHALL orchestrer les
ressources de communication CAB entre le broker MCP et l'agent Codex, sans rendre de
décision d'approbation ni modifier le projet piloté. La commande `/CAB` SHALL préserver
OpenCode et le broker MCP géré par OpenCode lors de l'arrêt.

#### Scenario: Démarrage CAB
- **WHEN** `/CAB start` est exécutée
- **THEN** elle rejoint le runtime sans purge, ou le purge lors d’une réinitialisation globale exclusive, vérifie `/mcp`, initialise le contrôleur et la supervision CAB, puis crée une nouvelle session maîtresse sans prendre de décision métier

#### Scenario: MCP non connecté
- **WHEN** `GET /mcp` ne présente pas `cgpt-validation` comme `connected`
- **THEN** `/CAB start` réinitialise seulement l'instance OpenCode, attend une preuve de connexion et échoue sans créer de session si cette preuve reste absente

#### Scenario: Prévol conforme du modèle OpenCode
- **WHEN** le MCP est connecté et que le prévol constate une réponse avec le fournisseur, le modèle et le raisonnement configurés
- **THEN** `/CAB start` clôt la session temporaire et peut créer la nouvelle session maîtresse

#### Scenario: Prévol divergent ou indisponible
- **WHEN** le prévol ne peut pas confirmer le fournisseur, le modèle ou le raisonnement configurés
- **THEN** `/CAB start` publie `CAB_INACTIF` et ne crée aucune session persistante

#### Scenario: Test CAB
- **WHEN** `/CAB test` est exécutée
- **THEN** elle vérifie le chemin de validation complet dans la session persistante, sans modifier le projet piloté

#### Scenario: Arrêt CAB
- **WHEN** `/CAB stop` est exécutée
- **THEN** elle ferme seulement les ressources CAB qu'elle a créées et ne ferme ni OpenCode ni le broker MCP géré par OpenCode

#### Scenario: Mise à jour disponible
- **WHEN** `/CAB update` constate une version marketplace strictement plus récente que la version installée
- **THEN** elle exécute une seule fois l'actualisation native Codex et annonce le succès seulement après vérification de la version installée

#### Scenario: Plugin déjà à jour
- **WHEN** `/CAB update` constate une version installée égale ou plus récente
- **THEN** elle n'exécute aucune actualisation et signale que le plugin est à jour

#### Scenario: Métadonnées non exploitables
- **WHEN** la marketplace, le plugin ou l'une des versions nécessaires est absent ou invalide
- **THEN** `/CAB update` échoue sans actualiser ni modifier de configuration

#### Scenario: Migration depuis un marketplace local
- **WHEN** `cab_codex_plugins` désigne une source locale
- **THEN** `/CAB update` la remplace par la source Git CAB et restaure la source locale si l'ajout Git échoue

#### Scenario: Commande de profil plus récente sur GitHub
- **WHEN** `/CAB update` télécharge une commande GitHub valide dont la version est strictement plus récente que la copie de profil
- **THEN** elle remplace atomiquement la copie de profil et vérifie sa version avant d'annoncer le succès

#### Scenario: Commande de profil non actualisable
- **WHEN** la source GitHub est inaccessible, redirigée vers un autre hôte, invalide ou pas plus récente
- **THEN** `/CAB update` préserve la copie locale et rapporte la cause observée

#### Scenario: Résumé des versions
- **WHEN** `/CAB update` termine, avec succès ou échec
- **THEN** elle affiche les versions GitHub et locales exigées, et signale séparément toute valeur indisponible

#### Scenario: Superviseur absent ou divergent
- **WHEN** `/CAB update` a validé le plugin installé et constate que le script
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
utilisateur avec le contrôleur. `/CAB start` SHALL installer et démarrer
explicitement le superviseur après le contrôleur, sans l'activer au login.
`/CAB stop` SHALL refuser l'arrêt normal tant qu'un job armé ne possède pas un
gate terminal validé, puis arrêter explicitement le superviseur avant le
contrôleur. Les artefacts distribués du broker, du contrôleur et du
superviseur SHALL annoncer la même version de base.

#### Scenario: Démarrage d'un superviseur distribué

- **WHEN** `/CAB start` a confirmé les préconditions CAB et installé les
  ressources locales
- **THEN** il démarre le superviseur utilisateur, vérifie son état local et ne
  l'active pas pour le login

### Requirement: Skill de statistiques embarqué dans CAB
Le plugin CAB SHALL distribuer coding-session-statistics et ses métadonnées sans plugin Tools Codex ni skill cgpt externe. Le protocole et la commande SHALL imposer les statistiques après chaque archive réussie selon archive-session-statistics. Les composants versionnés SHALL partager la base de version courante ; le plugin MAY ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills CAB et coding-session-statistics sont présents et résolus depuis le manifeste

#### Scenario: Release cohérente
- **WHEN** le patch 2.1.9 est préparé
- **THEN** broker, contrôleur, superviseur, collecteurs, scripts, plugins et commandes annoncent la même base 2.1.12

### Requirement: Réinitialisation obligatoire d'une nouvelle session CAB

La commande `/CAB start` et la skill SHALL purger le runtime uniquement lors d'une
réinitialisation globale exclusive CAB. Une reprise du même RUN, un compactage, une reconnexion
ou `run`, `test`, `update`, `stop` SHALL conserver le runtime ; un prévol de récupération divergent SHALL NOT déclencher une nouvelle session ni une purge.

#### Scenario: Ancien état disponible
- **WHEN** `/CAB start` réinitialise l'infrastructure exclusive sans réservation active
- **THEN** le protocole purge les états historiques du broker, du contrôleur et du superviseur sans réadopter leur job ou leurs décisions

#### Scenario: Reprise du même RUN
- **WHEN** CAB reprend le même RUN y compris après un prévol de récupération divergent
- **THEN** les preuves et demandes restent conservées sans purge

#### Scenario: Sous-commande sans nouveau démarrage
- **WHEN** `run`, `test`, `update` ou `stop` est exécutée sans nouveau démarrage
- **THEN** elle ne déclenche aucune purge de début de session

### Requirement: Arrêt contrôlé avant purge

L'orchestrateur SHALL prouver propriété et inactivité du contexte, sans session
occupée, mandat en cours ni permission non résolue. Un RUN actif SHALL
interdire la purge. Il SHALL arrêter les ressources CAB, déconnecter le
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
corrélée et exécution unique de true.
Aucune ancienne preuve SHALL valider ce prévol.

#### Scenario: Nouvelle session vérifiée
- **WHEN** la purge réussit et la nouvelle session passe sa readiness et son test CAB
- **THEN** seuls ces résultats neufs autorisent le premier mandat

### Requirement: Prévention des outils natifs en lecture seule
Le protocole distribué MUST demander à l'orchestrateur de interdire explicitement les actions natives shell, edit (y compris write), subagent et skill par les permissions V2 de la seule session ciblée, relues avant génération pour tout mandat d'inventaire ou d'analyse en lecture seule. Les outils de lecture et recherche autorisés MAY rester disponibles. 

#### Scenario: Inventaire protégé
- **WHEN** un inventaire lecture seule est transmis par l'API de messagerie OpenCode
- **THEN** ses outils natifs et d'écriture sont désactivés explicitement et aucun mandat exécutable implicite n'est accordé

### Requirement: Réactivation limitée des outils exécutables
La restriction lecture seule MUST NOT modifier la configuration persistante OpenCode ni produire une approbation générale. La réactivation MUST limiter les outils au mandat unitaire, rétablir ask sans génération par PATCH V2 de la seule session ciblée et le vérifier par lecture native avant génération. Le prompt V2 MUST NOT réécrire les permissions ni transmettre tools ou noReply. Une preuve absente ou divergente MUST suspendre le mandat.

#### Scenario: Mandat exécutable suivant
- **WHEN** l'orchestrateur passe d'un inventaire à une opération native
- **THEN** seuls les outils nécessaires sont réactivés sans génération, ask est rétabli et vérifié, puis l'opération exige sa propre décision CAB

#### Scenario: Réactivation permissive détectée
- **WHEN** une activation produit une règle allow ou qu'un contrôle natif échoue
- **THEN** aucun mandat exécutable n'est généré tant que ask n'est pas prouvé

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

### Requirement: Prévol divergent dans la même session
Après un prévol divergent ou incomplet refusé sans effet, l'orchestrateur MUST conserver session candidate, job, RUN et runtime. Il MUST NOT renouveler la session, abandonner le job ni purger pour cet incident. Le mandat erroné MUST rester refusé sans normalisation.

#### Scenario: Champ ou commande divergent
- **WHEN** un champ prescrit manque ou diverge et le prévol est refusé avant exécution sans effet
- **THEN** l'orchestrateur réconcilie puis demande retry dans la même candidate avec identifiants de requête et approbation neufs

#### Scenario: Délai MCP seul
- **WHEN** seule la réponse MCP manque sans divergence prouvée
- **THEN** l'orchestrateur interroge le même approval_id sans nouvelle demande ni retry

### Requirement: Prévol corrigé avant reprise métier
Après retry explicite, l'orchestrateur MUST exiger /usr/bin/true exact, change attendu, décision explicite corrélée, permission native unique, exit 0 puis broker_readiness READY sans demande ni permission parasite. Il MUST conserver le gel jusqu'à complete prouvé.

#### Scenario: Échec répété sans effet
- **WHEN** le prévol diverge de nouveau et les préconditions de retry sont rétablies
- **THEN** une nouvelle tentative explicite reste dans la même candidate et le même job, sans concurrence ni rejeu d'écriture

#### Scenario: Preuve ou effet incertain
- **WHEN** une preuve manque ou un effet reste inconnu
- **THEN** l'orchestrateur suspend les opérations et demande l'autorité indispensable sans purge ni renouvellement

### Requirement: Connexion MCP et création du RUN CAB

Avant de créer une session, `/CAB start` SHALL lire `/api/mcp` avec authentification V2 et exiger `cgpt-validation: connected` dans la location cible. À une frontière de maintenance autorisée, il MAY reconnecter le MCP ciblé par les seules routes V2 documentées, puis SHALL relire son état. Il MUST NOT utiliser une route V1, `/instance/dispose`, ni gérer directement le processus broker.

#### Scenario: Connexion MCP et création du RUN CAB
- **WHEN** la purge du nouveau RUN est terminée mais cgpt-validation n'est pas connecté
- **THEN** aucune session de codage n'est créée avant un état MCP sain et CAB ne lance ni n'arrête directement le broker

#### Scenario: Création après raccordement sain
- **WHEN** l'initialisation globale exclusive ou la jonction sans purge est réconciliée et MCP est sain
- **THEN** `/CAB start` SHALL créer une nouvelle session maîtresse OpenCode persistante

### Requirement: Messagerie et reprise du même RUN CAB

`/CAB start` MAY réutiliser la session seulement pour la reprise du même RUN, sans purge. `/CAB start` SHALL transmettre les mandats via `POST /api/session/{sessionID}/prompt` V2 dans la location persistante, préserver le texte, la corrélation de mandat, les permissions natives et le mode de livraison sans reprise implicite.

#### Scenario: Messagerie et reprise du même RUN CAB
- **WHEN** CAB reprend le même RUN avec sa session persistante
- **THEN** il conserve cette session sans purge et transmet les mandats par sa messagerie native

### Requirement: Prévol de l'identité du modèle OpenCode

Après la preuve MCP et avant de créer cette session persistante, `/CAB start` SHALL
vérifier le fournisseur, le modèle et le niveau de raisonnement effectivement configurés
pour l'agent de codage ciblé. `/CAB start` SHALL vérifier leur disponibilité via l'API
OpenCode, soumettre une requête temporaire sans outil ni accès au projet et contrôler
les métadonnées réellement observées.

#### Scenario: Prévol de l'identité du modèle OpenCode
- **WHEN** le MCP est connecté avant la création de la session persistante
- **THEN** le prévol sans outil ni accès au projet contrôle fournisseur, modèle, raisonnement, disponibilité et métadonnées observées

### Requirement: Refus d'un prévol modèle non conforme

Si une valeur est absente, indisponible ou divergente, `/CAB start` SHALL publier
`CAB_INACTIF` avec la cause et ne créer aucune session persistante. `/CAB start` SHALL
ne jamais modifier la configuration choisie par le développeur.

#### Scenario: Refus d'un prévol modèle non conforme
- **WHEN** une valeur de modèle attendue est absente ou divergente
- **THEN** CAB publie CAB_INACTIF avec sa cause, ne crée pas de session persistante et ne modifie pas la configuration choisie

### Requirement: Source locale ou Git de la marketplace CAB
La source publiée par défaut MUST rester le dépôt Git CAB sur `main`, sparse
`.agents/plugins` et `plugins`. Si une mise à jour locale explicitement demandée
utilise un paquet plus récent que GitHub, `/CAB update` MUST l'installer avec
le gestionnaire Codex et conserver sa marketplace locale. Il MUST NOT revenir à
une publication plus ancienne ; les caches de plugin MUST NOT être édités à la main.

#### Scenario: Migration locale vers GitHub
- **WHEN** la version publiée est au moins celle du paquet local et une
  marketplace locale homonyme est configurée
- **THEN** `/CAB update` remplace la source par GitHub, branche `main`, et
  restaure la racine locale mémorisée si l'ajout Git échoue

#### Scenario: Paquet local plus récent que GitHub
- **WHEN** une mise à jour locale est explicitement demandée et GitHub publie
  une version antérieure au paquet source
- **THEN** le plugin est installé par le gestionnaire Codex depuis la source
  locale, la marketplace locale est conservée et les caches ne sont pas édités
  manuellement

### Requirement: Actualisation conditionnelle du plugin CAB
/CAB update SHALL actualiser la marketplace GitHub, comparer le manifeste du plugin CAB à la version installée et appeler codex plugin add CAB@cab_codex_plugins si le plugin CAB est absent ou si le manifeste distant est strictement plus récent. La commande SHALL refuser une version absente ou invalide et vérifier la version et l'identité après installation. Les noms CABU et CAB MUST rester sensibles à la casse.

#### Scenario: Actualisation conditionnelle du plugin CAB
- **WHEN** le manifeste distant est strictement plus récent ou l'ancien identifiant est encore installé
- **THEN** la commande installe CAB puis vérifie son identité et sa version

### Requirement: Source et remplacement atomique de la commande de profil CAB

`/CAB update` SHALL télécharger `.codex/commands/{CAB,CABU,cab}.md` depuis
`https://github.com/AzenorPixs/cab-codex-plugins`, branche `main`. Elle SHALL
valider les trois frontmatters SemVer identiques et préserver les copies locales
plus récentes ou divergentes à version égale. Les remplacements SHALL être
atomiques et limités à une version distante plus récente. Les alias absents
MAY être complétés à version égale si les copies présentes concordent.

#### Scenario: Source et remplacement atomique de la commande de profil CAB
- **WHEN** la commande GitHub possède une version valide strictement plus récente que la copie de profil
- **THEN** la copie est remplacée atomiquement après validation de sa source et de son frontmatter

### Requirement: Préservation des ressources pendant la mise à jour CAB
Les préparations réseau ou paquet échouées MUST préserver les fichiers et
services. `/CAB update` MUST arrêter les trois unités, remplacer les quatre
briques et redémarrer les unités sans lire l'état CAB comme précondition.
L'absence d'OpenCode MUST NOT bloquer l'installation du broker. Les sources des
projets pilotés MUST rester inchangées.

#### Scenario: Préservation des ressources pendant la mise à jour CAB
- **WHEN** la préparation du paquet ou du jeu de commandes échoue
- **THEN** les fichiers et unités restent inchangés et l'échec est rapporté

#### Scenario: Jeu déjà installé
- **WHEN** le paquet validé est identique aux fichiers déployés
- **THEN** les trois unités sont tout de même arrêtées puis redémarrées et le
  rapport distingue les versions installées et actives

### Requirement: Déploiement du superviseur sans démarrage
`/CAB update` MUST installer le jeu complet des quatre briques, arrêter les
trois unités systemd CAB, recharger systemd, puis démarrer les trois unités,
quels que soient leurs états initiaux. La commande MUST NOT activer les unités
au login.

#### Scenario: Déploiement du superviseur sans démarrage
- **WHEN** le superviseur initialement inactif est absent ou divergent
- **THEN** la commande le déploie depuis le plugin et démarre les trois unités
  sans activation au login

#### Scenario: Superviseur actif actualisé
- **WHEN** le superviseur fonctionne avec un ancien jeu
- **THEN** les trois unités sont arrêtées puis redémarrées sur le jeu vérifié

### Requirement: Résumé des versions réellement observées
`/CAB update` MUST rapporter séparément les versions GitHub, plugin, fichiers et
processus des briques CAB. Si OpenCode est absent, la version broker runtime MUST
être `INDISPONIBLE` tandis que sa version de fichier est affichée. Une version
inconnue MUST NOT être déduite d'un paquet.

#### Scenario: Résumé des versions réellement observées
- **WHEN** une mise à jour CAB termine avec une version du broker actif inaccessible
- **THEN** le résumé distingue GitHub, les fichiers broker et sa version runtime
  `INDISPONIBLE`, puis conclut sur les versions vérifiées des autres services

### Requirement: Distribution concurrente 1.0.0
Les garanties d'identité et d'isolation introduites en 1.0.0 MUST être conservées dans les briques 1.10.5 ; les exclusions MUST suivre le nouveau contrat de ressources. Les prompts pilotés des projets concernés MUST rester cohérents lors de leur déploiement autorisé, quel que soit le nombre de projets. CISM, CAISM et prompts directs MUST rester inchangés. La préparation source MUST NOT modifier consommateurs ou services actifs.

#### Scenario: Isolation concurrente
- **WHEN** la distribution source est contrôlée
- **THEN** versions et contrats sont cohérents sans activation ni déploiement des services

### Requirement: Distribution cohérente du correctif 1.0.1
La garde native introduite en 1.0.1 MUST être conservée par les briques 1.10.5. Le plugin MUST porter un cachebuster neuf. Le transport MCP MUST rester compatible ; les formats persistés MUST suivre leurs contrats de migration explicites. La préparation source MUST NOT modifier services actifs, caches installés ou RUN.

#### Scenario: Jeu source vérifié
- **WHEN** les contrôles de distribution réussissent
- **THEN** les versions exécutables sont cohérentes sans annoncer un déploiement actif

### Requirement: Distribution du correctif de polling 1.0.2
Les briques CAB MUST annoncer 1.10.5 et conserver le correctif de polling 1.0.2. Le plugin MUST porter un cachebuster neuf. Skill, commande et protocoles pilotés MUST distinguer timeout et refus terminal corrélé. Les formats MUST suivre leurs contrats de migration et la préparation source MUST NOT modifier services, caches ou RUN actifs.

#### Scenario: Correctif source cohérent
- **WHEN** la distribution et les protocoles sources sont vérifiés
- **THEN** versions et refus après timeout sont cohérents sans annonce de déploiement actif

#### Scenario: Autorité d'arrêt préservée
- **WHEN** le développeur demande explicitement un arrêt ciblé pendant une récupération gelée
- **THEN** gate, réconciliation et preuves restent exigés sans fermeture des services partagés des autres RUN

### Requirement: Rapport synthétique status en lecture seule
/CAB status MUST produire un rapport français horodaté de tous les RUN identifiés dans le contexte suivi. /CAB status --run <run_id> MUST filtrer ce RUN exact sans lui envoyer de message. La commande MUST afficher les colonnes RUN / Nom du change, Actions réalisées, Actions en cours et Actions restant à réaliser, puis terminer sa réponse hors boucle de pilotage. Elle MUST NOT déclencher écriture, permission, session, démarrage, arrêt, reconnexion, sondage périodique ou remédiation.

#### Scenario: Consultation multi-RUN
- **WHEN** status identifie trois RUN dans le contexte suivi
- **THEN** il affiche une ligne synthétique par RUN, avec change et trois catégories d'actions, sans modifier projets ou services

#### Scenario: RUN exact inconnu
- **WHEN** --run désigne un RUN absent des sources consultables
- **THEN** le rapport indique ce RUN comme introuvable dans le périmètre consulté sans sélectionner un voisin ni initialiser un job

### Requirement: Sources actuelles et identités corrélées du rapport
Le rapport MUST recouper les vues publiques GET CAB, états natifs accessibles Codex/OpenCode, checkpoint par RUN et tâches OpenSpec ciblées. Il MUST vérifier RUN, change, session, projet et horodatages avant association. Les lectures MUST rester limitées aux sources autorisées nécessaires, sans secrets ni objet checkpoint complet exporté.

#### Scenario: Ancienne attente après reprise
- **WHEN** le checkpoint conserve une attente mais une preuve actuelle corrélée établit sa fin et la reprise
- **THEN** la synthèse utilise la reprise prouvée et ne déclare plus cette ancienne attente

### Requirement: Incertitude explicite du statut
Toute information indisponible, ancienne ou contradictoire MUST être signalée. Une contradiction non réconciliée ou une absence d’observation actuelle exploitable MUST produire INDÉTERMINÉ pour le statut concerné, sans déduire une activité d’un ancien checkpoint.

#### Scenario: Source actuelle indisponible
- **WHEN** aucune observation actuelle exploitable ne permet d'établir activité ou attente
- **THEN** le rapport affiche INDÉTERMINÉ, les indisponibilités et la date de la dernière information disponible

### Requirement: Activité et attente entre RUN distinguées
Chaque ligne MUST afficher ACTIF, EN ATTENTE DE RUN avec identifiant du pair et cause, EN ATTENTE avec cause interne, BLOQUÉ, ARRÊTÉ, TERMINÉ ou INDÉTERMINÉ selon les preuves. L'activité d'orchestration Codex MUST être distinguée de l'exécution native OpenCode. RESERVED, READY, processus vivant ou IMPLÉMENTATION seuls MUST NOT établir ACTIF ; OpenCode idle seul MUST NOT établir une attente de pair.

#### Scenario: Orchestrateur actif et codeur idle
- **WHEN** Codex travaille sur une revue corrélée sans suspension actuelle alors que le codeur est idle
- **THEN** la ligne indique ACTIF pour l'orchestration sans prétendre à une exécution native

### Requirement: Attente actuelle corrélée au pair
Une attente de pair MUST exiger une dépendance, exclusion, place FIFO ou ressource actuellement bloquante corrélée à ce pair. Une exclusion actuelle MUST rester visible même si l'orchestrateur continue des lectures. Une attente interne MUST conserver sa cause sans inventer un pair.

#### Scenario: Exclusion d'un pair
- **WHEN** le registre actuel suspend A sous l'exclusion possédée par B
- **THEN** A est indiqué EN ATTENTE DE RUN B avec sa cause, même si son chat Codex est actif

#### Scenario: Attente interne sans pair
- **WHEN** le RUN attend un prévol modèle ou une décision humaine sans dépendance actuelle à un pair
- **THEN** le rapport conserve cette cause interne sans inventer un RUN responsable

### Requirement: Actions et clôture étayées dans le rapport
Les actions réalisées MUST être associées aux preuves disponibles ; les coches seules MUST NOT prouver l'exécution actuelle des tests. Les actions en cours MUST refléter le dernier travail corrélé ; les restantes MUST couvrir les obligations non prouvées du cycle. Le rapport MUST NOT inventer pourcentage, succès de test, livraison, cause ou dépendance.

#### Scenario: Tâches cochées sans preuve native
- **WHEN** une tâche annonce un test réussi sans résultat disponible
- **THEN** le rapport indique une réalisation déclarée dont la preuve reste indisponible

### Requirement: Clôture du change distincte de celle du parent
Une archive seule MUST NOT prouver la clôture complète. Le rapport MUST distinguer publication, statistiques, gate individuel et état du parent. Une livraison du sous-job MUST NOT être assimilée à la fin du projet.

#### Scenario: Archive sans statistiques
- **WHEN** une archive existe mais statistiques et clôture ne sont pas prouvées
- **THEN** ces opérations restent à réaliser sans livraison complète annoncée

#### Scenario: Sous-job livré et parent incomplet
- **WHEN** le change possède publication, statistiques et gate prouvés mais le parent reste en sélection
- **THEN** le rapport distingue livraison du change et poursuite du parent sans déclarer le projet achevé

### Requirement: Commandes simples de consultation statistique
La commande distribuée CAB MUST proposer /CAB stats pour les changes courants, /CAB statslast pour la dernière livraison observée, /CAB stats 24 pour les dernières 24 heures, /CAB stats7 pour les derniers 7 jours et /CAB stats30 pour les derniers 30 jours. Les commandes MUST être ponctuelles, en français et en lecture seule, sans action de cycle de vie.

#### Scenario: Cinq consultations
- **WHEN** l'utilisateur demande l'une des cinq commandes
- **THEN** CAB consulte la sélection correspondante et restitue bornes, identités, couverture, sources et métriques disponibles avec N/A explicites

#### Scenario: Plusieurs RUN actifs
- **WHEN** /CAB stats est demandé sans cible dans un projet concurrent
- **THEN** chaque change courant est présenté avec son RUN et son contexte sans fusion ni question de sélection obligatoire ; un RUN explicitement ciblé reste isolé

### Requirement: Distribution des observations CAB
Les modules distribués, broker, contrôleur, superviseur, manifeste, unités et commande MUST annoncer la version de base 1.10.5. Le module de fenêtres et l'importeur MUST être distribués avec leurs contrats et tests, sans nouvelle dépendance tierce ni installation automatique.

#### Scenario: Jeu source complet
- **WHEN** le jeu CAB 1.10.5 est qualifié
- **THEN** ses versions sont cohérentes et les tests couvrent import, fenêtres, commandes et absence d'effet métier sans modifier une installation active

### Requirement: Alignement des briques distribuées
La release MUST aligner à 1.10.5 broker, routeur, journal, contrôleur, contextes, registre, superviseur, SSE, healthcheck, collecteurs, outils de purge/prompts, commande et manifeste. Les supports sans version propre MUST être rattachés à cette release sans format artificiel. Les capacités statistiques livrées avant elle MUST être préservées.

#### Scenario: Contrôle du paquet complet
- **WHEN** la release 1.10.5 est qualifiée
- **THEN** l'inventaire des composants, imports, références et versions ne présente aucun mélange de jeux exécutables

### Requirement: Capacité de coordination négociée
Avant mandat mutable, les composants et clients MUST confirmer resource-scoped-v1 et les champs d'opération requis. Un jeu mixte, un ancien client ou une acquisition historique incompatible MUST être refusé sans effet avec diagnostic de migration. Les consultations historiques compatibles MUST rester disponibles.

#### Scenario: Ancien broker
- **WHEN** le broker ne garantit pas le transport des champs d'opération
- **THEN** le contrôleur refuse toute nouvelle permission mutable

#### Scenario: Ancien contrôleur
- **WHEN** un broker 1.10.5 notifie un RUN à un ancien contrôleur
- **THEN** la route dédiée est indisponible, la demande reste non approuvée et l'ancien chemin de notification n'est pas utilisé pour ce RUN

#### Scenario: Ancienne intégration globale
- **WHEN** un client demande l'ancienne barrière ordinaire dans le profil 1.10.5
- **THEN** CAB refuse sans geler les pairs et indique le contrat de remplacement

### Requirement: Migration sous maintenance explicite
Le déploiement et la conversion des formats MUST exiger une maintenance autorisée, quiescence réelle, sauvegarde privée et contrôle du jeu complet. RUN, jobs, preuves, candidates, réservations et permissions consommées MUST être préservés. Le retour arrière MUST refuser toute perte d'effets récents ou lecture d'un format inconnu.

#### Scenario: Maintenance avec RUN conservés
- **WHEN** le jeu 1.10.5 est déployé après drainage et sauvegarde
- **THEN** les RUN restent identifiables et reprennent seulement après réconciliation et prévol vérifiés sans rejeu des écritures

#### Scenario: Prévol avant reprise métier
- **WHEN** la maintenance est levée pour tester un RUN migré tandis que les pairs restent en pause
- **THEN** seul /usr/bin/true en lecture est admissible avant once acquittée, exit 0 et libération prouvés ; une écriture métier reste refusée

### Requirement: Commandes et protocoles ciblés
Commande, skills, références et générateur MUST appliquer les protections ciblées et les quatre causes de gel exceptionnel. Pause/arrêt MUST distinguer RUN explicite et cible --all. Les consultations MUST rester en lecture seule. La propagation des prompts consommateurs MUST être distinctement autorisée et vérifiée par inventaire et empreintes.

#### Scenario: Arrêt d'un RUN
- **WHEN** /CAB stop --run A est demandé dans un contexte multi-RUN
- **THEN** le protocole ne transforme pas cette demande en arrêt global de B

#### Scenario: Préparation source
- **WHEN** les protocoles 1.10.5 sont préparés dans CAB
- **THEN** aucun prompt consommateur ni cache installé n'est modifié sans autorisation de déploiement

### Requirement: Distribution indépendante du moniteur web
Le plugin MUST distribuer CAB Monitor, ses ressources locales, son unité utilisateur et sa référence de service. /CAB start MUST installer et démarrer explicitement cette unité, sans activation au login. La préparation source MUST NOT modifier un service actif. Le moniteur MUST rester indépendant du cycle de vie du contrôleur et du superviseur ; le lancement manuel MUST rester documenté.

#### Scenario: Installation différée
- **WHEN** les sources sont préparées sans invocation de /CAB start
- **THEN** aucun service ou profil actif n'est modifié

#### Scenario: Démarrage demandé
- **WHEN** /CAB start a résolu le workspace, avant PLLM et tout contrôle OpenCode ou prévol modèle/MCP
- **THEN** il prépare le moniteur, recharge systemd et appelle explicitement systemctl --user start cgpt-approval-bridge-monitor.service avant toute dépendance amont, même si les services CAB sont réutilisés

### Requirement: Distribution du catalogue de cycle
Le plugin MUST distribuer le catalogue partagé avec contexte de job et moniteur. Le protocole et le skill MUST documenter les déclarations explicites, retours et états non applicables. Toutes les briques MUST partager la version 1.10.5 ; cette livraison MUST NOT modifier les services ou profils actifs.

#### Scenario: Jeu source complet
- **WHEN** la préparation source est qualifiée
- **THEN** le catalogue importé, les références distribuées et les tests sont présents avec la même version de base 1.10.5

### Requirement: Réutilisation et vérification du monitoring
/CAB start et toute entrée ou reprise de session pilotée MUST vérifier unité active, page HTTP locale, version et identity.workspace conformes, puis afficher l'URL réelle. Une instance conforme MUST être réutilisée sans redémarrage ni modification de configuration. Une instance active divergente MUST être signalée sans remplacement ni réaffectation implicite. Un port occupé MUST NOT conduire à tuer son propriétaire.

#### Scenario: Service déjà conforme
- **WHEN** l'instance active annonce le workspace attendu et la version 1.10.5
- **THEN** /CAB start la réutilise et affiche son URL sans redémarrage

### Requirement: Conservation du moniteur indépendant
L'unité du moniteur MUST NOT dépendre des unités CAB de contrôle ou de supervision. /CAB stop et la réinitialisation CAB MUST préserver le moniteur, sa configuration, ses sources et ses connexions propres. Une panne de monitoring MUST être signalée séparément et MUST NOT déclencher un arrêt ou redémarrage d'une autre brique.

#### Scenario: Arrêt du contrôleur
- **WHEN** /CAB stop arrête le contrôleur et le superviseur
- **THEN** le moniteur reste disponible pour afficher leur indisponibilité

### Requirement: Jeu installé du moniteur complet
Le déploiement du moniteur MUST conserver scripts/ et web-monitor/ comme dossiers frères, avec la fermeture de ses imports et ressources statiques. Les fichiers de configuration MUST rester non secrets et privés. Une configuration existante MUST être préservée sauf actualisation explicitement validée ; aucun fichier env brut MUST être exposé.

#### Scenario: Paquet isolé
- **WHEN** le moniteur est lancé depuis son seul jeu installé sans composants amont
- **THEN** la page et l'identité HTTP restent accessibles sans import depuis le dépôt source

### Requirement: Bootstrap du monitoring avant les dépendances amont
Après résolution du workspace canonique, /CAB start, le skill et le protocole de session pilotée MUST appliquer monitor-service avant PLLM, santé OpenCode et prévols modèle/MCP. Ce contrôle MUST couvrir nouvelle entrée, reprise et réutilisation des services. Il MUST terminer une tentative bornée et rapporter son résultat avant de poursuivre. La préparation source MUST NOT exécuter ce bootstrap sur un profil réel.

#### Scenario: Prévol indisponible
- **WHEN** PLLM ou un prévol amont échoue après la résolution du workspace
- **THEN** la tentative de démarrage ou de vérification du moniteur a déjà eu lieu et son service reste indépendant

#### Scenario: Services CAB réutilisés
- **WHEN** une session pilotée entre ou reprend avec contrôleur et superviseur déjà actifs mais sans moniteur
- **THEN** elle applique la procédure de déploiement et démarrage du moniteur dans le périmètre autorisé avant les prévols, sans redémarrer les autres services

#### Scenario: Instance conforme en reprise
- **WHEN** le moniteur actif annonce version et workspace attendus
- **THEN** la procédure vérifie page et unité, réutilise l'instance intacte et rapporte son URL réelle

#### Scenario: Échec du monitoring
- **WHEN** l'installation, le démarrage ou les preuves HTTP échouent
- **THEN** la procédure rapporte la cause et l'URL attendue séparément du statut CAB, sans annoncer le moniteur disponible ni agir sur les autres briques ou RUN

### Requirement: Distribution cohérente de la récupération 1.9.0
Le jeu CAB MUST annoncer 1.10.5 avec cachebuster neuf, fermeture d'imports et preuves de qualification. Il MUST distribuer maintenance-proof et le profil frozen-recovery-controller, préserver le rejet seul de notification et distinguer source, code chargé et runtime vivant. Cette préparation MUST NOT installer ou activer les correctifs sur les RUN réels.

#### Scenario: Ancien contrôleur conservé
- **WHEN** la préparation source 1.10.5 est terminée
- **THEN** l'ancien contrôleur peut rester chargé et la réparation de la récupération ciblée demeure soumise à sa maintenance explicitement autorisée

### Requirement: Distribution cohérente 1.10.0
La préparation source MUST aligner sur 1.10.5 les briques CAB, métadonnées, copies broker, commande et références courantes. Elle MUST distribuer les contrats et tests des réservations Docker/LXC et du rafraîchissement réglable. Le contrôleur MUST exposer la capacité test-resources-v1. Un ancien lecteur MUST refuser le nouvel état de réservations plutôt que perdre une protection ; aucun déploiement ni migration runtime MUST être déduit de cette préparation.

#### Scenario: Paquet qualifié
- **WHEN** le jeu source 1.10.5 est vérifié
- **THEN** ses versions et copies sont cohérentes, les tests couvrent les nouvelles gardes et aucune installation active n'est modifiée

### Requirement: Distribution du correctif 1.10.2
La préparation MUST aligner les briques, métadonnées et références courantes sur 1.10.5. La liste fermée des brokers chargés qualifiés MUST conserver 1.10.0 lors de cet incrément. Une installation locale explicitement demandée MUST conserver la provenance, les sauvegardes et les anciennes releases, sans édition manuelle du cache ni changement Git implicite. Le bilan MUST séparer source, plugin installé et versions actives.

#### Scenario: Mise à jour locale et publication antérieure
- **WHEN** le jeu local qualifié est 1.10.5 et la publication distante reste 1.10.0
- **THEN** l'installation locale autorisée reste identifiable et aucun retour automatique au paquet antérieur n'est présenté comme une mise à jour

### Requirement: Préparation de modèle sans effet distribuée
Le paquet 1.10.5 MUST inclure l'outil de préparation du catalogue et ses contrats. L'outil MUST restituer uniquement le chemin public, sa provenance et le patch nécessaire, sans écrire de configuration ni démarrer de service. La commande de démarrage MUST utiliser ce patch dans le périmètre explicitement autorisé et contrôler la résolution du modèle avant armement.

#### Scenario: Préparation du paquet
- **WHEN** le paquet source est qualifié
- **THEN** l'outil, les tests et les instructions après publication sont présents sans installation ni activation implicite

### Requirement: Référentiel partagé du protocole réconcilié
Le protocole commun MUST être corrigé dans son référentiel template avant synchronisation de la copie CAB. Il MUST préserver les règles génériques et documenter le bootstrap du Monitor, les étapes du RUN et le contrat resource-scoped-v1 courant. Les tests MUST vérifier ces contrats sans restaurer l'ancienne barrière globale d'intégration.

#### Scenario: Distribution cohérente après correction du référentiel
- **WHEN** la copie CAB est synchronisée depuis le référentiel corrigé
- **THEN** leurs contenus sont identiques et les références de monitoring, cycle et coordination correspondent au plugin courant, sans propagation vers d'autres consommateurs

### Requirement: Politique PLLM documentaire sans réessai implicite
Commande et skill CAB MUST préserver les règles du protocole commun : fraîcheur initiale de huit heures, choix conservé pendant la session et réévaluation sur panne réelle ou instruction explicite. Sans PLLM admissible, ils MUST attendre une instruction sans benchmark automatique. Les sondes statistiques MUST rester distinctes et une sonde échouée seule MUST NOT suspendre le RUN.

#### Scenario: Aucun modèle admissible
- **WHEN** une évaluation requise ne fournit aucune politique admissible
- **THEN** la session conserve ses preuves et attend l'instruction humaine sans réessai automatique périodique

#### Scenario: Rapport ancien pendant une session
- **WHEN** le rapport initialement admissible dépasse huit heures pendant la même session
- **THEN** son âge seul ne provoque ni nouveau benchmark ni bascule du choix du RUN

### Requirement: Contrôle documentaire croisé des règles PLLM

Le contrôle documentaire MUST comparer les exigences courantes de persistent-job-supervision, codex-integration-distribution et archive-session-statistics aux supports CAB. Il MUST refuser toute prescription de réessai périodique sans PLLM admissible, toute restauration d'une échéance automatique et tout renvoi aux tentatives illimitées. Les archives historiques MUST rester hors de ce contrôle courant.

#### Scenario: Ancienne règle résiduelle dans une référence

- **WHEN** une référence courante prescrit encore un réessai PLLM périodique, une échéance automatique ou des tentatives illimitées
- **THEN** le contrôle documentaire échoue même si les supports distribués sont cohérents entre eux

#### Scenario: Références courantes réconciliées

- **WHEN** les références et supports conservent le choix, l'attente humaine, les échéances historiques sans effet et l'indépendance des sondes
- **THEN** le contrôle documentaire réussit sans modifier ni contrôler les archives comme exigences courantes

### Requirement: Commandes CAB canoniques et alias compatibles
`/CAB` MUST être défini dans `.codex/commands/CAB.md`. `cab.md` MUST transmettre
les arguments inchangés ; `CABU.md` MUST charger le fichier frère de même version,
refuser les arguments et exécuter `/CAB update` jusqu'au rapport terminal. CABU
ne duplique pas la procédure ; une dépendance absente ou divergente MUST bloquer.
La préparation source MUST NOT invoquer les services actifs.

#### Scenario: Mise à jour par raccourci
- **WHEN** `/CABU` est invoqué sans argument avec CAB.md et le plugin de même
  version
- **THEN** CABU charge CAB.md, lequel applique la procédure du skill embarqué,
  et déclenche le même processus d'update sans logique dupliquée

#### Scenario: Alias de compatibilité
- **WHEN** `/cab status --run A` est invoqué
- **THEN** CAB reçoit exactement `status --run A` et produit la consultation ponctuelle

#### Scenario: Arguments ou dépendance invalides
- **WHEN** CABU reçoit un argument ou CAB.md manque ou possède une version divergente
- **THEN** l'alias signale l'erreur et termine avant toute opération réseau ou de maintenance

#### Scenario: Dépendance skill absente ou divergente
- **WHEN** le skill, sa référence de maintenance, ou CAB.md ne correspond pas
  au manifeste installé
- **THEN** l'update s'arrête avant maintenance et indique la dépendance
  manquante ou divergente

### Requirement: Jeu de commandes de profil complet

`/CAB update` MUST préparer CAB.md, CABU.md et cab.md depuis la source GitHub
validée, branche main, sous `.codex/commands/`, avec versions SemVer identiques.
Un échec de préparation MUST préserver les copies locales. La publication MUST
sauvegarder les commandes remplacées et les restaurer si elle échoue.
Une copie locale plus récente ou divergente à version égale MUST être préservée.
Les alias absents MAY être complétés à version égale si les copies présentes concordent.

#### Scenario: Jeu distant incohérent
- **WHEN** un des trois fichiers manque ou porte une version divergente
- **THEN** aucune commande locale n'est remplacée et le bilan indique l'échec

#### Scenario: Installation héritée complète après mise à jour
- **WHEN** seule cab.md existe localement et le jeu distant validé est plus récent
- **THEN** CAB.md porte la procédure et CABU.md et cab.md référencent son fichier frère

#### Scenario: Alias manquant à version égale
- **WHEN** les fichiers locaux présents correspondent au jeu distant de même version et un alias manque
- **THEN** seul le fichier absent est installé après préparation complète

#### Scenario: Échec pendant publication
- **WHEN** la publication d'une des commandes échoue
- **THEN** les seules commandes remplacées sont restaurées, les seuls nouveaux fichiers de cette tentative sont retirés et l'échec est signalé sans succès global

### Requirement: Distribution source CAB 1.10.6
La préparation source MUST aligner le jeu CAB distribué sur la version 1.10.6
dans les métadonnées, modules, broker, scripts, services, commande, skill et
supports décrivant le profil courant. Elle MUST NOT modifier les installations,
services, caches ou RUN actifs. Les références qualifiées antérieures MUST
rester exactes.

#### Scenario: Jeu source aligné
- **WHEN** le jeu 1.10.6 est qualifié
- **THEN** chaque composant versionné annonce 1.10.6 et les références à 1.10.5 ne désignent que des historiques ou versions chargées compatibles

### Requirement: Plugin CABU et skill d'entrée
La marketplace CAB SHALL distribuer un plugin autonome `CABU`. Celui-ci SHALL exposer un skill directement invocable qui déclenche la procédure canonique `/CAB update` sans dupliquer cette procédure.

#### Scenario: Invocation directe du skill CABU
- **WHEN** le skill `CABU` est installé et invoqué
- **THEN** il exécute `/CAB update` dans la conversation courante et restitue son rapport terminal

#### Scenario: Procédure canonique indisponible
- **WHEN** le skill `CABU` est invoqué sans commande CAB compatible disponible
- **THEN** il signale la dépendance absente et n'entame aucune opération de maintenance

### Requirement: Distribution cohérente du plugin et de la commande CABU
La commande `/CABU` SHALL rester distribuée séparément du plugin dans `.codex/commands/CABU.md`, sans argument et avec la même base de version que le plugin CABU et le plugin CAB. Elle SHALL déléguer à `/CAB update` sans dupliquer sa procédure.

#### Scenario: Plugin et commande distribués à la même version
- **WHEN** une release CAB est préparée
- **THEN** la marketplace, le manifeste du plugin CABU, le skill CABU, le plugin CAB et la commande `/CABU` annoncent la base de version commune

#### Scenario: Invocation de la commande CABU
- **WHEN** `/CABU` est invoquée sans argument
- **THEN** elle délègue à la procédure `/CAB update` et produit le même rapport terminal

#### Scenario: Arguments CABU refusés avant maintenance
- **WHEN** `/CABU` est invoquée avec un argument
- **THEN** elle affiche sa syntaxe et termine avant toute opération réseau ou de maintenance

### Requirement: Configuration MCP OpenCode V2
Le broker CAB MUST être déclaré comme serveur MCP local `stdio` sous `mcp.servers.cgpt-validation`. La forme V1 plaçant le serveur directement sous `mcp` MUST NOT être utilisée ni réparée automatiquement.

#### Scenario: Configuration compatible
- **WHEN** la configuration OpenCode V2 est inspectée
- **THEN** `cgpt-validation` est sous `mcp.servers` avec `type: "local"` et utilise stdio

#### Scenario: Configuration V1 résiduelle
- **WHEN** le serveur est déclaré directement sous `mcp`
- **THEN** CAB signale la configuration incompatible sans la réécrire ni démarrer le broker

### Requirement: Identités CAB et CABU en majuscules
La marketplace MUST identifier les plugins par CAB et CABU. Leurs skills principaux MUST être nommés CAB et CABU et invocables comme $CAB et $CABU. Les commandes canoniques MUST rester /CAB et /CABU. Le nom affiché de la marketplace MUST être CAB Codex Plugins. Les chemins techniques et l'alias /cab MUST rester compatibles. Le skill auxiliaire coding-session-statistics MUST rester accessible sous le namespace CAB.

#### Scenario: Distribution vérifiée
- **WHEN** un paquet est préparé
- **THEN** les entrées marketplace, manifestes et frontmatters annoncent les identifiants majuscules et les sélecteurs CLI utilisent CAB@cab_codex_plugins et CABU@cab_codex_plugins

#### Scenario: Ancien plugin installé
- **WHEN** une installation utilise encore cab-approval-bridge
- **THEN** le gestionnaire installe et vérifie CAB avant retrait de l'ancienne entrée, sans édition manuelle du cache ni modification des données métier

### Requirement: Distribution du cycle de vie CAB 2.1.9
La distribution source MUST aligner ses composants versionnés sur 2.1.12 et inclure le module de cycle de vie dans les fermetures d’import du contrôleur, superviseur et moniteur. Les unités MUST empêcher le redémarrage automatique après un nettoyage incomplet identifié. La préparation MUST NOT installer, activer ou modifier les RUN réels.

#### Scenario: Paquet source qualifié
- **WHEN** CAB 2.1.9 est préparé
- **THEN** ses versions et imports sont cohérents et aucune activation réelle n’est déduite des tests

### Requirement: Distribution des gardes de mandat et de l’édition native 2.1.10

La distribution source MUST aligner ses composants versionnés sur 2.1.10 et documenter le mécanisme d’édition partielle réellement qualifié, le catalogue natif distinct de search et l’attente de mandat du superviseur. Cette préparation MUST NOT modifier les briques actives ou leur raccord OpenCode. CABU MUST rester une activation distincte coordonnée.

#### Scenario: Sources préparées sans activation
- **WHEN** la qualification et les tests source réussissent
- **THEN** les composants source partagent 2.1.10 et les preuves distinguent source, archivage, publication et activation

### Requirement: Distribution de la récupération native directe 2.1.11

Les composants versionnés CAB MUST partager la base 2.1.11 et documenter la récupération directe strictement qualifiée. Source, archivage, publication, activation et récupération réelle MUST rester distincts. La préparation source MUST NOT modifier les sessions, RUN ou services actifs.

#### Scenario: Sources qualifiées
- **WHEN** les tests et documents source sont validés
- **THEN** les artefacts partagent 2.1.11 et une activation ultérieure reste coordonnée séparément

### Requirement: Distribution des diagnostics avant admission 2.1.12

Les composants versionnés CAB MUST partager la base2.1.12 et documenter le diagnostic de notification et les tentatives HTTP avant admission. Sources, archivage, publication, activation et qualification opérationnelle MUST rester distincts. CABU MUST préserver OpenCode, les RUN et leurs preuves et rapporter les versions réellement chargées avant notification des sessions.

#### Scenario: Distribution et activation vérifiées
- **WHEN** le correctif est qualifié et publié puis sa maintenance coordonnée est exécutée
- **THEN** les quatre briques et commandes cibles sont vérifiées indépendamment des sources et le résultat réel est transmis aux sessions

### Requirement: Distribution de la restitution sans effet 2.1.13
Le jeu source MUST aligner les composants, plugins et commandes sur 2.1.13 et documenter release-unused, ses preuves, son attestation explicite, ses limites et la priorité du nettoyage après mutation. Les tests MUST qualifier les parcours positifs et négatifs isolés, la persistance et la conservation des anciennes gardes. La préparation source MUST NOT modifier les RUN ni activer les briques installées.

#### Scenario: Livraison source et runtime séparés
- **WHEN** les sources 2.1.13 sont qualifiées et archivées
- **THEN** l’activation reste distincte et aucune réservation réelle n’est libérée par la qualification

### Requirement: Compatibilité des reçus sans effet
Les anciens registres sans reçu MUST rester lisibles. Un lecteur ancien ne comprenant pas le reçu enrichi MUST le refuser sans perte de preuve ; une restauration antérieure MUST NOT être utilisée pour effacer ce reçu.

#### Scenario: Retour vers un lecteur ancien
- **WHEN** le registre contient un reçu unused-no-effect inconnu du lecteur
- **THEN** ce lecteur refuse le registre plutôt que d’ignorer la nouvelle preuve

### Requirement: Distribution générique de l’isolation MCP 2.1.14
La distribution MUST aligner les composants et commandes sur 2.1.14, documenter les cibles MCP et le helper de sonde. Les exemples et consignes MUST utiliser des workspaces génériques. La récupération d’un contexte concurrent MUST rester explicite, sous preuves et sans redémarrage OpenCode. Les sources qualifiées MUST précéder l’activation réelle.

#### Scenario: Distribution et activation distinctes
- **WHEN** les sources et tests isolés sont validés et archivés
- **THEN** CABU vérifie séparément les versions actives avant notification aux sessions

### Requirement: Distribution du rétablissement CABU 2.1.15
La distribution MUST aligner ses composants et commandes sur2.1.15 et documenter le budget de démarrage et les phases non terminales de rollback. Les tests MUST couvrir échecs, reprise et invariants métier. L’activation MUST rester séparée de la qualification source et être annoncée seulement après versions actives et readiness vérifiées.

#### Scenario: Reprise après activation échouée
- **WHEN** les sources corrigées sont publiées et CABU est autorisé
- **THEN** la procédure conserve les journaux antérieurs et vérifie l’état effectif avant d’informer les sessions

### Requirement: Distribution des diagnostics de décision2.1.16
La distribution MUST aligner composants et commandes sur2.1.16 et documenter les codes de refus400, decision_recorded et la distinction entre demande et décision. Les tests MUST préserver succès, rejets, gardes natives et absence d’exposition sensible. La source qualifiée MUST précéder CABU et la notification des versions effectivement activées.

#### Scenario: Livraison source puis activation
- **WHEN** les sources2.1.16 sont qualifiées et archivées
- **THEN** les versions actives sont vérifiées séparément avant information des sessions

### Requirement: Point de coordination des incidents de codage CAB
Le plugin, le skill et la commande CAB MUST distribuer une même procédure de signalement des problèmes de codage CAB au chat « Correctif CAB - OC ». L’orchestrateur MUST rechercher et réutiliser ce chat, le créer seulement après absence vérifiée, éviter les doublons et conserver les mandats propres au RUN. La procédure MUST traiter cible courante, ambiguïté et outil indisponible sans auto-message ni prétendre à un envoi réalisé.

#### Scenario: Chat existant
- **WHEN** une session rencontre un problème CAB et le chat correspondant est identifié
- **THEN** l’orchestrateur le réutilise et transmet un signalement factuel filtré, sans créer de doublon ni coder en dur une identité de chat

#### Scenario: Chat absent
- **WHEN** la recherche complète accessible ne trouve pas ce chat
- **THEN** l’orchestrateur le crée dans le contexte CAB avec le signalement, puis conserve son identité pour le suivi

#### Scenario: Chat courant ou cible ambiguë
- **WHEN** le chat courant est déjà la cible ou plusieurs résultats restent ambigus
- **THEN** il consigne directement l’incident dans le premier cas et signale l’ambiguïté dans le second, sans auto-message ni diffusion multiple ; un outil indisponible reste déclaré comme tel

### Requirement: Suivi d’incident jusqu’à activation vérifiée
L’orchestrateur MUST maintenir la coordination jusqu’au correctif qualifié et à son activation CABU vérifiée, puis informer les sessions concernées. Les signalements MUST être factuels, corrélés et filtrés sans secret ni source métier inutile. Les propriétaires MUST conserver RUN, job, session, checkpoint et permissions. Une source publiée MUST NOT être annoncée active ; un blocage MUST conserver preuves et conditions de reprise sans rejeu de décision ou once.

#### Scenario: Source publiée mais activation en attente
- **WHEN** le correctif est qualifié et publié sans preuve CABU terminale
- **THEN** l’incident reste suivi et la version n’est pas déclarée effective

#### Scenario: Activation confirmée
- **WHEN** CABU termine avec les versions réellement actives et la readiness vérifiées
- **THEN** les sessions concernées sont informées de la correction et de la preuve d’activation, avant reprise autorisée

#### Scenario: Échec de mise à jour
- **WHEN** CABU échoue ou une dépendance empêche la suite
- **THEN** l’incident conserve son état, ses preuves et ses conditions de reprise, sans rejeu de décision ou once

### Requirement: Distribution du contrat modèle explicite2.1.18
La distribution MUST aligner composants et commandes sur2.1.18 et documenter reasoning en entrée et variant dans les lectures natives. Skill et commande MUST présenter le refus du champ variant et la conversion explicite, sans alias ni repli silencieux. La qualification source MUST préserver les RUN et processus ; une publication MUST NOT être annoncée comme activation.

#### Scenario: Appel corrigé sans modification du codeur
- **WHEN** un pilote rencontre opencode-model-variant-unsupported
- **THEN** il prépare un nouvel appel conforme après vérification de l’absence d’effet, sans modifier implicitement son modèle actif ni rejouer de permission

### Requirement: Distribution des transitions à chaud2.1.19
Les briques, plugins et commandes MUST annoncer2.1.19 et distribuer le raccord V2 ainsi que les transitions du même job. Le protocole MUST distinguer choix explicite libre et PLLM par défaut, secrets et autorisations opérationnelles. La qualification2.2.0 MUST être distincte d’un banc2.2.2. SCM réussi MUST être suivi de CABU et d’une notification des versions actives ; cela MUST NOT appliquer implicitement une clé ou politique aux RUN réels.

#### Scenario: Activation logicielle sans adoption métier implicite
- **WHEN** le correctif est qualifié, publié et activé par CABU
- **THEN** les propriétaires reçoivent les procédures et preuves de versions sans changement automatique de leur modèle ni de leur compte

### Requirement: Lanceur fournisseur installé utilisable par lien
Le helper provider-connect MUST exécuter main lorsqu’il est lancé directement ou via son lien installé, et MUST rester sans effet à l’import en bibliothèque. Un exit0 sans reçu MUST NOT être considéré comme preuve de raccord. Les tests MUST vérifier le lien symbolique avec canal secret privé et effet unique.

#### Scenario: Lien installé
- **WHEN** Node lance le helper par un lien vers la release gérée
- **THEN** la CLI produit son reçu et effectue au plus le raccord autorisé, sans exposer la clé

### Requirement: Distribution de la qualification de continuité2.1.20
Les briques et commandes MUST annoncer2.1.20, distribuer le lanceur corrigé et documenter la différence entre sonde fraîche et continuité historique. La qualification MUST utiliser2.2.0 exact et des métadonnées synthétiques. SCM réussi MUST être suivi de CABU puis notification de l’activation ; une limite native démontrée MUST rester explicite et ne pas être présentée comme correction de l’histoire réelle.

#### Scenario: Livraison avec limite native prouvée
- **WHEN** le correctif CLI et la qualification sont validés
- **THEN** la livraison indique séparément les comportements corrigés, les limites démontrées et les opérations réellement activées

### Requirement: Distribution de la projection native de contexte2.1.21
CAB2.1.21 MUST distribuer le module sans dépendance et sa procédure dans le plugin, le skill et la commande. Le banc exact2.2.0 MUST vérifier chargement à chaud, même compte cible/modèle/SID/PID, conservation des enregistrements et isolation d’un pair. Après SCM, CABU MUST précéder l’application réelle par les propriétaires et leur confirmation de reprise.

#### Scenario: Livraison et application distinctes
- **WHEN** la source est qualifiée et publiée puis CABU réussit
- **THEN** les propriétaires reçoivent le mécanisme et vérifient leur continuité réelle avant toute reprise métier, sans confondre les preuves source et runtime

### Requirement: Distribution du contrôle d’entrée2.1.22
Les briques CAB2.1.22 MUST distribuer le champ, sa dérivation native, la garde avant once et la procédure dans skill/commande. Les tests MUST couvrir source fabriquée, substitution, contenu divergent sans effet et succès exact. Une publication source MUST rester distincte de CABU et de l’adoption sur les nouveaux mandats des propriétaires.

#### Scenario: Adoption après activation
- **WHEN** SCM puis CABU sont vérifiés
- **THEN** les propriétaires utilisent l’empreinte sur leurs prochains mandats et conservent les anciennes décisions, preuves et RUN

### Requirement: Distribution du diagnostic vide2.1.23
Les briques CAB2.1.23 MUST distribuer la projection bornée et ses limites dans skill/commande/référence. Les tests MUST vérifier omission exacte, formes adverses, empreinte brute et absence d’autorité nouvelle. SCM/publications MUST précéder CABU vérifié puis information des sessions, sans changement implicite de leur contexte.

#### Scenario: Livraison et diagnostic réel
- **WHEN** le correctif est qualifié et activé
- **THEN** les propriétaires reçoivent la règle exacte et vérifient le diagnostic sans rejouer de mandat ou permission

### Requirement: Distribution de l’observation d’admission2.1.24
Les briques CAB2.1.24 MUST distribuer l’observation et sa procédure dans skill/commande/référence. Les tests MUST couvrir refus précoce/tardif, demandes inconnues/étrangères, isolation du pair et décision unique après stabilisation. SCM/publications MUST précéder CABU vérifié puis information, sans relance implicite ou mutation de contexte.

#### Scenario: Adoption après activation
- **WHEN** la version est qualifiée et activée
- **THEN** les pilotes observent les mêmes identités et gardes sans rejouer de décision, mandat ou permission

### Requirement: Distribution du porte-mandat2.1.25
Les briques CAB2.1.25 MUST distribuer staging, lanceur et procédure dans skill/commande/référence. Les tests MUST couvrir payload long natif exact, accès/once obligatoires, substitution, altération, contexte étranger et restauration. SCM/publications MUST précéder CABU vérifié puis information des sessions ; aucun plugin ou changement d’OpenCode MUST être imposé.

#### Scenario: Adoption après activation
- **WHEN** la livraison est qualifiée et activée
- **THEN** les propriétaires préparent de nouveaux mandats scellés et conservent anciens travaux, permissions et identités

### Requirement: Distribution des remédiations CAB 2.1.26
CAB 2.1.26 MUST distribuer projection registre, helpers et protocole de reprise dans skill/commande/référence. Le protocole MUST exiger contenu complet revu et preuves réelles de tests, sans assimiler READY, compilation ou proposition à des tests exécutés. Qualification et publications SCM MUST précéder CABU vérifié puis information des sessions, en préservant OpenCode et mandats.

#### Scenario: Reprise après incident
- **WHEN** la version est effectivement activée
- **THEN** les sessions reçoivent les diagnostics, invariants et procédure et conservent leur modèle explicite et leurs preuves

### Requirement: Attente des transitions MCP CABU
CABU MUST observer pending de façon bornée avec le budget existant, sans réémettre connect/disconnect. Une absence de confirmation MUST rester explicite. Un pending persistant MUST conserver un état nonterminal MCP_RECOVERY_REQUIRED dans le même journal, sans boucle native de repli ou nouvelle installation implicite. Les services CAB disponibles MUST rester accessibles lorsque leur code est intact.

#### Scenario: Pending transitoire
- **WHEN** une connexion devient connected dans le budget
- **THEN** une seule commande native est émise et versions/readiness restent à vérifier

#### Scenario: Pending persistant
- **WHEN** le budget expire
- **THEN** le reçu demeure réconciliable sans second connect/disconnect ni faux succès

### Requirement: Récupération MCP autorisée et unique
--recover-mcp MUST lier l’autorisation de rechargement global au reçu exact nonterminal, hors profils gelés/reuse-readonly. CABU MUST vérifier la frontière native, journaliser l’intention avant le POST et conserver PID/location/identités des sessions. Une intention déjà émise ou un résultat inconnu MUST NOT être rejoué. Demandes, once et modèles MUST rester hors de cette récupération.

#### Scenario: Récupération explicite
- **WHEN** l’opérateur autorise le reçu et la frontière est vérifiée
- **THEN** un seul rechargement global peut être envoyé sans arrêter OpenCode, puis identités, versions et readiness sont contrôlées

#### Scenario: Autorisation absente ou frontière invalide
- **WHEN** le reçu est étranger/terminal, le profil incompatible ou une activité/permission est présente
- **THEN** aucun rechargement ni nouvelle transaction n’est exécuté

#### Scenario: Intention durable sans réponse
- **WHEN** le POST expire ou le processus s’interrompt après intention
- **THEN** seules des observations peuvent réconcilier cette intention ; aucun second POST n’est envoyé

### Requirement: Clôture du reçu MCP récupéré
Une installation complète récupérée MUST terminer le même reçu après vérification des artefacts, versions et readiness fraîche. Un repli nécessaire MUST conserver et clore son reçu distinctement sans ouvrir une installation suivante dans cette récupération. Les erreurs historiques MUST rester traçables. Publication SCM MUST précéder CABU vérifié et information des sessions.

#### Scenario: Retour autonome du broker
- **WHEN** le raccord revient sans rechargement et l’installation est intacte
- **THEN** la reprise peut vérifier et clore le même reçu sans nouvel effet natif

#### Scenario: Ancien rollback non confirmé
- **WHEN** une récupération autorisée restaure le raccord
- **THEN** le même journal est réconcilié avant toute nouvelle installation distincte

### Requirement: Protocole de reprise après gel natif de revue
Le protocole skill/commande MUST distinguer deny de revue et exigences ask du nouveau mandat. Avant prévol ou opération permissionnée, le propriétaire MUST vérifier la politique avec le garde client, puis, si mandaté, lever explicitement le seul droit nécessaire à frontière sûre, consigner origine/empreintes avant-après et préserver les autres deny. CABU MUST NOT être présumé restaurer les règles. Publication SCM MUST précéder CABU vérifié puis information des sessions.

#### Scenario: Origine et reprise identifiées
- **WHEN** une revue a laissé shell/edit deny
- **THEN** le pilote conserve ce fait comme action explicite, contrôle la reprise et ne soumet pas de nouveau prévol avant shell ask prouvé

### Requirement: Fermeture des imports selon leur destination déployée
L’updater MUST inclure permission-policy dans monitorScripts et vérifier chaque import relatif statiquement déclaré contre sa source et sa destination réelles. Un module présent seulement dans un autre groupe MUST NOT satisfaire l’import. Un paquet incomplet MUST être refusé avant coupure. Les gardes de permissions MUST rester inchangées ; archivage/publications SCM MUST précéder CABU vérifié et information.

#### Scenario: Client du moniteur installé
- **WHEN** le groupe indépendant est déployé dans son layout géré
- **THEN** son client ESM charge sa dépendance de politique et expose le garde sans composant source externe

#### Scenario: Dépendance dans le mauvais groupe
- **WHEN** un import existe dans le paquet mais pas à la destination relative attendue
- **THEN** update-package-import-missing est émis avant tout arrêt ou reconnexion
