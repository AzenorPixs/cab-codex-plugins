## ADDED Requirements

### Requirement: Réconciliation native avant rattachement d'une opération
Avant rattachement, le contrôleur MUST vérifier l'accès puis prouver les fins natives non résolues comme pour sa libération. Les contrôles de décision, génération, couverture et révision MUST rester applicables. Une fin non prouvée MUST refuser le rattachement en conservant les protections. Le rattachement MUST NOT conférer de permission ni libérer de ressource.

#### Scenario: Fin native prouvée et diagnostic rattaché
- **WHEN** une commande native corrélée est terminée et qu'un diagnostic approuvé satisfait tous les contrôles de l'accès détenu
- **THEN** le contrôleur constate cette fin et rattache le diagnostic sans consommer de permission ni changer le jeton et le fencing

#### Scenario: Preuve absente ou divergente
- **WHEN** la fin de la commande native ne peut être prouvée ou qu'une identité native diverge
- **THEN** le rattachement est refusé et les protections restent détenues

#### Scenario: Libération concurrente
- **WHEN** une libération concurrente survient pendant la vérification native du rattachement
- **THEN** les transitions sont sérialisées et une ancienne identité ne peut autoriser un rattachement après libération

#### Scenario: Annulation existante du diagnostic rattaché
- **WHEN** le propriétaire libère l'accès avec le résultat RECONCILED après rattachement d'un diagnostic préparé et non exécuté
- **THEN** ce diagnostic est annulé et sa validation non consommée est invalidée sans permission native supplémentaire

### Requirement: Décision restaurée limitée à une annulation
Après redémarrage, un rattachement MAY demander explicitement la preuve native de la décision approuvée perdue pour annuler une opération préparée. CAB MUST vérifier les identités persistantes, l'accès restauré, la réponse MCP native et la stabilité de la session. Cette preuve MUST NOT restaurer une permission exécutable.

#### Scenario: Décision et identité corrélées
- **WHEN** la réponse MCP native approuvée correspond exactement à l'opération préparée et à l'accès restauré
- **THEN** le rattachement en vue de l'annulation peut être admis sans rétablir la décision exécutable

#### Scenario: Preuve ambiguë ou session active
- **WHEN** la réponse, les identités, les révisions ou l'historique divergent, ou qu'une permission native reste en attente
- **THEN** le rattachement est refusé et les protections restent détenues
