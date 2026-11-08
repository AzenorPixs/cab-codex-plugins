## ADDED Requirements

### Requirement: Décision orchestrateur sans outil MCP Codex dédié

Le protocole MUST documenter la route locale du contrôleur permettant à l’orchestrateur de décider sur une validation corrélée, même si la surface Codex ne présente pas d’outil MCP de décision. La décision MUST rester distincte de l’accès et de la permission native.

#### Scenario: Validation enregistrée en attente
- **WHEN** l’orchestrateur a revu la demande et choisit une décision dans son mandat
- **THEN** il peut la transmettre à la route du même RUN et requestId, puis vérifier le reçu sans émettre once lui-même

#### Scenario: Réponse de décision incertaine
- **WHEN** la réponse au POST est perdue ou indique une décision déjà enregistrée
- **THEN** il relit la même décision et ne la réémet pas aveuglément
