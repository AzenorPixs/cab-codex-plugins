## MODIFIED Requirements

### Requirement: Source explicite du code de lot
Le code MUST provenir du début du premier titre Markdown de niveau 1 hors blocs de code de proposal.md : 1 à 10 lettres majuscules puis 2 à 4 chiffres, ou exactement L1 ou L2, seuls ou suivis de « — », « – », « - » ou « : » et d'un intitulé. Toute source absente, dangereuse, sans titre ou sans code reconnu MUST donner une valeur vide. Le moniteur MUST NOT inférer le code depuis le dossier ou tasks.md. Les bornes et protections de lecture MUST être conservées.

#### Scenario: Formats reconnus
- **WHEN** le titre commence par PA01, PA02, C08, O26 ou B02 avec un séparateur explicite et un intitulé
- **THEN** seul ce code est extrait

#### Scenario: Absence de source admissible
- **WHEN** le document est absent, dangereux, sans titre ou sans code reconnu en tête du premier titre
- **THEN** aucun code n'est exposé

#### Scenario: Codes historiques conservés
- **WHEN** le premier titre admissible commence par exactement L1 ou L2, seul ou suivi d’un séparateur reconnu et d’un intitulé
- **THEN** le code historique est extrait à l’identique, sans renumérotation ni ajout de zéro

#### Scenario: Exception historique strictement limitée
- **WHEN** le titre porte L0, L3, PA1, un suffixe accolé à L1 ou L2, ou un code historique seulement dans le corps ou un bloc de code
- **THEN** aucun code n’est exposé depuis cette mention et les règles du premier titre admissible restent applicables
