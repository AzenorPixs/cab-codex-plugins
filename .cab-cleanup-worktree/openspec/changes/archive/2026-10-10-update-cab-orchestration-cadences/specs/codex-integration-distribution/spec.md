## MODIFIED Requirements

### Requirement: Skill de statistiques embarqué dans CAB

Le plugin `cab-approval-bridge` SHALL distribuer le skill
`coding-session-statistics` et ses métadonnées sous son répertoire `skills/`.
Son installation SHALL rendre ce skill disponible sans plugin Tools Codex
et sans skill `cgpt` externe. Le protocole et la commande CAB SHALL imposer
sa production de statistiques après chaque archivage réussi selon
`archive-session-statistics`. Les composants versionnés SHALL partager la
version de base `0.86.8`, le plugin pouvant ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB

- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills `approval-bridge` et `coding-session-statistics` sont présents dans le paquet et résolus depuis son manifeste

#### Scenario: Release cohérente

- **WHEN** la release est validée
- **THEN** le broker, le contrôleur, le superviseur, le plugin et la commande annoncent tous la version de base `0.86.8`
