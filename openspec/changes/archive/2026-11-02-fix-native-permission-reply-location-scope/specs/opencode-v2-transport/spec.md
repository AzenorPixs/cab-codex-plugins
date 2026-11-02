## ADDED Requirements

### Requirement: Réponse de permission native dans la location ciblée

Le client MUST transmettre chaque réponse de permission native à l’API V2
avec le scope de location exact associé à la session et à la permission.
Il MUST conserver l’endpoint, la décision demandée et la vérification d’une
réponse HTTP 204. Il MUST refuser un scope invalide avant toute requête.
Un appel de réponse non confirmé MUST NOT être présenté comme une permission
consommée.

#### Scenario: Session dans une autre location

- **WHEN** la location de la session diffère de la location par défaut du client
- **THEN** le POST de réponse porte le scope de la location de la session
- **AND** la décision et l’endpoint V2 restent inchangés

#### Scenario: Réponse native non confirmée

- **WHEN** l’API ne confirme pas la réponse par HTTP 204
- **THEN** le client signale l’échec sans déclarer `once` consommée ni renvoyer
  automatiquement le POST

## MODIFIED Requirements

### Requirement: Version majeure CAB 2.0.0 uniforme

Le paquet CAB, le broker, tous les scripts, commandes, plugins, skills, unités
et moniteur distribués MUST annoncer la version de base courante commune fixée
par codex-integration-distribution. Les deux manifestes de plugin MAY ajouter
un cachebuster après cette version. Aucune brique active ne MUST annoncer une
version de base 1.x.

#### Scenario: Vérification des versions distribuées

- **WHEN** les artefacts source et les deux manifestes de plugin sont inspectés
- **THEN** toutes les briques annoncent la base courante commune `2.1.61` et les
  manifestes conservent leur cachebuster propre

#### Scenario: Faux succès HTML

- **WHEN** une route API répond HTTP 200 avec HTML, du JSON malformé ou un
  schéma divergent
- **THEN** CAB refuse la réponse comme `opencode-v2-response-invalid` et ne
  marque aucune source saine
