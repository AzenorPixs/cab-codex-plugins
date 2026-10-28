## ADDED Requirements

### Requirement: Identités CAB et CABU en majuscules
La marketplace MUST identifier les plugins par CAB et CABU. Leurs skills principaux MUST être nommés CAB et CABU et invocables comme $CAB et $CABU. Les commandes canoniques MUST rester /CAB et /CABU. Le nom affiché de la marketplace MUST être CAB Codex Plugins. Les chemins techniques et l'alias /cab MUST rester compatibles. Le skill auxiliaire coding-session-statistics MUST rester accessible sous le namespace CAB.

#### Scenario: Distribution vérifiée
- **WHEN** un paquet est préparé
- **THEN** les entrées marketplace, manifestes et frontmatters annoncent les identifiants majuscules et les sélecteurs CLI utilisent CAB@cab_codex_plugins et CABU@cab_codex_plugins

#### Scenario: Ancien plugin installé
- **WHEN** une installation utilise encore cab-approval-bridge
- **THEN** le gestionnaire installe et vérifie CAB avant retrait de l'ancienne entrée, sans édition manuelle du cache ni modification des données métier

## MODIFIED Requirements

### Requirement: Skill de statistiques embarqué dans CAB
Le plugin CAB SHALL distribuer coding-session-statistics et ses métadonnées sans plugin Tools Codex ni skill cgpt externe. Le protocole et la commande SHALL imposer les statistiques après chaque archive réussie selon archive-session-statistics. Les composants versionnés SHALL partager la base de version courante ; le plugin MAY ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills CAB et coding-session-statistics sont présents et résolus depuis le manifeste

#### Scenario: Release cohérente
- **WHEN** le patch 2.1.1 est préparé
- **THEN** broker, contrôleur, superviseur, collecteurs, scripts, plugins et commandes annoncent la même base 2.1.1

### Requirement: Actualisation conditionnelle du plugin CAB
/CAB update SHALL actualiser la marketplace GitHub, comparer le manifeste du plugin CAB à la version installée et appeler codex plugin add CAB@cab_codex_plugins si le plugin CAB est absent ou si le manifeste distant est strictement plus récent. La commande SHALL refuser une version absente ou invalide et vérifier la version et l'identité après installation. Les noms CABU et CAB MUST rester sensibles à la casse.

#### Scenario: Actualisation conditionnelle du plugin CAB
- **WHEN** le manifeste distant est strictement plus récent ou l'ancien identifiant est encore installé
- **THEN** la commande installe CAB puis vérifie son identité et sa version
