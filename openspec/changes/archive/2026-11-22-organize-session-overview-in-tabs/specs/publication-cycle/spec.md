## ADDED Requirements

### Requirement: Bloc Session multionglet
La vue Session MUST présenter un titre commun « Session | Change » dans une barre de style forge avec un symbole coloré du développement. Elle MUST proposer dans l’ordre Informations, Finalisation, Étapes du cycle et Change. Informations MUST supprimer les deux lignes déjà au titre. La récapitulation de validation de l’agent MUST être retirée.

#### Scenario: Consulter les tâches du change
- **WHEN** le développeur ouvre l’onglet Change
- **THEN** l’avancement et les tâches apparaissent avec l’état réalisé ou à réaliser.

#### Scenario: Consulter un autre onglet pendant une mise à jour PostgreSQL
- **WHEN** Electric signale une évolution pendant la navigation entre onglets
- **THEN** les informations, la finalisation, les étapes et le change conservent leur actualisation. Les étapes restent cliquables.

### Requirement: Unités des durées affichées
Une durée supérieure à 60 secondes MUST s’afficher en minutes et secondes. Une durée supérieure à 60 minutes MUST s’afficher en heures, minutes et secondes. Le formatage MUST préserver la décimale utile et ne MUST pas modifier la valeur enregistrée.

#### Scenario: Durée d’itération longue
- **WHEN** une itération dure 641,2 secondes
- **THEN** elle s’affiche comme 10 min 41,2 s.
