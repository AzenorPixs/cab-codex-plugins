## ADDED Requirements

### Requirement: Observation légère des sessions directes

SGS MUST fournir une lecture locale bornée aux identités et bornes des sessions directes CAB du projet demandé, sans recalculer les événements statistiques. Le moniteur MUST utiliser cette lecture pour ses RUN directs. La vue Stats MUST continuer à provenir de SGS ; une panne de la lecture MUST rester visible sans masquer les RUN pilotés.

#### Scenario: Plusieurs sessions et projets
- **WHEN** SGS contient des sessions directes et pilotées de plusieurs projets
- **THEN** la lecture retourne uniquement les sessions directes CAB du projet demandé avec leurs bornes de fermeture

#### Scenario: Télémétrie volumineuse
- **WHEN** la télémétrie est volumineuse
- **THEN** la liste des RUN directs ne recalcule pas les événements statistiques
