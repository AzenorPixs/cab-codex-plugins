## MODIFIED Requirements

### Requirement: Contrat HTTP de validation
Le contrôleur SHALL accepter une demande sur `POST /validation/request`,
mémoriser une décision explicite et unique sous le `requestId` de la demande,
et la restituer par `GET /decision/<requestId>`. Toute décision restituée SHALL
inclure le même `requestId`, l'`approval_id` et le `change_id` de la demande
notifiée. Le contrôleur SHALL accepter les décisions `approved`, `rejected` et
`needs_clarification` et SHALL refuser une seconde décision pour le même
`requestId`.

#### Scenario: Décision manuelle valide
- **WHEN** une décision `needs_clarification` valide est envoyée sur `POST /decision/<requestId>` pour une demande notifiée
- **THEN** le contrôleur la mémorise une fois avec les identifiants de la demande et répond avec un statut HTTP de création

#### Scenario: Lecture corrélée d'une décision
- **WHEN** le broker appelle `GET /decision/<requestId>` après qu'une décision a été mémorisée
- **THEN** le contrôleur retourne cette décision et ses identifiants de corrélation sans la substituer par un `approval_id`

#### Scenario: Méthode non admise
- **WHEN** une méthode autre que GET ou POST cible `/decision/<requestId>`
- **THEN** le contrôleur répond HTTP 405
