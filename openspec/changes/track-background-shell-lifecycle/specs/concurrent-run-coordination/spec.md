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
