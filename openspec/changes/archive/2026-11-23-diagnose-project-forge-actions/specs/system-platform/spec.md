## ADDED Requirements

### Requirement: Diagnostic des refus de transfert Git

CAB MUST distinguer un refus prouvé d'un résultat incertain pour les envois manuels et les synchronisations atomiques vers Forgejo, GitHub et GitLab. CAB MUST conserver un motif filtré et maintenir la protection tant que le résultat du transfert reste incertain.

#### Scenario: Refus confirmé de toutes les références

- **WHEN** le résultat Git identifie toutes les références du transfert comme inchangées ou refusées et que la relecture confirme leur état initial
- **THEN** CAB conserve le refus et rend possible la préparation explicite d'un nouvel aperçu

#### Scenario: Observation insuffisante

- **WHEN** le résultat Git est incomplet, le transport a échoué ou les références relues diffèrent de leur état initial
- **THEN** CAB conserve la protection et propose la réconciliation existante
