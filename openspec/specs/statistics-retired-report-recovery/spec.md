# statistics-retired-report-recovery Specification

## Purpose

TBD - created by archiving change recover-retired-statistics-publication. Update Purpose after archive.

## Requirements

### Requirement: Reste sans effet d’un lot statistique après archivage

CAB MUST réconcilier un rapport encore en attente si son ancien chemin était
absent, son change possède une archive unique et l’entrée indexée est
inchangée par rapport à HEAD et attestée avant le lot. CAB MUST vérifier
les rapports déjà achevés, conserver UNKNOWN et ne rejouer aucune écriture.

#### Scenario: Rapport en attente sur l’ancien chemin d’un change archivé
- **WHEN** le producteur est arrêté et CAB retrouve toutes les preuves sous ses verrous
- **THEN** CAB enregistre FAILED_REMAINDER_NO_CHANGE, préserve les reçus achevés et libère le verrou.

#### Scenario: Preuve absente, propriétaire actif ou état divergent
- **WHEN** une preuve manque, qu’un producteur reste actif ou qu’un fichier ou l’index diffère
- **THEN** CAB préserve UNKNOWN et le verrou.
