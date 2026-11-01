## ADDED Requirements

### Requirement: Corrélation exacte d'une erreur native CodeMode

Le contrôleur MUST accepter une notification de validation comme corrélée lorsque le transcript contient un unique `request_validation` CodeMode littéral normalisé, marqué `cabCodeMode.nativeMcpError` et identique à l'intégralité de l'identité native reçue. Cette corrélation MUST NOT créer ou modifier une décision, une permission ou un once.

#### Scenario: Erreur MCP après persistance du request

- **WHEN** la notification broker vise une demande exacte et que le CodeMode natif de la même session atteste l'appel unique `request_validation` en erreur avec le marqueur normalisé
- **THEN** le contrôleur corrèle la notification sous les gardes existantes et laisse la demande décidable selon le protocole normal

#### Scenario: Identité ou marqueur divergents

- **WHEN** l'identité diffère, le marqueur est absent, l'appel est multiple ou le transcript n'est pas un CodeMode natif normalisé
- **THEN** le contrôleur refuse `native-validation-not-correlated` sans décision ni permission

#### Scenario: Ancienne demande NOT_ADMITTED

- **WHEN** le client interroge une demande antérieure déjà `NOT_ADMITTED`
- **THEN** CAB conserve son état terminal et exige un identifiant neuf pour une demande future
