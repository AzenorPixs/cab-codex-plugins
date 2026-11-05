## ADDED Requirements

### Requirement: Persistance atomique d’un rejet natif sans effet

Le registre MUST accepter la clôture rejetée uniquement pour l’opération exacte au statut `PREPARED`, sans entrée native ni accès. Il MUST persister en une écriture le statut terminal `CANCELLED`, la décision `rejected` et l’empreinte de la preuve native. La même preuve et la même décision sont idempotentes ; toute divergence MUST être refusée. Cette transition MUST préserver toutes les autres opérations, RUN et ressources.

#### Scenario: Clôture du mandat rejeté sans accès

- **WHEN** le registre reçoit le rejet natif exact et son empreinte pour l’opération `PREPARED`
- **THEN** il stocke décision, empreinte et `CANCELLED` atomiquement, sans créer de lease ou d’accès

#### Scenario: Rejeu ou divergence

- **WHEN** la même opération reçoit un autre statut ou une empreinte différente
- **THEN** le registre refuse sans altérer le reçu terminal
