## ADDED Requirements

### Requirement: Fin du serveur OpenCode suivi
Le moniteur MUST appliquer cab-process-lifecycle à son serveur OpenCode local identifié. Il MUST rester indépendant d’une panne isolée du contrôleur ou du superviseur ; leur indisponibilité MUST NOT constituer une preuve de fermeture d’OpenCode.

#### Scenario: Contrôleur seul arrêté
- **WHEN** le contrôleur tombe mais le serveur OpenCode identifié vit encore
- **THEN** le moniteur reste disponible et expose la panne

#### Scenario: Serveur OpenCode terminé
- **WHEN** la disparition de l’instance OpenCode suivie est prouvée localement
- **THEN** le moniteur ferme ses flux et son serveur sans modifier les RUN
