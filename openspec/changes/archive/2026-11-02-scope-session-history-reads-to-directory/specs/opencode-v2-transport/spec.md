## ADDED Requirements

### Requirement: Location explicite de l’historique des messages

Le client MUST transmettre `x-opencode-directory` avec la location explicite
reçue par `messages(sessionId, directory)` pour chaque page de l’historique.
Il MUST NOT utiliser la location par défaut du client quand un répertoire de
session est fourni. Le contrôle s’applique aussi aux pages suivantes après
chaque curseur.

#### Scenario: Historique paginé d’une session dans une autre location

- **WHEN** le client lit plusieurs pages d’une session dont le répertoire diffère de sa location par défaut
- **THEN** chaque requête de message cible le répertoire explicite de cette session

## MODIFIED Requirements

### Requirement: Version majeure CAB 2.0.0 uniforme

Le paquet CAB, le broker, tous les scripts, commandes, plugins, skills, unités
et moniteur distribués MUST annoncer la version de base courante commune fixée
par codex-integration-distribution. Les deux manifestes de plugin MAY ajouter
un cachebuster après cette version. Aucune brique active ne MUST annoncer une
version de base 1.x.

#### Scenario: Vérification des versions distribuées

- **WHEN** les artefacts source et les deux manifestes de plugin sont inspectés
- **THEN** toutes les briques annoncent la base courante commune `2.1.74` et les manifestes conservent leur cachebuster propre

#### Scenario: Faux succès HTML

- **WHEN** une route API répond HTTP 200 avec HTML, du JSON malformé ou un schéma divergent
- **THEN** CAB refuse la réponse comme `opencode-v2-response-invalid` et ne marque aucune source saine


