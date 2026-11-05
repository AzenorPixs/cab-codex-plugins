## ADDED Requirements

### Requirement: Reçu durable de notification réconciliée
CAB MUST conserver propriétaire, identité intégrale de l'opération et reçu de réconciliation filtré. Le reçu MUST lier transaction, RUN, génération, job, recovery, candidate, demande et empreintes d'autorisation et de preuves. Une répétition identique MUST restituer le reçu sans nouvel effet ; une divergence MUST être refusée. Le verrou rejet seul MUST survivre au redémarrage.

#### Scenario: Réponse perdue
- **WHEN** une transaction de réconciliation est répétée avec le même contenu
- **THEN** son reçu durable reste identique sans suppression de propriétaire ni nouvelle permission

#### Scenario: Panne de persistance
- **WHEN** l'enregistrement durable échoue
- **THEN** aucune validation exploitable ni permission n'est créée et le registre refuse les mutations suivantes
