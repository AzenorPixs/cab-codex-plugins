# codex-integration-distribution Specification

## Purpose
Cette capacité définit l'intégration locale de CAB dans Codex et les conditions minimales de distribution reproductible.

## Requirements

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

### Requirement: Commande de pilotage sûre
La commande Codex `/cab` SHALL être versionnée dans
`.codex/commands/cab.md` et proposer `start`, `test` et `stop`. Elle SHALL
orchestrer les ressources de communication CAB entre le broker MCP et l'agent
Codex, sans rendre de décision d'approbation ni modifier le projet piloté.
Elle SHALL préserver OpenCode et le broker MCP géré par OpenCode lors de
l'arrêt.

#### Scenario: Démarrage CAB
- **WHEN** `/cab start` est exécutée
- **THEN** elle initialise ou reprend le contrôleur et la supervision CAB sans prendre de décision métier

#### Scenario: Test CAB
- **WHEN** `/cab test` est exécutée
- **THEN** elle vérifie le chemin de validation complet sans modifier le projet piloté

#### Scenario: Arrêt CAB
- **WHEN** `/cab stop` est exécutée
- **THEN** elle ferme seulement les ressources CAB qu'elle a créées et ne ferme ni OpenCode ni le broker MCP géré par OpenCode

### Requirement: Version et publication cohérentes
Les artefacts distribués CAB SHALL partager une version de projet explicite ou documenter leur relation. Un catalogue marketplace SHALL référencer le plugin publié, ou être absent tant qu'aucune publication n'est définie.

#### Scenario: Préparation de release
- **WHEN** une release est préparée
- **THEN** la version du broker, du plugin et du catalogue est vérifiée avant publication
