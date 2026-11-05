## ADDED Requirements

### Requirement: Réponse de notification bornée sous sa lease
Le broker MUST réserver un délai HTTP de10 secondes à la notification au
contrôleur, inférieur à sa lease de15 secondes. Les lectures de décision MUST
conserver leur délai de2 secondes. Un dépassement ou un refus MUST préserver
les identifiants, la décision métier et les protections. MATCHED seul MUST NOT
être présenté comme une admission ou une livraison. Une reprise MUST réobserver
l’état et utiliser la même approval dans les voies autorisées, sans rejeu métier.

#### Scenario: Vérification native lente mais réponse valide
- **WHEN** le contrôleur répond202 après plus de2s et avant10s
- **THEN** la notification est DELIVERED sous sa lease et aucune décision métier n’est inventée

#### Scenario: Refus après vérification lente
- **WHEN** une réponse de refus arrive après2s et avant10s
- **THEN** son diagnostic filtré est observé sans fausse livraison

#### Scenario: Délai de notification dépassé
- **WHEN** aucune réponse ne parvient dans le délai dédié
- **THEN** la même approval reste sans décision implicite et l’échec de transport est conservé
