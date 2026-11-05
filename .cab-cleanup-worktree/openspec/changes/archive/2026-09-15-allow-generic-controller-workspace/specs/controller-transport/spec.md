## MODIFIED Requirements

### Requirement: Interface locale limitée
Le contrôleur SHALL écouter uniquement sur `127.0.0.1` ou `::1`, par défaut
`127.0.0.1`, et SHALL conserver MCP hors de son interface HTTP. Il SHALL
exiger une exécution explicitement déclarée hors sandbox et un workspace de
projet absolu fourni au démarrage. Il SHALL NOT contenir de liste codée en dur
de projets pilotés.

#### Scenario: Démarrage sans autorisation hors sandbox
- **WHEN** le contrôleur démarre sans `OC_Codex_OUTSIDE_SANDBOX=1`
- **THEN** il échoue avant d'ouvrir son interface locale

#### Scenario: Hôte non local refusé
- **WHEN** `OC_Codex_STATUS_HOST` contient une adresse autre que `127.0.0.1` ou `::1`
- **THEN** le contrôleur échoue avant d'ouvrir son interface locale

#### Scenario: Workspace non autorisé refusé
- **WHEN** `OC_Codex_WORKSPACE` est absent ou relatif
- **THEN** le contrôleur échoue avant de lancer Codex App Server

#### Scenario: Workspace absolu générique
- **WHEN** `OC_Codex_WORKSPACE` désigne une racine de projet absolue
- **THEN** le contrôleur l'accepte sans comporter de référence à un projet
  piloté particulier
