
## MODIFIED Requirements

### Requirement: Skill de statistiques embarqué dans CAB
Le plugin cab-approval-bridge SHALL distribuer coding-session-statistics et ses métadonnées sans plugin Tools Codex ni skill cgpt externe. Le protocole et la commande SHALL imposer les statistiques après chaque archive réussie selon archive-session-statistics. Les composants versionnés SHALL partager la base 1.10.2 ; le plugin MAY ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills approval-bridge et coding-session-statistics sont présents et résolus depuis le manifeste

#### Scenario: Release cohérente
- **WHEN** la version 1.10.2 est préparée
- **THEN** broker, contrôleur, superviseur, collecteurs, scripts, plugin et commande annoncent la même base 1.10.2

### Requirement: Distribution concurrente 1.0.0
Les garanties d'identité et d'isolation introduites en 1.0.0 MUST être conservées dans les briques 1.10.2 ; les exclusions MUST suivre le nouveau contrat de ressources. Les prompts pilotés des huit projets MUST rester cohérents lors de leur déploiement autorisé. CISM, CAISM et prompts directs MUST rester inchangés. La préparation source MUST NOT modifier consommateurs ou services actifs.

#### Scenario: Isolation concurrente
- **WHEN** la distribution source est contrôlée
- **THEN** versions et contrats sont cohérents sans activation ni déploiement des services

### Requirement: Distribution cohérente du correctif 1.0.1
La garde native introduite en 1.0.1 MUST être conservée par les briques 1.10.2. Le plugin MUST porter un cachebuster neuf. Le transport MCP MUST rester compatible ; les formats persistés MUST suivre leurs contrats de migration explicites. La préparation source MUST NOT modifier services actifs, caches installés ou RUN.

#### Scenario: Jeu source vérifié
- **WHEN** les contrôles de distribution réussissent
- **THEN** les versions exécutables sont cohérentes sans annoncer un déploiement actif

### Requirement: Distribution du correctif de polling 1.0.2
Les briques CAB MUST annoncer 1.10.2 et conserver le correctif de polling 1.0.2. Le plugin MUST porter un cachebuster neuf. Skill, commande et protocoles pilotés MUST distinguer timeout et refus terminal corrélé. Les formats MUST suivre leurs contrats de migration et la préparation source MUST NOT modifier services, caches ou RUN actifs.

#### Scenario: Correctif source cohérent
- **WHEN** la distribution et les protocoles sources sont vérifiés
- **THEN** versions et refus après timeout sont cohérents sans annonce de déploiement actif

#### Scenario: Autorité d'arrêt préservée
- **WHEN** le développeur demande explicitement un arrêt ciblé pendant une récupération gelée
- **THEN** gate, réconciliation et preuves restent exigés sans fermeture des services partagés des autres RUN

### Requirement: Distribution des observations CAB
Les modules distribués, broker, contrôleur, superviseur, manifeste, unités et commande MUST annoncer la version de base 1.10.2. Le module de fenêtres et l'importeur MUST être distribués avec leurs contrats et tests, sans nouvelle dépendance tierce ni installation automatique.

#### Scenario: Jeu source complet
- **WHEN** le jeu CAB 1.10.2 est qualifié
- **THEN** ses versions sont cohérentes et les tests couvrent import, fenêtres, commandes et absence d'effet métier sans modifier une installation active

### Requirement: Alignement des briques distribuées
La release MUST aligner à 1.10.2 broker, routeur, journal, contrôleur, contextes, registre, superviseur, SSE, healthcheck, collecteurs, outils de purge/prompts, commande et manifeste. Les supports sans version propre MUST être rattachés à cette release sans format artificiel. Les capacités statistiques livrées avant elle MUST être préservées.

#### Scenario: Contrôle du paquet complet
- **WHEN** la release 1.10.2 est qualifiée
- **THEN** l'inventaire des composants, imports, références et versions ne présente aucun mélange de jeux exécutables

### Requirement: Capacité de coordination négociée
Avant mandat mutable, les composants et clients MUST confirmer resource-scoped-v1 et les champs d'opération requis. Un jeu mixte, un ancien client ou une acquisition historique incompatible MUST être refusé sans effet avec diagnostic de migration. Les consultations historiques compatibles MUST rester disponibles.

#### Scenario: Ancien broker
- **WHEN** le broker ne garantit pas le transport des champs d'opération
- **THEN** le contrôleur refuse toute nouvelle permission mutable

#### Scenario: Ancien contrôleur
- **WHEN** un broker 1.10.2 notifie un RUN à un ancien contrôleur
- **THEN** la route dédiée est indisponible, la demande reste non approuvée et l'ancien chemin de notification n'est pas utilisé pour ce RUN

#### Scenario: Ancienne intégration globale
- **WHEN** un client demande l'ancienne barrière ordinaire dans le profil 1.10.2
- **THEN** CAB refuse sans geler les pairs et indique le contrat de remplacement

### Requirement: Migration sous maintenance explicite
Le déploiement et la conversion des formats MUST exiger une maintenance autorisée, quiescence réelle, sauvegarde privée et contrôle du jeu complet. RUN, jobs, preuves, candidates, réservations et permissions consommées MUST être préservés. Le retour arrière MUST refuser toute perte d'effets récents ou lecture d'un format inconnu.

#### Scenario: Maintenance avec RUN conservés
- **WHEN** le jeu 1.10.2 est déployé après drainage et sauvegarde
- **THEN** les RUN restent identifiables et reprennent seulement après réconciliation et prévol vérifiés sans rejeu des écritures

#### Scenario: Prévol avant reprise métier
- **WHEN** la maintenance est levée pour tester un RUN migré tandis que les pairs restent en pause
- **THEN** seul /usr/bin/true en lecture est admissible avant once acquittée, exit 0 et libération prouvés ; une écriture métier reste refusée

### Requirement: Commandes et protocoles ciblés
Commande, skills, références et générateur MUST appliquer les protections ciblées et les quatre causes de gel exceptionnel. Pause/arrêt MUST distinguer RUN explicite et cible --all. Les consultations MUST rester en lecture seule. La propagation des prompts consommateurs MUST être distinctement autorisée et vérifiée par inventaire et empreintes.

#### Scenario: Arrêt d'un RUN
- **WHEN** /cab stop --run A est demandé dans un contexte multi-RUN
- **THEN** le protocole ne transforme pas cette demande en arrêt global de B

#### Scenario: Préparation source
- **WHEN** les protocoles 1.10.2 sont préparés dans CAB
- **THEN** aucun prompt consommateur ni cache installé n'est modifié sans autorisation de déploiement

### Requirement: Distribution du catalogue de cycle
Le plugin MUST distribuer le catalogue partagé avec contexte de job et moniteur. Le protocole et le skill MUST documenter les déclarations explicites, retours et états non applicables. Toutes les briques MUST partager la version 1.10.2 ; cette livraison MUST NOT modifier les services ou profils actifs.

#### Scenario: Jeu source complet
- **WHEN** la préparation source est qualifiée
- **THEN** le catalogue importé, les références distribuées et les tests sont présents avec la même version de base 1.10.2

### Requirement: Réutilisation et vérification du monitoring
/cab start et toute entrée ou reprise de session pilotée MUST vérifier unité active, page HTTP locale, version et identity.workspace conformes, puis afficher l'URL réelle. Une instance conforme MUST être réutilisée sans redémarrage ni modification de configuration. Une instance active divergente MUST être signalée sans remplacement ni réaffectation implicite. Un port occupé MUST NOT conduire à tuer son propriétaire.

#### Scenario: Service déjà conforme
- **WHEN** l'instance active annonce le workspace attendu et la version 1.10.2
- **THEN** /cab start la réutilise et affiche son URL sans redémarrage

### Requirement: Distribution cohérente de la récupération 1.9.0
Le jeu CAB MUST annoncer 1.10.2 avec cachebuster neuf, fermeture d'imports et preuves de qualification. Il MUST distribuer maintenance-proof et le profil frozen-recovery-controller, préserver le rejet seul de notification et distinguer source, code chargé et runtime vivant. Cette préparation MUST NOT installer ou activer les correctifs sur les RUN réels.

#### Scenario: Ancien contrôleur conservé
- **WHEN** la préparation source 1.10.2 est terminée
- **THEN** l'ancien contrôleur peut rester chargé et la réparation de la récupération ciblée demeure soumise à sa maintenance explicitement autorisée

### Requirement: Distribution cohérente 1.10.0
La préparation source MUST aligner sur 1.10.2 les briques CAB, métadonnées, copies broker, commande et références courantes. Elle MUST distribuer les contrats et tests des réservations Docker/LXC et du rafraîchissement réglable. Le contrôleur MUST exposer la capacité test-resources-v1. Un ancien lecteur MUST refuser le nouvel état de réservations plutôt que perdre une protection ; aucun déploiement ni migration runtime MUST être déduit de cette préparation.

#### Scenario: Paquet qualifié
- **WHEN** le jeu source 1.10.2 est vérifié
- **THEN** ses versions et copies sont cohérentes, les tests couvrent les nouvelles gardes et aucune installation active n'est modifiée

### Requirement: Distribution du correctif 1.10.2
La préparation MUST aligner les briques, métadonnées et références courantes sur 1.10.2. La liste fermée des brokers chargés qualifiés MUST conserver 1.10.0 lors de cet incrément. Une installation locale explicitement demandée MUST conserver la provenance, les sauvegardes et les anciennes releases, sans édition manuelle du cache ni changement Git implicite. Le bilan MUST séparer source, plugin installé et versions actives.

#### Scenario: Mise à jour locale et publication antérieure
- **WHEN** le jeu local qualifié est 1.10.2 et la publication distante reste 1.10.0
- **THEN** l'installation locale autorisée reste identifiable et aucun retour automatique au paquet antérieur n'est présenté comme une mise à jour
