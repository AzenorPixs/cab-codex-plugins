## ADDED Requirements

### Requirement: Diagnostic scoped de la restauration native

`GET /runs/<runId>/operations` MUST exposer l’état durable de restauration de
chaque opération, y compris un état explicite quand la décision ou la
corrélation native n’est pas disponible. La projection MUST rester limitée au
RUN et à l’opération filtrée et MUST NOT exposer chemin, commande, contenu,
jeton d’accès, texte libre ou credential.

#### Scenario: Opération préparée sans décision durable

- **WHEN** une opération préparée n’a aucune décision persistée
- **THEN** le GET l’indique explicitement comme non restaurable sans présenter
  l’absence de once comme preuve d’absence d’effet

#### Scenario: Opération restaurée

- **WHEN** une décision et une opération sont restaurées depuis des preuves
  natives concordantes
- **THEN** le GET retourne son état borné et ses identifiants de corrélation
  sans données sensibles

#### Scenario: Filtre exact

- **WHEN** un operationId exact est fourni
- **THEN** seul cet enregistrement du RUN est retourné, sans mutation
