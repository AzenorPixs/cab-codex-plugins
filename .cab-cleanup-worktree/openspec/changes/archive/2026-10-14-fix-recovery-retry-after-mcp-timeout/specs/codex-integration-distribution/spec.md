## ADDED Requirements

### Requirement: Distribution du correctif de polling 1.0.2
Le broker, le contrôleur, le superviseur, les scripts versionnés, la commande et le plugin MUST publier la version de base 1.0.2 avec cachebuster neuf pour le plugin. Les schémas et le protocole MCP MUST rester inchangés. Le skill, la commande et les huit ORCHESTRATED_CODING.md MUST distinguer timeout seul et refus terminal corrélé par polling. La préparation source MUST NOT modifier services actifs, caches installés ou états des RUN.

#### Scenario: Correctif source cohérent
- **WHEN** la distribution et les huit protocoles sont vérifiés
- **THEN** les versions et le traitement du refus après timeout sont cohérents sans annoncer de déploiement actif

#### Scenario: Autorité d'arrêt préservée
- **WHEN** le développeur demande explicitement un arrêt ciblé pendant une récupération gelée
- **THEN** le protocole distingue cet arrêt de retry, exige gate et réconciliation, conserve les preuves et ne ferme pas les services partagés des autres RUN

## MODIFIED Requirements

### Requirement: Distribution concurrente 1.0.0
Le profil concurrent introduit en 1.0.0 MUST être conservé par les briques CAB courantes 1.0.2. La distribution MUST inclure registre, contextes isolés, verrou et règles de réservation dans la commande, les skills et le protocole. Les prompts pilotés des huit projets inventoriés MUST rester synchronisés. CISM, CAISM et les prompts directs MUST rester inchangés.

#### Scenario: Isolation concurrente
- **WHEN** la distribution est contrôlée
- **THEN** les versions et contrats sont cohérents sans activation des services

### Requirement: Distribution cohérente du correctif 1.0.1
La garde native introduite en 1.0.1 MUST être conservée dans le broker, le contrôleur, le superviseur, les scripts versionnés, la commande et le plugin de version courante 1.0.2. Le plugin MUST utiliser un cachebuster neuf. Les versions de schéma et de protocole MCP MUST rester inchangées. La préparation source MUST NOT modifier les services actifs, les caches installés ou les états des RUN.

#### Scenario: Jeu source vérifié
- **WHEN** les contrôles de distribution du correctif réussissent
- **THEN** les versions exécutables sont cohérentes sans annoncer un déploiement actif
