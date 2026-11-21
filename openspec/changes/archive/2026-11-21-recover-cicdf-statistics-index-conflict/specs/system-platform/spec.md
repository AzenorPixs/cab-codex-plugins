## ADDED Requirements

### Requirement: Reprise CICDF après évolution des statistiques dans l’index partagé

CAB MUST permettre la reprise administrative du même CICDF lorsque le commit
a échoué avant les références par conflit d’index partagé. CAB MUST préserver
l’arbre de code et le plan d’origine. La reprise MUST comparer les entrées
modifiées de l’index partagé aux preuves CAB et refuser toute divergence de code.

#### Scenario: Rapports de statistiques indexés par CAB
- **WHEN** seules des entrées de rapports gérés par CAB ont changé, leur empreinte est attestée et le code de l’arbre figé concorde
- **THEN** CAB revérifie la comparaison sous verrou, poursuit le commit de la même livraison et conserve l’effet original
- **AND** CAB ne rejoue ni la version ni sa projection.

#### Scenario: Écart de code, preuve de statistiques absente ou effet incertain
- **WHEN** du code diffère, une preuve de rapport est absente ou une opération reste indécise
- **THEN** CAB refuse la reprise sans modifier les références ou les preuves historiques.
