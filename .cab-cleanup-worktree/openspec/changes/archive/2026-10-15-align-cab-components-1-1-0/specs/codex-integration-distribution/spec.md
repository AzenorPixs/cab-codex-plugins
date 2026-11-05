## MODIFIED Requirements

### Requirement: Skill de statistiques embarqué dans CAB
Le plugin cab-approval-bridge SHALL distribuer coding-session-statistics et
ses métadonnées sans plugin Tools Codex ni skill cgpt externe. Le protocole
et la commande SHALL imposer les statistiques après chaque archive réussie
selon archive-session-statistics. Les composants versionnés SHALL partager
la base 1.1.0 ; le plugin MAY ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills approval-bridge et coding-session-statistics sont présents et résolus depuis le manifeste

#### Scenario: Release cohérente
- **WHEN** la version 1.1.0 est préparée
- **THEN** broker, contrôleur, superviseur, collecteur, scripts, plugin et commande annoncent la même base 1.1.0

### Requirement: Distribution concurrente 1.0.0
Le profil concurrent introduit en 1.0.0 MUST être conservé dans les briques
1.1.0, avec registre, contextes, verrou et réservations distribués. Les prompts
pilotés des huit projets MUST rester cohérents lors de leur déploiement autorisé.
CISM, CAISM et les prompts directs MUST rester inchangés. La préparation source
MUST NOT modifier les projets consommateurs ni leurs services actifs.

#### Scenario: Isolation concurrente
- **WHEN** la distribution source est contrôlée
- **THEN** versions et contrats sont cohérents sans activation ni déploiement des services

### Requirement: Distribution cohérente du correctif 1.0.1
La garde native introduite en 1.0.1 MUST être conservée par les briques 1.1.0.
Le plugin MUST porter un cachebuster neuf. Schémas broker et protocole MCP MUST
rester inchangés ; le registre concurrent MUST suivre concurrent-run-coordination.
La préparation source MUST NOT modifier services actifs, caches installés ou RUN.

#### Scenario: Jeu source vérifié
- **WHEN** les contrôles de distribution réussissent
- **THEN** les versions exécutables sont cohérentes sans annoncer un déploiement actif

### Requirement: Distribution du correctif de polling 1.0.2
Les briques CAB MUST annoncer 1.1.0 et conserver le correctif de polling 1.0.2.
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
