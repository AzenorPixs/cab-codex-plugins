## MODIFIED Requirements

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
Le plugin cab-approval-bridge SHALL distribuer coding-session-statistics et ses métadonnées sans plugin Tools Codex ni skill cgpt externe. Le protocole et la commande SHALL imposer les statistiques après chaque archive réussie selon archive-session-statistics. Les composants versionnés SHALL partager la base 1.10.5 ; le plugin MAY ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills approval-bridge et coding-session-statistics sont présents et résolus depuis le manifeste

#### Scenario: Release cohérente
- **WHEN** la version 1.10.5 est préparée
- **THEN** broker, contrôleur, superviseur, collecteurs, scripts, plugin et commande annoncent la même base 1.10.5

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

### Requirement: Connexion MCP et création du RUN CAB

Avant de créer une session de codage, `/CAB start` SHALL consulter `GET /mcp` du serveur
OpenCode et exiger que `cgpt-validation` soit `connected`. En cas d'échec, `/CAB start`
MAY réinitialiser l'instance par `POST /instance/dispose`, puis SHALL attendre un état
sain ; `/CAB start` SHALL ne jamais démarrer ni arrêter le broker directement.

#### Scenario: Connexion MCP et création du RUN CAB
- **WHEN** la purge du nouveau RUN est terminée mais cgpt-validation n'est pas connecté
- **THEN** aucune session de codage n'est créée avant un état MCP sain et CAB ne lance ni n'arrête directement le broker

#### Scenario: Création après raccordement sain
- **WHEN** l'initialisation globale exclusive ou la jonction sans purge est réconciliée et MCP est sain
- **THEN** `/CAB start` SHALL créer une nouvelle session maîtresse OpenCode persistante

### Requirement: Messagerie et reprise du même RUN CAB

`/CAB start` MAY réutiliser la session seulement pour la reprise du même RUN, sans
purge. `/CAB start` SHALL transmettre les mandats par la messagerie native de cette
session.

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

### Requirement: Source Git et migration réversible de la marketplace CAB

`/CAB update` SHALL vérifier que la marketplace `cab_codex_plugins` utilise la source
Git `AzenorPixs/cab-codex-plugins`, branche `main`, avec une extraction sparse
`.agents/plugins` et `plugins`. Si une source locale homonyme est détectée, `/CAB
update` SHALL mémoriser sa racine, la remplacer par la source Git et la restaurer si
l'ajout Git échoue.

#### Scenario: Source Git et migration réversible de la marketplace CAB
- **WHEN** la marketplace CAB utilise une source locale homonyme et l'ajout Git échoue
- **THEN** la racine mémorisée est restaurée et les contraintes de source, branche et extraction sparse restent contrôlées

### Requirement: Actualisation conditionnelle du plugin CAB

`/CAB update` SHALL actualiser l'instantané Git par `codex plugin marketplace upgrade
cab_codex_plugins`, comparer le manifeste distant de `cab-approval-bridge` à la version
installée et appeler `codex plugin add cab-approval-bridge@cab_codex_plugins` seulement
si le manifeste distant est strictement plus récent. `/CAB update` SHALL refuser une
version absente ou invalide et SHALL vérifier la version installée après la
réinstallation.

#### Scenario: Actualisation conditionnelle du plugin CAB
- **WHEN** le manifeste distant fournit une version strictement plus récente
- **THEN** la commande native réinstalle le plugin puis vérifie la version réellement installée

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
Un échec de préparation réseau, source ou version MUST préserver les installations et processus. /CAB update MUST prendre en charge les quatre briques selon active-component-update, avec gel durable, sauvegarde et repli contrôlé. Configurations et sources du projet piloté MUST rester inchangées ; les seules exceptions de configuration MUST rester la migration réversible de marketplace et les unités dédiées.

#### Scenario: Préservation des ressources pendant la mise à jour CAB
- **WHEN** le téléchargement échoue ou la version distante n'est pas plus récente
- **THEN** la commande locale est conservée ; un jeu déjà conforme ne redémarre rien, et un jeu déployé ou actif divergent peut être réconcilié depuis le plugin installé validé

### Requirement: Déploiement du superviseur sans démarrage
/CAB update MUST installer le jeu complet des quatre briques et recharger systemd lorsque nécessaire. Un superviseur initialement inactif MUST rester inactif ; une brique initialement active MUST être arrêtée puis redémarrée dans la transaction de maintenance. La commande MUST NOT activer les unités au login.

#### Scenario: Déploiement du superviseur sans démarrage
- **WHEN** le superviseur initialement inactif est absent ou divergent
- **THEN** la commande le déploie depuis le plugin et recharge systemd sans activation ni démarrage

#### Scenario: Superviseur actif actualisé
- **WHEN** le superviseur fonctionne avec un ancien jeu
- **THEN** la transaction le redémarre sur le jeu vérifié et préserve les RUN

### Requirement: Résumé des versions réellement observées
/CAB update MUST afficher séparément les versions GitHub, du plugin installé, des fichiers déployés et des processus actifs pour broker, contrôleur, superviseur, Web et commande. Il MUST distinguer inactivité, attente de maintenance et retour arrière. Toute version inconnue MUST rester indisponible ; celle du broker actif MUST provenir de sa readiness réelle.

#### Scenario: Résumé des versions réellement observées
- **WHEN** une mise à jour CAB termine avec une version du broker actif inaccessible
- **THEN** le résumé distingue GitHub et local et indique la valeur indisponible sans la déduire du paquet

### Requirement: Distribution concurrente 1.0.0
Les garanties d'identité et d'isolation introduites en 1.0.0 MUST être conservées dans les briques 1.10.5 ; les exclusions MUST suivre le nouveau contrat de ressources. Les prompts pilotés des huit projets MUST rester cohérents lors de leur déploiement autorisé. CISM, CAISM et prompts directs MUST rester inchangés. La préparation source MUST NOT modifier consommateurs ou services actifs.

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

## ADDED Requirements

### Requirement: Commandes CAB canoniques et alias compatibles

`/CAB` MUST être défini dans `.codex/commands/CAB.md`. L'alias `cab.md`
MUST charger le fichier frère CAB.md de même version et transmettre les arguments
inchangés. `CABU.md` MUST charger ce fichier et exécuter exactement `/CAB update`
dans le même tour, sans procédure dupliquée. CABU MUST refuser les arguments.
Une dépendance absente ou divergente MUST arrêter l'alias avant effet.
La préparation source MUST NOT invoquer les services actifs.

#### Scenario: Mise à jour par raccourci
- **WHEN** `/CABU` est invoqué sans argument avec un fichier canonique de même version
- **THEN** la procédure `/CAB update` est exécutée avec les mêmes gardes, résultats et reprise

#### Scenario: Alias de compatibilité
- **WHEN** `/cab status --run A` est invoqué
- **THEN** CAB reçoit exactement `status --run A` et produit la consultation ponctuelle

#### Scenario: Arguments ou dépendance invalides
- **WHEN** CABU reçoit un argument ou CAB.md manque ou possède une version divergente
- **THEN** l'alias signale l'erreur et termine avant toute opération réseau ou de maintenance

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
