## ADDED Requirements

### Requirement: Normalisation bornée des littéraux request_validation Code Mode
Le client MAY normaliser un wrapper terminal `request_validation` direct dont
l'objet est littéral, y compris des templates sans interpolation. Il MAY aussi
accepter une unique déclaration `const` à string littérale en tête, utilisée
une fois comme seul élément de `commands`. Toute interpolation, expression,
statement ou tool additionnel, troncature ou métadonnée divergente MUST rester
refusé avant notification ou permission.

#### Scenario: Template littérale exacte
- **WHEN** le wrapper terminal contient une template sans interpolation dans l'unique entrée `commands`
- **AND** le tool call natif unique est complet et porte le même objet
- **THEN** CAB normalise et corrèle `request_validation`

#### Scenario: Constante string strictement bornée
- **WHEN** une unique constante string littérale en tête est référencée une seule fois comme unique élément de `commands`
- **AND** aucune autre instruction ou tool n'apparait et les métadonnées correspondent
- **THEN** CAB normalise et corrèle `request_validation`

#### Scenario: Expression ou tool additionnel
- **WHEN** le wrapper contient une interpolation, une valeur dynamique, un statement supplémentaire ou des métadonnées divergentes
- **THEN** il reste `execute` non admis et CAB ne notifie aucune validation
