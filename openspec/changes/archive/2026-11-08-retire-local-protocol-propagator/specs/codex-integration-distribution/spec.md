## ADDED Requirements

### Requirement: Retrait de l'outil historique de propagation

Le point d'entrée historique de propagation des prompts MUST refuser explicitement toute opération avant lecture ou écriture d'un projet. Il MUST NOT générer de copie locale du protocole ni propager d'ancien bloc de pilotage. Le diagnostic MUST orienter vers le contrat CAB distribué.

#### Scenario: Tentative de propagation
- **WHEN** l'outil historique est invoqué avec ou sans option d'application
- **THEN** il retourne un échec explicite avant toute modification de projet et indique le contrat distribué
