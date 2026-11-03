## ADDED Requirements

### Requirement: Binding strict d’une commande JSON dans Code Mode

Le client MUST pouvoir lier une commande littérale déclarée à une propriété
`commands` unique dans un objet `request_validation` Code Mode, que la clé soit
écrite en syntaxe JavaScript non quotée ou JSON quotée. L’élément lié MUST être
l’identifiant exact de la déclaration et MUST être remplacé par sa valeur
littérale échappée avant la comparaison avec l’appel MCP natif. Une clé
dupliquée, une valeur différente ou une expression dynamique MUST conserver le
wrapper `execute` bloquant.

#### Scenario: Clé JSON quotée et commande littérale

- **WHEN** un wrapper complet et non exécuté déclare une commande littérale puis l’utilise comme unique entrée de `"commands"` et correspond à l’appel MCP natif
- **THEN** CAB normalise l’appel en conservant son entrée exacte et sa preuve native

#### Scenario: Propriété dupliquée ou binding divergent

- **WHEN** plusieurs propriétés `commands` existent, la variable diffère de la déclaration ou l’entrée est dynamique
- **THEN** CAB conserve le wrapper `execute` non normalisé et n’admet aucune validation

## MODIFIED Requirements

### Requirement: Version majeure CAB 2.0.0 uniforme

Le paquet CAB, le broker, tous les scripts, commandes, plugins, skills, unités
et moniteur distribués MUST annoncer la version de base courante commune fixée
par codex-integration-distribution. Les deux manifestes de plugin MAY ajouter
un cachebuster après cette version. Aucune brique active ne MUST annoncer une
version de base 1.x.

#### Scenario: Vérification des versions distribuées

- **WHEN** les artefacts source et les deux manifestes de plugin sont inspectés
- **THEN** toutes les briques annoncent la base courante commune `2.1.75` et les manifestes conservent leur cachebuster propre

#### Scenario: Faux succès HTML

- **WHEN** une route API répond HTTP 200 avec HTML, du JSON malformé ou un schéma divergent
- **THEN** CAB refuse la réponse comme `opencode-v2-response-invalid` et ne marque aucune source saine

