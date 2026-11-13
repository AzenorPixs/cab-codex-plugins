## ADDED Requirements

### Requirement: Résolution publique ciblée des sources Codex
CAB MUST proposer native.locate sans création de RUN et permettre native.bind
sans source_file lorsque le stockage natif standard est résoluble. Le compte
POSIX authentifié MUST déterminer la racine par défaut, avec CODEX_HOME explicite
compatible. Aucun compte ni chemin d’utilisateur particulier ne doit être fixé.

#### Scenario: Prévol sans RUN
- **WHEN** un client autorisé indique son projet et son SID UUIDv7
- **THEN** CAB examine seulement les noms du jour UTC de ce SID, ouvre uniquement le candidat exact et renvoie son chemin après vérification propriétaire, SID et projet, sans contenu de conversation ni écriture

#### Scenario: Candidat absent ou ambigu
- **WHEN** le candidat exact manque, est multiple, lié, non régulier, d’un autre propriétaire ou d’une autre identité
- **THEN** CAB refuse avec un diagnostic stable, sans choisir une autre conversation ni parcourir leur contenu

#### Scenario: Liaison compatible et répétable
- **WHEN** une source explicite valide est fournie ou une résolution automatique réussit
- **THEN** CAB conserve SID, RUN, génération et reçus, accepte la répétition identique sans nouvel effet et refuse un remplacement divergent

#### Scenario: Client ancien déjà chargé
- **WHEN** le client MCP antérieur ne connaît pas encore la nouvelle signature
- **THEN** le CLI public permet la résolution puis la liaison, sans arrêter le client ni rejouer les tests
