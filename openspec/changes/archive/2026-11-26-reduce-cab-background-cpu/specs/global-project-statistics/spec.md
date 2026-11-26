## ADDED Requirements

### Requirement: Veille ciblée des sources projet
CAB MUST regrouper les changements locaux par projet, détecter les mises à jour des tâches et des rapports, et rattraper les événements perdus. La projection DOIT conserver ses contrôles de sécurité et ses garanties de rattrapage.

#### Scenario: Modification de tâches ou de statistiques
- **WHEN** un fichier de tâches ou un rapport change dans une source surveillée
- **THEN** CAB programme la projection du projet concerné

#### Scenario: Débordement ou veille reconstruite
- **WHEN** la veille perd des événements ou qu'un chemin surveillé est remplacé
- **THEN** CAB rétablit la veille et rattrape les projections concernées
