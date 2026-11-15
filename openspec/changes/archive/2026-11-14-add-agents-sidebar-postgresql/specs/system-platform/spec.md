## ADDED Requirements

### Requirement: Catalogue et navigation des agents
La page /agents MUST présenter une colonne latérale listant les agents déclarés dans la table PostgreSQL `agents`. Le catalogue MUST initialiser OpenCode, Codex CLI et Codex avec des identités distinctes. La sélection MUST afficher les informations de l'agent choisi. Les états de processus, versions et connexions MUST rester issus des observations courantes et les secrets MUST NOT être stockés dans ce catalogue.

#### Scenario: Sélection d'un agent
- **WHEN** un administrateur sélectionne un agent dans la colonne
- **THEN** sa fiche est affichée et les autres agents restent accessibles dans le menu.

#### Scenario: Base indisponible
- **WHEN** le catalogue ne peut pas être lu
- **THEN** l'interface signale l'indisponibilité sans inventer de données.
