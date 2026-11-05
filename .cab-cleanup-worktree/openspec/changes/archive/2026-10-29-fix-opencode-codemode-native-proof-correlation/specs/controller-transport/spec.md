## ADDED Requirements

### Requirement: Réconciliation des diagnostics Code Mode sans effet

La réconciliation explicite du rejet MAY reconnaître une découverte native strictement diagnostique, un polling corrélé interrompu et le relais natif de rejected décidé par CGPT. Elle MUST exiger le rejet terminal concordant et l'absence de toute commande ou approbation. Ces diagnostics MUST NOT autoriser une opération ni affaiblir le retry ordinaire. Le préfixe natif antérieur MUST rester vérifiable.

#### Scenario: Polling interrompu puis rejet explicite

- **WHEN** une demande est suivie d'un polling interrompu sans effet puis d'un rejet natif corrélé sous autorité humaine
- **THEN** CAB peut sceller le rejet sans reconstruire de décision exécutable et impose un nouveau prévol

#### Scenario: Commande ou approbation dans le diagnostic

- **WHEN** un outil exécutant une commande ou une approbation apparaît parmi les diagnostics
- **THEN** CAB refuse la réconciliation sans effet et conserve les protections
