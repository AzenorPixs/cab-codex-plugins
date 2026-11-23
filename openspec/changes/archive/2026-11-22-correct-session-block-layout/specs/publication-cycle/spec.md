## MODIFIED Requirements

### Requirement: Bloc Session multionglet
Le bloc MUST garder le titre « Session | Change » de style forge, avec icône, barre verticale et trait horizontal, sous les onglets.

#### Scenario: Consulter les tâches du change
- **WHEN** Change est ouvert
- **THEN** toutes les tâches et leurs états sont visibles.

#### Scenario: Consulter un autre onglet pendant une mise à jour PostgreSQL
- **WHEN** Electric signale une évolution
- **THEN** les onglets restent à jour et les étapes restent cliquables.

## ADDED Requirements

### Requirement: Informations et finalisation visibles
Les onglets MUST présenter les données utiles directement.

#### Scenario: Ouvrir Informations
- **WHEN** Informations est ouvert
- **THEN** aucune ligne Phase, aucun doublon du titre ni badge d’état introductif ne s’affiche.

#### Scenario: Afficher les preuves
- **WHEN** Finalisation est ouverte
- **THEN** les preuves affichables sont toutes visibles sans accordéon.

### Requirement: Sous-onglets du cycle
Le bloc MUST séparer le résumé des détails du cycle réel.

#### Scenario: Parcourir les étapes du cycle
- **WHEN** Étapes du cycle est sélectionné
- **THEN** Résumé conserve la liste et les durées et précède les onglets 1 à 12 du cycle de publication.

#### Scenario: Ouvrir le détail
- **WHEN** un numéro est activé dans le résumé
- **THEN** son onglet affiche directement les détails, itérations et actions.
