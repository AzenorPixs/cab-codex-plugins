## ADDED Requirements

### Requirement: Routage des méthodes MCP CAB via Code Mode

Le helper `nativeCodingMandate` MUST distinguer les outils natifs OpenCode
write/edit/shell des méthodes MCP CAB. Après discovery `search` exacte,
`request_validation`, `broker_readiness`, `poll_approval`, `get_approval` et
`reject` MUST être appelés uniquement dans le wrapper Code Mode `execute` avec
le nom MCP découvert. Un catalogue sans entrée supérieure séparée MUST NOT
provoquer un nom deviné, un appel MCP direct, un repli shell ou une permission
supplémentaire.

#### Scenario: Méthode MCP découverte et appelée dans Code Mode

- **WHEN** la discovery complète retourne une méthode MCP CAB exacte et `execute` est disponible
- **THEN** le mandat indique d’appeler cette méthode dans Code Mode `execute` en conservant les gardes CAB existantes

#### Scenario: Méthode ou wrapper absent

- **WHEN** `search` ne retourne pas la méthode ou que le wrapper `execute` est indisponible
- **THEN** le mandat indique le blocage sans appeler un outil direct ni substituer shell ou une autre méthode
