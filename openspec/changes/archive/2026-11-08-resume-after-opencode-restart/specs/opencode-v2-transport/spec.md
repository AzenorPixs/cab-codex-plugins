## ADDED Requirements

### Requirement: Continuité après redémarrage imprévu
Lorsqu'OpenCode est redémarré, CAB SHALL vérifier l'identité de la nouvelle instance, la disparition de l'ancienne et le workspace avant de rétablir les communications. CAB SHALL vérifier les sessions persistantes et les frontières natives avant toute reprise. Un changement de PID seul SHALL NOT prouver l'identité d'une session ou la fin d'un effet.

#### Scenario: Nouvelle instance et session persistante vérifiées
- **WHEN** l'ancienne instance a disparu et la nouvelle instance et la session du même workspace sont vérifiées
- **THEN** CAB rétablit la communication et engage la réconciliation du RUN sans recréer sa session ni rejouer d'effet

#### Scenario: Identité ou effet incertain
- **WHEN** la nouvelle identité, la session ou la fin d'un effet ne peut pas être prouvée
- **THEN** CAB conserve les protections concernées et expose le diagnostic sans empêcher les RUN indépendants vérifiés

### Requirement: Réconciliation des protections après redémarrage
CAB SHALL réconcilier les accès et baux restaurés lorsque leur propriétaire, leur identité et leur frontière native sont vérifiés. Les ressources SHALL rester protégées tant que leur état est incertain. Aucun nouveau test, commande ou permission SHALL être rejoué par la réconciliation.

#### Scenario: Bail restauré et frontière quiescente
- **WHEN** le bail propriétaire et les deux observations natives concordent et ne révèlent aucun effet incertain
- **THEN** la réconciliation conserve ce bail et permet la poursuite du RUN sans nouvelle allocation
