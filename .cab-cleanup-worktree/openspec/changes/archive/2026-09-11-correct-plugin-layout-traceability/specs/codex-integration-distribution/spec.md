## MODIFIED Requirements

### Requirement: Plugin Codex structuré
Le plugin CAB SHALL être distribué depuis `cab-codex-plugins/`, avec une
marketplace dans `.agents/plugins/marketplace.json` et un plugin dans
`plugins/cab-approval-bridge/`. Ce plugin SHALL fournir un manifeste
`.codex-plugin/plugin.json`, la skill CAB et les scripts de contrôleur,
healthcheck et SSE dans une arborescence distribuable cohérente.

#### Scenario: Validation du plugin
- **WHEN** le manifeste du plugin est soumis au validateur Codex
- **THEN** il est accepté et les chemins déclarés existent dans l'artefact

#### Scenario: Localisation du plugin
- **WHEN** une distribution CAB est préparée
- **THEN** la marketplace et le plugin sont pris depuis `cab-codex-plugins/` sans déplacement sous `.codex/`
