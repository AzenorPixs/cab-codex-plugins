## ADDED Requirements

### Requirement: Instruction native explicite du nouveau mandat
Le client CAB MUST proposer un helper explicite distinguant outils natifs et catalogue MCP, en conservant intégralement le mandat fourni. Une découverte MCP vide MUST NOT prouver l’absence de write/edit/shell natifs. Le helper MUST NOT attribuer de permission ni modifier les prompts existants implicitement.

#### Scenario: Catalogue MCP sans write
- **WHEN** un nouveau mandat est enveloppé par le helper natif
- **THEN** le codeur reçoit l’instruction d’utiliser l’outil natif disponible et de signaler son absence réelle sans changer d’outil ou de cible

### Requirement: Diagnostic de reprise sans autorité
CAB MUST proposer un diagnostic pur lié au SID et au message utilisateur exact, distinguant erreur fournisseur, découverte seule et arguments natifs incomplets/divergents. Les résultats MUST NOT exposer les corps ou erreurs libres, inférer une absence d’effet, déclencher PLLM, retry, décision ou once. La reprise MUST exiger réconciliation et nouveau mandat si nécessaire, sans compléter un fragment.

#### Scenario: Erreur fournisseur et fragment write
- **WHEN** un assistant corrélé échoue puis émet un fragment différent de l’entrée revue
- **THEN** le diagnostic impose de vérifier les effets et réconcilier ; les gardes exactes restent inchangées et aucune permission ne se rejoue

#### Scenario: Message étranger ou preuve absente
- **WHEN** l’ancre ou le SID est absent ou étranger
- **THEN** le diagnostic reste indisponible et ne déduit pas une réussite
