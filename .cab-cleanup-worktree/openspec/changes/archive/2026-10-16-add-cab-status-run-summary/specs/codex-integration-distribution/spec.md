## MODIFIED Requirements

### Requirement: Commande de pilotage sûre

La commande Codex `/cab` SHALL être versionnée dans `.codex/commands/cab.md` et proposer
`start`, `run`, `test`, `update`, `status` et `stop`. La commande `/cab` SHALL orchestrer les
ressources de communication CAB entre le broker MCP et l'agent Codex, sans rendre de
décision d'approbation ni modifier le projet piloté. La commande `/cab` SHALL préserver
OpenCode et le broker MCP géré par OpenCode lors de l'arrêt.

#### Scenario: Démarrage CAB
- **WHEN** `/cab start` est exécutée
- **THEN** elle rejoint le runtime sans purge, ou le purge lors d’une réinitialisation globale exclusive, vérifie `/mcp`, initialise le contrôleur et la supervision CAB, puis crée une nouvelle session maîtresse sans prendre de décision métier

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

### Requirement: Skill de statistiques embarqué dans CAB
Le plugin cab-approval-bridge SHALL distribuer coding-session-statistics et
ses métadonnées sans plugin Tools Codex ni skill cgpt externe. Le protocole
et la commande SHALL imposer les statistiques après chaque archive réussie
selon archive-session-statistics. Les composants versionnés SHALL partager
la base 1.2.1 ; le plugin MAY ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills approval-bridge et coding-session-statistics sont présents et résolus depuis le manifeste

#### Scenario: Release cohérente
- **WHEN** la version 1.2.1 est préparée
- **THEN** broker, contrôleur, superviseur, collecteur, scripts, plugin et commande annoncent la même base 1.2.1

### Requirement: Distribution concurrente 1.0.0
Le profil concurrent introduit en 1.0.0 MUST être conservé dans les briques
1.2.1, avec registre, contextes, verrou et réservations distribués. Les prompts
pilotés des huit projets MUST rester cohérents lors de leur déploiement autorisé.
CISM, CAISM et les prompts directs MUST rester inchangés. La préparation source
MUST NOT modifier les projets consommateurs ni leurs services actifs.

#### Scenario: Isolation concurrente
- **WHEN** la distribution source est contrôlée
- **THEN** versions et contrats sont cohérents sans activation ni déploiement des services

### Requirement: Distribution cohérente du correctif 1.0.1
La garde native introduite en 1.0.1 MUST être conservée par les briques 1.2.1.
Le plugin MUST porter un cachebuster neuf. Schémas broker et protocole MCP MUST
rester inchangés ; le registre concurrent MUST suivre concurrent-run-coordination.
La préparation source MUST NOT modifier services actifs, caches installés ou RUN.

#### Scenario: Jeu source vérifié
- **WHEN** les contrôles de distribution réussissent
- **THEN** les versions exécutables sont cohérentes sans annoncer un déploiement actif

### Requirement: Distribution du correctif de polling 1.0.2
Les briques CAB MUST annoncer 1.2.1 et conserver le correctif de polling 1.0.2.
Le plugin MUST porter un cachebuster neuf. Schémas broker et protocole MCP MUST
rester inchangés ; le registre MUST suivre concurrent-run-coordination. Skill,
commande et protocoles pilotés MUST distinguer timeout et refus terminal corrélé.
La préparation source MUST NOT modifier services, caches ou RUN actifs.

#### Scenario: Correctif source cohérent
- **WHEN** la distribution et les protocoles sources sont vérifiés
- **THEN** versions et refus après timeout sont cohérents sans annonce de déploiement actif

#### Scenario: Autorité d'arrêt préservée
- **WHEN** le développeur demande explicitement un arrêt ciblé pendant une récupération gelée
- **THEN** gate, réconciliation et preuves restent exigés sans fermeture des services partagés des autres RUN

## ADDED Requirements

### Requirement: Rapport synthétique status en lecture seule
/cab status MUST produire un rapport français horodaté de tous les RUN identifiés dans le contexte suivi. /cab status --run <run_id> MUST filtrer ce RUN exact sans lui envoyer de message. La commande MUST afficher les colonnes RUN / Nom du change, Actions réalisées, Actions en cours et Actions restant à réaliser, puis terminer sa réponse hors boucle de pilotage. Elle MUST NOT déclencher écriture, permission, session, démarrage, arrêt, reconnexion, sondage périodique ou remédiation.

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
