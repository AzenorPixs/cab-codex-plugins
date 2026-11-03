## MODIFIED Requirements

### Requirement: Remédiation à privilèges minimaux

Les remédiations automatiques SHALL rester limitées à une politique explicite et aux gardes techniques. Une ambiguïté dans le périmètre validé SHALL être instruite et décidée par l’orchestrateur, sans effet implicite. Une décision humaine SHALL être demandée uniquement pour une extension hors de ce périmètre. Aucune politique SHALL inventer une preuve, supprimer une protection incertaine ou rejouer once.

#### Scenario: Auto-remédiation non autorisée
- **WHEN** aucune politique active n’autorise une action de remédiation
- **THEN** CAB n’exécute pas l’action et invite l’orchestrateur à qualifier sa délégation dans le mandat, sans demande humaine automatique
