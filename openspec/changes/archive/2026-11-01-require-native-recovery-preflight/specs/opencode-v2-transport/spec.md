## ADDED Requirements

### Requirement: Retour direct de la découverte Code Mode

Le normaliseur V2 MAY reconnaître `return await search(<objet littéral>);`
comme `cab_codemode_discovery` seulement si l’enveloppe prouve un appel unique
`search` achevé avec les mêmes arguments, sans troncature ni autre appel. La
projection MUST rester diagnostique et scellée par l’empreinte complète. Un
await sans retour, une expression supplémentaire ou des métadonnées
divergentes MUST rester non normalisé.

#### Scenario: Search retourné directement

- **WHEN** execute retourne un unique search littéral avec métadonnées concordantes
- **THEN** CAB expose une discovery read-only sans décision ni permission

#### Scenario: Search attendu sans retour

- **WHEN** execute attend search sans retourner sa valeur
- **THEN** CAB conserve l’enveloppe non corrélée et bloque l’admission de récupération
