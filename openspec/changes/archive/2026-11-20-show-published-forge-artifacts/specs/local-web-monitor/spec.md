## ADDED Requirements

### Requirement: Artefacts attestés dans les blocs des forges distantes
CAB MUST afficher les artefacts Debian et Docker observés dans les blocs Forgejo, GitHub et GitLab seulement pour les types activés. CAB MUST conserver ces observations dans `project_forge_artifacts`, distincte de l’inventaire local, et permettre leur lecture initiale puis leur synchronisation par Electric.

#### Scenario: Rafraîchissement d’une forge
- **WHEN** CAB rafraîchit une forge
- **THEN** il lit les fichiers Debian attachés aux releases et les tags Docker attestés par le registre
- **AND THEN** la projection conserve la dernière observation si une lecture échoue et indique son indisponibilité
- **AND THEN** une modification de la projection est transmise aux clients autorisés

#### Scenario: Publication native d’artefacts locaux
- **WHEN** l’administrateur actionne le bouton d’une forge qui dispose d’artefacts locaux activés
- **THEN** CAB utilise la fonction native correspondant à la forge et le tag de version déjà confirmé à distance
- **AND THEN** CAB relit l’état distant et préserve les résultats indéterminés sans rejeu automatique

#### Scenario: Tags locaux Docker
- **WHEN** CAB fabrique une image Docker pour un projet avec une version déclarée
- **THEN** CAB pose sur cette même image le tag du projet `:latest` et le tag du projet suivi de sa version
