## ADDED Requirements

### Requirement: Efficacité mesurée et corrélation exacte
CAB SHALL utiliser préfixes stables, états ciblés, calculs locaux et attentes mécaniques bornées hors LLM. Le compactage SHALL conserver un checkpoint structuré et ne provoquer aucun rejeu. Les révisions effectives SHALL être fournies pour les clés exactes et distinguées des révisions brutes, sans réagrégation des agrégats.

#### Scenario: Parent agrégé et fichier enfant
- **WHEN** une révision du parent provient d’un autre enfant
- **THEN** le client conserve la révision effective exacte du fichier demandé et ne traite pas celle du parent comme une écriture brute
