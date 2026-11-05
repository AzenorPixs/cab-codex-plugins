## MODIFIED Requirements

### Requirement: Skill de statistiques embarqué dans CAB

Le plugin `cab-approval-bridge` SHALL distribuer le skill
`coding-session-statistics` et ses métadonnées sous son répertoire `skills/`.
Son installation SHALL rendre ce skill disponible sans plugin Tools Codex
et sans skill `cgpt` externe. Le protocole et la commande CAB SHALL imposer
sa production de statistiques après chaque archivage réussi selon
`archive-session-statistics`. Les composants versionnés SHALL partager la
version de base `0.87.0`, le plugin pouvant ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills `approval-bridge` et `coding-session-statistics` sont présents dans le paquet et résolus depuis son manifeste

#### Scenario: Release cohérente
- **WHEN** la release est validée
- **THEN** le broker, le contrôleur, le superviseur, le plugin et la commande annoncent tous la version de base `0.87.0`

## ADDED Requirements

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
