## ADDED Requirements

### Requirement: Ressources techniques bornées du rapport SGS
Une nouvelle transition REPORT MUST réserver le seul rapport ciblé et son
candidat .sgs-candidate exact. La restauration MUST accepter les anciennes
réservations du seul rapport, sans accepter de fichier tiers. Le delta global
MUST rester hors du mandat REPORT du codeur, sous une autorisation distincte.

#### Scenario: Rapport canonique et candidat
- **WHEN** un contexte entre en REPORT pour STATISTICS.md
- **THEN** seuls ce fichier et son candidat sont réservés en écriture

#### Scenario: Reprise ancienne
- **WHEN** un contexte REPORT historique réserve uniquement son rapport
- **THEN** il reste lisible et aucune ressource étrangère n’est autorisée
