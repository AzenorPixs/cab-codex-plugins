## ADDED Requirements

### Requirement: Omission native input du diagnostic readiness vide
CAB MAY projeter input absent comme{} seulement pour l’unique broker_readiness({}) littéral retourné directement, achevé avec executed=false, sans erreur et non tronqué. La métadonnée MUST porter le même outil achevé et ne pas posséder input. Les métadonnées et l’empreinte brute MUST rester conservées ; cette projection MUST NOT créer de décision ou de permission.

#### Scenario: Omission attestée et appel vide unique
- **WHEN** ces conditions exactes sont réunies
- **THEN** le diagnostic est reconnu avec arguments{} sans muter les métadonnées natives

#### Scenario: Forme voisine ou ambiguë
- **WHEN** input est présent mais divergent, les arguments sont non vides, un autre outil apparaît ou la fin/provenance est invalide
- **THEN** CAB conserve execute bloquant sans argument implicite ni assouplissement
