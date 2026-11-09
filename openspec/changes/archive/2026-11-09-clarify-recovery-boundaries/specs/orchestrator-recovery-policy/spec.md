## ADDED Requirements

### Requirement: Compatibilité des chemins de récupération d'un accès dédié
Le retrait qualifié d'un membre refusé puis la libération de son accès SHALL rester deux actions à reçus distincts. Une proposition du plan SHALL NOT prouver son admission ; la route SHALL appliquer toutes les gardes de l'exigence « Retrait délégué avant émission native ».

#### Scenario: Retrait puis libération distincte
- **WHEN** le propriétaire choisit le retrait qualifié d'un membre refusé d'un accès dédié puis la libération admissible de son accès
- **THEN** les deux actions conservent leurs reçus distincts et aucune once ni résultat natif n'est inventé

#### Scenario: Proposition de libération d'une préparation non émise
- **WHEN** le plan propose release-access pour une préparation PREPARED non émise
- **THEN** cette proposition ne prouve pas la réussite de l'action et ses gardes restent obligatoires

### Requirement: Usage borné d'une lecture tronquée en récupération
Une lecture native explicite, terminée et qualifiée MAY être considérée non mutante même si sa sortie est tronquée. Le contrôleur SHALL vérifier son outil, son identité et son entrée et SHALL NOT utiliser la sortie tronquée comme preuve du contenu complet lu. Une lecture invalide, active, en erreur ou ayant une entrée ambiguë SHALL NOT bénéficier de cette exception.

#### Scenario: Lecture tronquée sans preuve de contenu
- **WHEN** une lecture native terminée a un outil, une identité et une entrée valides et une sortie tronquée
- **THEN** elle peut être distinguée d'une mutation sans attester le contenu complet

#### Scenario: Lecture non qualifiée
- **WHEN** l'outil, l'identité, l'entrée ou la terminaison n'est pas vérifiable
- **THEN** la récupération ne considère pas cette lecture comme une observation non mutante qualifiée
