## ADDED Requirements

### Requirement: Composition autonome du retrait d’un shell approuvé sans accès
Le contrat distribué MUST présenter l’acquisition puis clôture RECONCILED
comme une composition ordinaire conditionnelle pour un shell APPROVED refusé
avant once sans accès lié. Le propriétaire MUST examiner manifeste courant,
révisions et disjonction. Les identités et protections MUST rester conservées ;
aucune nouvelle permission, annulation broker ou absence d’effet ne MUST être
inventée pour satisfaire une branche de récupération inapplicable.

#### Scenario: Manifeste courant et disjoint
- **WHEN** le propriétaire retire dans son mandat une unité shell approuvée jamais émise avec frontière quiescente prouvée
- **THEN** le skill et la commande indiquent la composition ordinaire sans solliciter le correcteur, sous toutes les gardes existantes

#### Scenario: Recouvrement, base périmée ou acquisition non détenue
- **WHEN** le scope est incompatible ou périmé, ou l’acquisition ne devient pas HELD
- **THEN** le contrat interdit de forcer la clôture HELD ou de modifier les ressources pour contourner le refus
