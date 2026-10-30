## ADDED Requirements

### Requirement: Distribution des transitions à chaud2.1.19
Les briques, plugins et commandes MUST annoncer2.1.19 et distribuer le raccord V2 ainsi que les transitions du même job. Le protocole MUST distinguer choix explicite libre et PLLM par défaut, secrets et autorisations opérationnelles. La qualification2.2.0 MUST être distincte d’un banc2.2.2. SCM réussi MUST être suivi de CABU et d’une notification des versions actives ; cela MUST NOT appliquer implicitement une clé ou politique aux RUN réels.

#### Scenario: Activation logicielle sans adoption métier implicite
- **WHEN** le correctif est qualifié, publié et activé par CABU
- **THEN** les propriétaires reçoivent les procédures et preuves de versions sans changement automatique de leur modèle ni de leur compte
