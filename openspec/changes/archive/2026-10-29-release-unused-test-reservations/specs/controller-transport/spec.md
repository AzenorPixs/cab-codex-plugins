## ADDED Requirements

### Requirement: Preuve native de restitution sans effet
POST /runs/<runId>/test-resources/release-unused MUST exiger une autorisation développeur spécifique, une attestation exhaustive et une empreinte de l’historique normalisé complet de la session exacte. Le contrôleur MUST relire l’historique, corréler les opérations terminées même déjà COMPLETED et contrôler idle, permissions, absence de mandat et de recovery.

#### Scenario: Fin de diagnostic non nulle examinée
- **WHEN** le diagnostic est terminé avec un exit non nul, sa preuve exacte est conservée et l’orchestrateur atteste son absence d’effet
- **THEN** le contrôleur peut accepter la restitution sans convertir cet exit en succès

#### Scenario: Activité concurrente ou preuve fabriquée
- **WHEN** une opération, un message ou une permission apparaît pendant la vérification ou qu’une empreinte ou identité diverge
- **THEN** la restitution est refusée et toutes les protections sont conservées

### Requirement: Refus et reçu de restitution sans effet
Un historique changé, incomplet, indisponible, un appel inconnu ou une fin divergente MUST refuser sans libération. Le reçu MUST conserver les empreintes de preuve, décision et frontière sans recopier le transcript ni les secrets. Cette route MUST NOT accorder de permission, relancer SSH ou réarmer un job.

#### Scenario: Historique inaccessible
- **WHEN** le contrôleur ne peut pas relire la preuve native complète
- **THEN** il refuse la restitution et ne lance aucun outil de réparation
