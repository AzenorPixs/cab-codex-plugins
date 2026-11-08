## ADDED Requirements

### Requirement: Vérification après application avec conservation additive

Après application d’un nettoyage ciblé, CAB MUST conserver les approbations dont l’attribution au RUN effacé n’est pas établie et leurs événements. Le propriétaire MUST vérifier sous verrou que la rétention est additive, exclut les identifiants initialement ciblés et permet de vérifier l’absence du périmètre à effacer. Il MUST préserver le reçu et MUST NOT rejouer la suppression.

#### Scenario: Approbation conservée après application
- **WHEN** une approbation non attribuée et ses événements subsistent après application
- **THEN** le propriétaire les conserve et atteste la portée effective avant la clôture du reçu

#### Scenario: Identité ciblée ajoutée à la rétention
- **WHEN** une nouvelle identité retenue appartient au périmètre initial à supprimer
- **THEN** la vérification refuse la modification et préserve le reçu

### Requirement: Rattachement de vérification compatible

Le helper et le broker 2.4.41 MAY reprendre en phase VERIFYING un reçu déjà appliqué lié au helper 2.4.40 et aux services 2.4.35, après vérification de l’identité et de la fraîcheur du propriétaire, du reçu et de l’instance native. CAB MUST réutiliser le même reçu et MUST aligner ensuite les composants par CABU.

#### Scenario: Propriétaire ou preuve divergente
- **WHEN** le propriétaire, le reçu ou la preuve courante ne concorde pas
- **THEN** CAB refuse le rattachement sans relancer la suppression
