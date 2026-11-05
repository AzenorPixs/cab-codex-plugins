## ADDED Requirements

### Requirement: Déclaration structurée de l'étape
POST /job/progress et sa route par RUN MUST accepter stepId du catalogue, stepStatus et expectedStepSequence. Les états MUST être IN_PROGRESS par défaut, ALREADY_COVERED ou NOT_APPLICABLE. Une déclaration partielle, inconnue ou périmée MUST être refusée avant mutation. Les appels historiques sans ces champs MUST rester compatibles.

#### Scenario: Revue suivie d'une correction
- **WHEN** un job armé au gate OPEN déclare IMPLEMENTATION avec la séquence courante après REVIEW
- **THEN** le contrôleur persiste le nouveau passage sans fermer le gate ni modifier la phase

### Requirement: Historique d'étape durable et borné
Le contrôleur MUST persister lifecycle schéma 1, sequence et au plus cent entrées history contenant sequence, id, status et at. La dernière entrée MUST définir l'étape courante. Les dates MUST être attribuées côté contrôleur. Une répétition identique de la dernière déclaration MUST être idempotente et une déclaration concurrente périmée MUST être refusée.

#### Scenario: Réémission après réponse perdue
- **WHEN** la dernière déclaration identique est répétée avec sa séquence attendue précédente
- **THEN** le contrôleur conserve la séquence et l'historique sans second passage

### Requirement: Neutralité métier de l'étape
Une déclaration d'étape MUST NOT créer permission, décision, reprise ou validation terminale. Après validation du gate, le contrôleur MUST refuser une nouvelle déclaration. Les événements publics MUST exposer uniquement les identifiants et états fermés d'étape avec leur séquence.

#### Scenario: Clôture annoncée sans gate
- **WHEN** un job déclare CLOSURE alors que son gate est OPEN
- **THEN** il expose Clôture 11/11 mais conserve le gate OPEN
