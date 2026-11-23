## ADDED Requirements

### Requirement: Actions d’étape attestées et horodatées
CAB MUST réutiliser les passages enfants PostgreSQL pour tracer les actions réellement effectuées. Chaque action MUST identifier sa tentative parente, son origine, son état et ses dates observées. L’Overview MUST recevoir les changements via Electric et afficher seulement les actions attestées.

#### Scenario: Contrôle terminé après un retour en arrière
- **WHEN** le résultat d’un contrôle arrive après l’ouverture d’un autre passage
- **THEN** CAB met à jour l’action du passage où ce contrôle a démarré. Un reçu répété ne crée aucun doublon.

#### Scenario: Action facultative absente
- **WHEN** une action du catalogue n’a pas eu lieu sur ce RUN
- **THEN** aucun passage d’action n’est créé et l’Overview ne l’affiche pas.

### Requirement: Validation de la liste des mandats à l’Initialisation
Pour un nouveau RUN, l’agent responsable MUST enregistrer sa validation de la liste exacte des mandats déclarés avant de terminer l’Initialisation. CAB MUST conserver la liste horodatée avec le passage. Cette validation ne MUST modifier aucune autorité ni permission.

#### Scenario: Confirmation du périmètre de session
- **WHEN** les mandats déclarés sont SCM, CICDF et CABU
- **THEN** CAB attend leur confirmation exacte. L’Overview montre la liste quand l’agent l’a validée.
