## ADDED Requirements

### Requirement: Overview des échecs des actions du projet

L'écran Forges MUST présenter le motif des échecs des actions Git locales et distantes dans leur Overview. L'Overview d'une publication MUST présenter le reçu et l'étape de l'échec quand ils existent. Les diagnostics MUST exclure les secrets et les sorties brutes non filtrées.

#### Scenario: Échec d'une action Git

- **WHEN** l'utilisateur rencontre un refus ou un échec lors d'une action Git locale ou distante
- **THEN** CAB affiche le motif dans l'Overview de cette action

#### Scenario: Image locale sans le tag de la version du projet

- **WHEN** le plan ne trouve aucune image portant la version du projet alors qu'une image locale est présente
- **THEN** CAB affiche le tag requis dans l'Overview de publication

#### Scenario: Échec asynchrone d'une publication

- **WHEN** CAB observe l'échec ou le résultat incertain de la publication demandée depuis une carte de forge
- **THEN** l'Overview affiche le reçu et la cause disponible
- **AND THEN** le détail reste accessible après fermeture de l'Overview
