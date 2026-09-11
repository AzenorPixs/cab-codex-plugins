## Purpose

Cette capacité définit l'intégration locale de CAB dans Codex et les conditions minimales de distribution reproductible.

## ADDED Requirements

### Requirement: Plugin Codex structuré
Le plugin CAB SHALL fournir un manifeste `.codex-plugin/plugin.json`, la skill CAB et les scripts de contrôleur, healthcheck et SSE dans une arborescence distribuable cohérente.

#### Scenario: Validation du plugin
- **WHEN** le manifeste du plugin est soumis au validateur Codex
- **THEN** il est accepté et les chemins déclarés existent dans l'artefact

### Requirement: Commande de pilotage sûre
La commande `/cab` SHALL proposer `start`, `test` et `stop`. Elle SHALL préserver OpenCode et le broker MCP géré par OpenCode lors de l'arrêt.

#### Scenario: Arrêt CAB
- **WHEN** `/cab stop` est exécutée
- **THEN** elle ferme seulement les ressources CAB qu'elle a créées et ne ferme pas OpenCode

### Requirement: Version et publication cohérentes
Les artefacts distribués CAB SHALL partager une version de projet explicite ou documenter leur relation. Un catalogue marketplace SHALL référencer le plugin publié, ou être absent tant qu'aucune publication n'est définie.

#### Scenario: Préparation de release
- **WHEN** une release est préparée
- **THEN** la version du broker, du plugin et du catalogue est vérifiée avant publication
