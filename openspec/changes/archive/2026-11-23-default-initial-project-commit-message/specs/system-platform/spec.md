## ADDED Requirements

### Requirement: Message automatique du premier commit du projet

Dans le formulaire de commit local, CAB MUST préremplir « Message du commit »
avec « Initialisation du projet » pour un projet sans dépôt Git ou dont le
dépôt ne possède aucun historique de commit accessible par ses références.
Le champ MUST rester éditable. Si le message transmis est vide, CAB MUST
choisir le défaut selon l’historique observé à la création du commit local.

#### Scenario: Premier commit du projet

- **WHEN** le projet n’a pas de dépôt Git ou possède un dépôt Git sans historique de commit
- **THEN** CAB propose « Initialisation du projet » et utilise ce texte si aucun message n’est fourni.

#### Scenario: Commit suivant

- **WHEN** le dépôt possède déjà un historique de commit et que le message transmis est vide
- **THEN** CAB utilise « Mise à jour du projet », y compris lorsque la branche courante est neuve.

#### Scenario: Message personnalisé

- **WHEN** le développeur fournit un message explicite pour un commit local
- **THEN** CAB utilise ce message.
