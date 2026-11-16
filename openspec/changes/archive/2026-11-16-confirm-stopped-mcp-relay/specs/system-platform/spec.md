## ADDED Requirements

### Requirement: Confirmation administrative d’une liaison MCP arrêtée
CAB MUST permettre à un administrateur de confirmer explicitement la déconnexion d’un relais ciblé par un reçu de mise à jour, uniquement après vérification de l’arrêt effectif du relais et de son moteur et de l’absence de requête ou d’effet incertain à la dernière observation et d’opération ou de bail actif pour son acteur. CAB MUST conserver la décision et ses identités dans le reçu et l’audit, sans la présenter comme une reconnexion ou une lecture de catalogue.

#### Scenario: Confirmation de la déconnexion
- **WHEN** la cible du reçu est arrêtée et que l’administrateur confirme sa déconnexion
- **THEN** CAB enregistre l’état DISCONNECTED et réévalue le même reçu sans lancer une nouvelle installation.

#### Scenario: Cible vivante ou effet incertain
- **WHEN** l’arrêt ne peut pas être prouvé ou qu’un effet reste incertain
- **THEN** CAB refuse la confirmation et conserve la protection de la mise à jour.
