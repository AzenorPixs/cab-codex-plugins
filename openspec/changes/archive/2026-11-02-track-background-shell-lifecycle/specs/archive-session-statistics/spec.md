## MODIFIED Requirements

### Requirement: Sondes périodiques sans attente du créneau

Pendant une session pilotée, la collecte MUST utiliser en priorité les mesures
natives intégrées et attribuables. Une relève périodique toutes les trente
minutes MAY agréger ces mesures sans créer de tour LLM dédié si les données
sont disponibles. Les sondes nécessaires aux mesures non exposées MUST rester
distinctes du travail du codeur, bornées et non bloquantes. Le travail MUST
continuer entre les échéances ; aucune donnée absente ne peut être inventée.

#### Scenario: Télémétrie native disponible
- **WHEN** les compteurs attribuables sont déjà collectés par les composants
- **THEN** la relève les agrège sans nouveau tour LLM ni pause du RUN

#### Scenario: Mesure indisponible
- **WHEN** une source native ou une sonde requise est indisponible
- **THEN** la mesure reste N/A motivé et le RUN continue les travaux autorisés compatibles

#### Scenario: Travail entre deux sondes
- **WHEN** la prochaine échéance statistique n’est pas encore atteinte
- **THEN** l’orchestrateur poursuit les mandats autorisés sans arrêter le travail pour attendre le créneau
