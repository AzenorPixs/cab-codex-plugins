## ADDED Requirements

### Requirement: Diagnostic filtré de longueur refusée

Lorsqu'une notification reçoit HTTP 400 et un diagnostic `command-too-long` valide, le broker MUST conserver dans sa trace d'échec un diagnostic reconstruit uniquement à partir du code, de l'unité UTF-16 et des deux longueurs. Les longueurs MUST être des entiers positifs sûrs JavaScript et actualLength MUST dépasser maxLength. Ce traitement MUST NOT créer de décision REJECTED ou APPROVED, délivrer de permission ou modifier le cycle de notification existant.

#### Scenario: Diagnostic reconnu
- **WHEN** une notification reçoit HTTP 400 avec le code reconnu et des longueurs valides
- **THEN** la trace d'échec indique la limite et la longueur constatée sans reprendre la commande et la demande reste PENDING

### Requirement: Lecture bornée du diagnostic contrôleur

Le broker MUST borner sa lecture du corps d'erreur et MUST NOT recopier le message distant ni des champs supplémentaires. Une réponse non reconnue, excessive, malformée ou illisible MUST conserver le diagnostic HTTP générique.

#### Scenario: Diagnostic non fiable
- **WHEN** le corps contient un message arbitraire, des longueurs invalides, un autre code, une autre unité, un contenu excessif ou une erreur de lecture
- **THEN** le broker conserve le diagnostic HTTP générique sans journaliser ce contenu
