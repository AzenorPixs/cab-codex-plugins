# Spec Delta

## ADDED Requirements

### Requirement: Contrat de supervision de job local

Le contrôleur SHALL accepter et exposer exclusivement sur son interface locale
un contrat de supervision de job non secret, corrélé à une session OpenCode et
à son gate terminal. Il SHALL refuser un contrat incomplet, une mise à jour qui
substitue la session d'un job existant, ou une désactivation sans gate terminal
validé. Son statut public SHALL résumer le job armé et son gate sans exposer le
contenu du projet ni une décision CAB.

#### Scenario: Tentative de désarmement prématuré

- **WHEN** un client demande le désarmement d'un job dont le gate terminal est
  ouvert
- **THEN** le contrôleur refuse la demande et conserve le contrat observable
