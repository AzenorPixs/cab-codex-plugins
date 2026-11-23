## ADDED Requirements

### Requirement: Annulation prouvée sans nouvelle indexation
CAB MUST permettre à un administrateur d’annuler une tentative UNKNOWN préparée lorsque l’index correspond exactement à l’ancien instantané et que ses références restent identiques. CAB MUST conserver le reçu original, l’index et ses références, puis rendre l’index OPEN. Toute divergence MUST refuser la réconciliation.

#### Scenario: Instantané conservé
- **WHEN** index et références correspondent à l’état enregistré avant la tentative
- **THEN** CAB annule uniquement l’effet indécis et conserve l’index
