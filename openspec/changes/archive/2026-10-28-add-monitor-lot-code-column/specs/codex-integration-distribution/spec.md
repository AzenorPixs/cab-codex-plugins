## MODIFIED Requirements

### Requirement: Skill de statistiques embarqué dans CAB
Le plugin CAB SHALL distribuer coding-session-statistics et ses métadonnées sans plugin Tools Codex ni skill cgpt externe. Le protocole et la commande SHALL imposer les statistiques après chaque archive réussie selon archive-session-statistics. Les composants versionnés SHALL partager la base de version courante ; le plugin MAY ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills CAB et coding-session-statistics sont présents et résolus depuis le manifeste

#### Scenario: Release cohérente
- **WHEN** le patch 2.1.2 est préparé
- **THEN** broker, contrôleur, superviseur, collecteurs, scripts, plugins et commandes annoncent la même base 2.1.2
