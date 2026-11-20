## ADDED Requirements

### Requirement: Version du worker observée au démarrage
Le relais MUST publier la version attestée par son worker courant. Il MUST obtenir un catalogue réel avant l’état READY.

#### Scenario: Moteur lancé avant catalogue
- **WHEN** le worker courant fournit sa version avant la fin de la lecture du catalogue
- **THEN** le heartbeat publie cette version et le statut CATALOG_PENDING

#### Scenario: Mise à jour suivante après relance confirmée
- **WHEN** le même frontend relancé demande une version plus récente vérifiée et l’ancien reçu attend les connexions
- **THEN** CAB conserve le reçu antérieur et admet la nouvelle demande sans rejouer l’ancien effet
