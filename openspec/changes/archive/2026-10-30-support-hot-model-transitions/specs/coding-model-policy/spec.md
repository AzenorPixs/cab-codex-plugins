## MODIFIED Requirements

### Requirement: Choix explicite et PLLM automatique
Le protocole CAB MUST appliquer le dernier choix explicite autorisé de fournisseur, modèle et raisonnement, y compris à chaud dans le même job. Une ancienne politique, priorité ou provenance MUST NOT restreindre ce nouveau choix. Sans modèle explicite, il MUST utiliser la PLLM actuelle dans sa priorité publiée, sans entrée invalide, ambiguë ou non évaluée dans cette invocation. Aucun modèle MUST être inventé.

#### Scenario: Prompt sans modèle
- **WHEN** un nouveau job négocie pllm-auto-v1 sans modèle dans le prompt
- **THEN** CAB résout les candidates actuelles de PLLM dans leur ordre de priorité

#### Scenario: Politique seulement historique
- **WHEN** une politique inférieure n’a pas été évaluée dans la publication active
- **THEN** CAB demande son évaluation actuelle sans utiliser sa réussite historique

#### Scenario: Nouveau choix explicite à chaud
- **WHEN** l’orchestrateur soumet un choix explicite autorisé différent de l’ancien fournisseur ou de sa politique
- **THEN** CAB le résout sans catalogue imposé ni contrainte de l’ancien choix, accepte un niveau natif exposé hors medium/high si ces préférences manquent et conserve ce changement comme une nouvelle provenance

## ADDED Requirements

### Requirement: Prévol et réconciliation du nouveau choix
Une transition MUST résoudre à nouveau la cible, vérifier un prévol natif exact sans outil postérieur à sa préparation et observer le choix appliqué à la même session avant adoption durable. Les erreurs de quota/authentification MUST NOT devenir des incompatibilités de raisonnement. Le changement explicite MUST rester indépendant du catalogue ; une sélection omise MUST utiliser la PLLM actuelle.

#### Scenario: Nouvelle politique automatique
- **WHEN** la transition ne fournit pas de choix explicite
- **THEN** le contrôleur recalcule la PLLM et exige le prévol exact de sa sélection actuelle

#### Scenario: Preuve divergente ou cible modifiée
- **WHEN** le prévol ne correspond pas au choix préparé ou que la résolution diverge
- **THEN** la transition est refusée sans adoption ni permission implicite
