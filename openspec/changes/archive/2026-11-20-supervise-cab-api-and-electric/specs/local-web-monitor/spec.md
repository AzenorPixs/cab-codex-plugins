## ADDED Requirements

### Requirement: Reprise bornée des composants CAB

CAB MUST superviser la sortie de son API et d’Electric. Un mécanisme indépendant MUST surveiller l’échec du démon CAB. La reprise MUST être limitée à une tentative par panne, donner lieu à une notification horodatée et exiger une preuve de disponibilité avant succès.

#### Scenario: Sortie d’un enfant

- **WHEN** l’API CAB ou Electric s’arrête hors maintenance
- **THEN** CAB démarre une seule fois le remplaçant et vérifie sa réponse avant de le déclarer disponible

#### Scenario: Démon CAB en échec

- **WHEN** systemd constate un échec du démon
- **THEN** une unité indépendante peut le démarrer une fois et vérifier la réponse de son API
- **AND THEN** un arrêt volontaire ne déclenche pas cette reprise
