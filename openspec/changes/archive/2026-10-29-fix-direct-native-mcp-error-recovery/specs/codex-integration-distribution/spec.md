## ADDED Requirements

### Requirement: Distribution de la récupération native directe 2.1.11

Les composants versionnés CAB MUST partager la base 2.1.11 et documenter la récupération directe strictement qualifiée. Source, archivage, publication, activation et récupération réelle MUST rester distincts. La préparation source MUST NOT modifier les sessions, RUN ou services actifs.

#### Scenario: Sources qualifiées
- **WHEN** les tests et documents source sont validés
- **THEN** les artefacts partagent 2.1.11 et une activation ultérieure reste coordonnée séparément

## MODIFIED Requirements

### Requirement: Skill de statistiques embarqué dans CAB
Le plugin CAB SHALL distribuer coding-session-statistics et ses métadonnées sans plugin Tools Codex ni skill cgpt externe. Le protocole et la commande SHALL imposer les statistiques après chaque archive réussie selon archive-session-statistics. Les composants versionnés SHALL partager la base de version courante ; le plugin MAY ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills CAB et coding-session-statistics sont présents et résolus depuis le manifeste

#### Scenario: Release cohérente
- **WHEN** le patch 2.1.9 est préparé
- **THEN** broker, contrôleur, superviseur, collecteurs, scripts, plugins et commandes annoncent la même base 2.1.11


### Requirement: Distribution du cycle de vie CAB 2.1.9
La distribution source MUST aligner ses composants versionnés sur 2.1.11 et inclure le module de cycle de vie dans les fermetures d’import du contrôleur, superviseur et moniteur. Les unités MUST empêcher le redémarrage automatique après un nettoyage incomplet identifié. La préparation MUST NOT installer, activer ou modifier les RUN réels.

#### Scenario: Paquet source qualifié
- **WHEN** CAB 2.1.9 est préparé
- **THEN** ses versions et imports sont cohérents et aucune activation réelle n’est déduite des tests


