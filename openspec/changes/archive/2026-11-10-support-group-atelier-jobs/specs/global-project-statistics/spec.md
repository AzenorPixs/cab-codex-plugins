## ADDED Requirements

### Requirement: Publication statistique en 0770

Le moteur SGS SHALL accepter `--file-mode 0770` pour les rapports et registres, avec conservation des protections et contrôles transactionnels existants.

#### Scenario: Rapport en mode du projet
- **WHEN** le développeur choisit `--file-mode 0770`
- **THEN** le rapport publié utilise 0770 sans modifier le contenu des autres contributions
