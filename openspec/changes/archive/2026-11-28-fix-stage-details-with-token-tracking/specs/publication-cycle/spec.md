## MODIFIED Requirements

### Requirement: Suivi natif des compteurs de chaque tentative

CAB MUST ouvrir un suivi durable par rôle à chaque tentative exécutée, avec l'identité native liée au RUN, l'heure d'ouverture et la dernière observation disponible comme référence. CAB MUST exposer l'attente dès le début et actualiser l'état en autonomie. Une nouvelle tentative MUST avoir une preuve distincte.

#### Scenario: Ouverture sans relevé nouveau

- **WHEN** CAB ouvre une étape exécutée
- **THEN** le Résumé et l'étape affichent l'attente par rôle jusqu'à la première mesure attribuée.
- **AND** le chemin nominal ne demande aucune déclaration de compteurs à l'agent.

#### Scenario: Validation et relevé tardif

- **WHEN** la validation de l'étape arrive avant le relevé correspondant
- **THEN** CAB conserve l'attente et réexamine les preuves au fil de la collecte.
- **AND** CAB rattache le relevé une seule fois lorsque la preuve native identifie un passage et un rôle uniques.
- **AND** un contrôle d'Implémentation exigeant des compteurs conserve sa barrière.

#### Scenario: Attribution indéterminée

- **WHEN** la collecte atteste une activité dont la mesure par passage ne peut être prouvée
- **THEN** CAB indique l'attribution indéterminée et son motif et conserve les mesures aux niveaux attestés.

#### Scenario: Zéro et étape vacante

- **WHEN** un compteur décrit par la source vaut zéro
- **THEN** CAB affiche zéro comme valeur observée.
- **AND** l'étape Vacante reste non exécutée.

#### Scenario: Relire une tentative suivie

- **WHEN** le Résumé ou le détail d’étape est demandé pour une tentative de tout projet
- **THEN** CAB MUST retourner un seul état par rôle, avec la mesure persistée si elle existe, ou l’attente prévue à l’ouverture.
- **AND** un passage historique sans suivi reste consultable.
