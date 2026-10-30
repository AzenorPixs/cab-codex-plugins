## ADDED Requirements

### Requirement: Isolation des sondes vis-à-vis du broker partagé
Une sonde MUST utiliser une session jetable dans la location MCP partagée avec outils interdits, sans initialiser un contexte MCP concurrent. Elle MUST conserver le modèle et le raisonnement du codeur et supprimer uniquement sa propre session. Une panne MUST rester INCOMPLETE sans reconnexion ni reconstruction des créneaux manqués.

#### Scenario: Sonde périodique isolée
- **WHEN** une sonde complète son échange texte dans la location partagée
- **THEN** le broker et la session de codage restent préservés et seule la session technique est supprimée
