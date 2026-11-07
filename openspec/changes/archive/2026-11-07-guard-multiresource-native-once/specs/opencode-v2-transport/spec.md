## ADDED Requirements

### Requirement: Interdire once pour une permission shell décomposée
Une permission shell native portant plusieurs ressources SHALL rester observable après corrélation de sa source, mais SHALL NOT correspondre à une opération approuvable ni recevoir once. La voie de rejet propriétaire journalisée SHALL rester disponible et les autres permissions SHALL conserver leurs protections.

#### Scenario: Commande composée exactement observée
- **WHEN** une permission à plusieurs ressources couvre la commande native
- **THEN** elle est visible pour diagnostic et refusée pour l’admission once

#### Scenario: Rejet propriétaire
- **WHEN** le propriétaire rejette la permission sous les gardes applicables
- **THEN** le rejet reste traçable sans émission once ni décision inventée
