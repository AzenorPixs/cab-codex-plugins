## ADDED Requirements

### Requirement: Distribution générique de l’isolation MCP 2.1.14
La distribution MUST aligner les composants et commandes sur 2.1.14, documenter les cibles MCP et le helper de sonde. Les exemples et consignes MUST utiliser des workspaces génériques. La récupération d’un contexte concurrent MUST rester explicite, sous preuves et sans redémarrage OpenCode. Les sources qualifiées MUST précéder l’activation réelle.

#### Scenario: Distribution et activation distinctes
- **WHEN** les sources et tests isolés sont validés et archivés
- **THEN** CABU vérifie séparément les versions actives avant notification aux sessions
