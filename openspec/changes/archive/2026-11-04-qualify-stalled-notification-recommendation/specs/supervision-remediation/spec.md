## ADDED Requirements

### Requirement: Recommandation qualifiée des notifications stalled
Le diagnostic SHALL sélectionner sa recommandation sur les sous-états du snapshot watchdog : SENDING avec lease expirée vers RECOVER_NOTIFICATION_LEASE ; FAILED en retry_overdue ou notification jamais livrée vers RECONCILE_PENDING_APPROVALS ; état mixte/incomplet vers diagnostic ciblé. Il SHALL conserver la cause historique, les gardes et la readiness, sans exécuter de récupération ni activer un automatisme.

#### Scenario: Retry échoué sans lease
- **GIVEN** une notification PENDING/FAILED, reason retry_overdue et aucune lease
- **WHEN** le diagnostic est produit
- **THEN** il recommande d’évaluer la réconciliation ciblée, jamais de récupérer une lease inexistante
- **AND** la décision, la notification, les opérations, accès et baux restent inchangés

#### Scenario: Lease ou sous-état non qualifié
- **WHEN** toutes les notifications stalled sont SENDING/lease expirée
- **THEN** la récupération de lease est recommandée sous ses gardes existantes
- **WHEN** les sous-états sont mixtes, contradictoires ou manquants
- **THEN** seul le diagnostic ciblé est recommandé sans récupération automatique
