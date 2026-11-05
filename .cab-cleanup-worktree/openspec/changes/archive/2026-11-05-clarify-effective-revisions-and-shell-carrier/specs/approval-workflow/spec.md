## ADDED Requirements

### Requirement: Documentation des révisions effectives
Le contrat distribué MUST préciser que la révision effective est le maximum
des révisions des clés qui se recouvrent, avec zéro par défaut en l’absence
de correspondance. L’absence de clé enfant ou de fichier MUST NOT être
assimilée automatiquement à zéro.

#### Scenario: Cache enfant absent
- **WHEN** un enfant absent a un parent dont la révision vaut11369
- **THEN** la préparation utilise au moins11369, jamais zéro par défaut

### Requirement: Documentation des scripts composés et des reprises
Le contrat MUST orienter un script composé même court vers le transport scellé
lorsque les cibles natives divergent de la commande complète. Une tentative
pendante MUST suivre le rejet/retrait qualifié avant une nouvelle unité ;
les gardes runtime et anciennes identités MUST rester inchangées.

#### Scenario: Script court et permission segmentée
- **WHEN** une permission présente plusieurs fragments au lieu de la commande complète
- **THEN** l’orchestrateur conserve le refus, retire la tentative par la voie qualifiée et prépare un nouveau transport scellé
