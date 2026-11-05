## ADDED Requirements

### Requirement: Codes de lot explicites dans les tableaux
Le moniteur MUST afficher une colonne « codes de lot » en deuxième position des tableaux RUN et CHANGE, depuis le code du change corrélé, actif ou archivé référencé. Les tris, filtres, actions et compteurs existants MUST être préservés. Le rendu MUST rester textuel.

#### Scenario: Change portant un code
- **WHEN** le premier titre de proposal.md est « PA01 — Composition PA »
- **THEN** la deuxième cellule du change affiche PA01

#### Scenario: RUN corrélé à un change
- **WHEN** un RUN référence un change actif ou une archive référencée dont le titre porte C08
- **THEN** sa deuxième cellule affiche C08 depuis le même change

#### Scenario: Code absent ou document indisponible
- **WHEN** le titre ne porte pas de code reconnu ou proposal.md est absent ou dangereux
- **THEN** la deuxième cellule reste vide, sans tiret ni valeur inventée

#### Scenario: Mention incidente ou code dans un bloc
- **WHEN** PA01 apparaît seulement dans un bloc de code, dans le corps ou après un premier titre sans code
- **THEN** la deuxième cellule reste vide

### Requirement: Source explicite du code de lot
Le code MUST provenir du début du premier titre Markdown de niveau 1 hors blocs de code de proposal.md : 1 à 10 lettres majuscules puis 2 à 4 chiffres, seuls ou suivis de « — », « – », « - » ou « : » et d'un intitulé. Une source absente, dangereuse, sans titre ou sans code reconnu MUST donner une valeur vide. Le moniteur MUST NOT inférer le code depuis le dossier ou tasks.md. Les bornes et protections de lecture MUST être conservées.

#### Scenario: Formats reconnus
- **WHEN** le titre commence par PA01, PA02, C08, O26 ou B02 avec un séparateur explicite et un intitulé
- **THEN** seul ce code est extrait

#### Scenario: Absence de source admissible
- **WHEN** le document est absent, dangereux, sans titre ou sans code reconnu en tête du premier titre
- **THEN** aucun code n'est exposé
