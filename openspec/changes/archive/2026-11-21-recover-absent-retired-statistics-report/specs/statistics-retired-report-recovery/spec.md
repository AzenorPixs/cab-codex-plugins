## MODIFIED Requirements

### Requirement: Reste sans effet d’un lot statistique après archivage

CAB MUST réconcilier un rapport en attente sur un ancien chemin absent d'un change archivé uniquement sur preuves stables. CAB MUST vérifier les rapports achevés, conserver le reçu UNKNOWN original et ne rejouer aucune écriture.

#### Scenario: Rapport retiré absent de HEAD et de l'index
- **WHEN** les producteurs sont arrêtés, l'ancien chemin initialement absent reste absent, Git confirme sous verrous l'absence d'entrée dans HEAD et l'index, et les rapports achevés correspondent à leurs reçus
- **THEN** CAB enregistre FAILED_REMAINDER_NO_CHANGE, préserve les reçus et libère le verrou sans modifier les autres RUN.

#### Scenario: Rapport en attente sur l’ancien chemin d’un change archivé
- **WHEN** le producteur est arrêté et CAB retrouve toutes les preuves sous ses verrous
- **THEN** CAB enregistre FAILED_REMAINDER_NO_CHANGE, préserve les reçus achevés et libère le verrou.

#### Scenario: Preuve absente, propriétaire actif ou état divergent
- **WHEN** une preuve manque, qu’un producteur reste actif ou qu’un fichier ou l’index diffère
- **THEN** CAB préserve UNKNOWN et le verrou.
