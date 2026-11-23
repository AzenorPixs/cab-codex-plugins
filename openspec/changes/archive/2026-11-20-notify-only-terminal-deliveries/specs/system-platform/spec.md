## MODIFIED Requirements

### Requirement: Livraisons dans les notifications
CAB MUST supprimer l’affichage du journal CI/CD dans le bloc Git. CAB MUST présenter les étapes publiques et le résultat terminal de la livraison dans une notification attribuée au projet concerné. Il MUST NOT créer de notification ni de reçu de lecture pour un état en attente ou en cours.

#### Scenario: Résultat de livraison après lecture de son avancement
- **WHEN** un administrateur a consulté l’avancement dans le suivi de la livraison et celle-ci atteint un résultat terminal
- **THEN** seul le résultat terminal est publié dans le centre, avec les étapes et son horodatage
- **AND THEN** les détails de livraison ne sont plus affichés dans le bloc Git

#### Scenario: Mise à niveau avec anciennes notifications d’avancement
- **WHEN** une ancienne notification d’avancement ou son reçu reste en base
- **THEN** CAB retire ces seuls enregistrements et conserve les bilans terminaux
