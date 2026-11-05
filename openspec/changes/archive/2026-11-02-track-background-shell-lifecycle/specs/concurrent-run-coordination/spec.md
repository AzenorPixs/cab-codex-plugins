## ADDED Requirements

### Requirement: Ressource détenue pendant un processus background

Un accès qui porte un processus shell background MUST rester actif pendant
que le shell corrélé est RUNNING. Les opérations disjointes MAY progresser.
Une opération de fin explicite MUST être attachée au même accès et conserver
les décisions et permissions natives unitaires. La publication ou le gate
MUST attendre la preuve terminale du processus.

#### Scenario: Accès concurrent disjoint

- **WHEN** un serveur tient un port et une autre opération utilise des ressources disjointes
- **THEN** la nouvelle opération progresse sans libérer ni remplacer le verrou du port

#### Scenario: Gate avant fin du serveur

- **WHEN** un accès contient un shell background encore RUNNING ou une fin inconnue
- **THEN** la publication et le gate restent bloqués

### Requirement: Restitution d’un bail limitée à ses effets

La restitution d’une réservation de test MUST contrôler les opérations liées
à ce bail et les accès qui recouvrent ses ressources. Un accès distinct du
même RUN MUST NOT empêcher à lui seul cette restitution lorsque les propres
preuves cleanup et vérification du bail sont terminales et concordantes.
Un effet associé au bail ou un accès recouvrant incertain MUST garder le bail
protégé. La restitution MUST NOT modifier les accès distincts ni leurs once.

#### Scenario: Bail Chromium nettoyé et port Vite quarantiné
- **WHEN** les opérations navigateur, cleanup et vérification sont terminales et les seuls accès encore actifs concernent un port distinct du bail Chromium
- **THEN** le bail navigateur peut être restitué avec ses preuves, tandis que le port, son opération et son once restent intégralement protégés

#### Scenario: Opération incertaine utilisant le bail
- **WHEN** une opération liée au bail ou un accès recouvrant sa ressource reste EXECUTING ou UNKNOWN
- **THEN** la restitution est refusée même si un autre nettoyage a réussi

### Requirement: Réconciliation d'un bail disjoint sans effet associé

La réconciliation d'un bail restauré MUST vérifier ses effets et ressources,
la frontière native stable, l'inactivité et l'absence de permission. Une
validation déjà décidée d'un accès disjoint MUST NOT suffire à interdire
cette réconciliation. Les contrôles propriétaire, phase, version, fencing et
conflits MUST rester requis ; l'accès disjoint MUST rester inchangé.

#### Scenario: Validation décidée sur un fichier indépendant
- **WHEN** le bail est sans effet associé et les seules validations déjà décidées portent sur un fichier disjoint
- **THEN** le propriétaire peut réconcilier le bail avec ses preuves sans autoriser ou libérer ce fichier
