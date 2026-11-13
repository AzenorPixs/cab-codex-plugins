## MODIFIED Requirements

### Requirement: Empreinte distincte du code et des statistiques
L’empreinte de validation du code MUST exclure les STATISTICS.md générés du projet
et de ses changes, protégés par leurs propres empreintes. Elle MUST conserver
les chemins cadrés et représenter explicitement l’absence d’un fichier supprimé,
sans le recréer ni accepter silencieusement une autre source.

#### Scenario: Fichier cadré supprimé
- **WHEN** un fichier cadré est supprimé dans le périmètre autorisé
- **THEN** son absence modifie l’empreinte de façon stable, l’atelier ne monte ni ne recrée ce chemin et conserve les refus de chemins ou liens non sûrs
