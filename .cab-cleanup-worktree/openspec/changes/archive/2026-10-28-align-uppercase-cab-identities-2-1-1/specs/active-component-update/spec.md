## MODIFIED Requirements

### Requirement: Exception explicite pour les sources CAB
La politique `cab-source` MUST autoriser uniquement les trois modules broker nommés dans `<workspace>/src`, sans managed-release. Le projet MUST être nommé `cab` dans pyproject.toml et son manifeste local du plugin CAB MUST être identique au paquet installé. Les contrôles de type, propriétaire et absence de liens MUST rester applicables. Toute autre destination dans le workspace ou les caches MUST rester refusée.

#### Scenario: Broker source du dépôt CAB
- **WHEN** la politique `cab-source` vise exactement src/ dans un dépôt CAB identifié et conforme au manifeste CAB installé
- **THEN** seuls les trois modules broker nommés sont sauvegardés et remplacés transactionnellement ; les autres sources restent intactes

#### Scenario: Exception source non prouvée
- **WHEN** le projet, le manifeste CAB, le chemin src/ ou les contrôles de liens ne sont pas conformes
- **THEN** l'outil refuse avant arrêt des services ou création du journal de transaction
