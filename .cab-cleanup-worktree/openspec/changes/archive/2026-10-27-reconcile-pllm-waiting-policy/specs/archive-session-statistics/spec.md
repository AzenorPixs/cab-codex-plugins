## MODIFIED Requirements

### Requirement: Échec statistique distinct d'un échec PLLM

Une relève manquée ou une mesure indisponible MUST être signalée sans reconstruction rétroactive. Le traitement d'une sonde statistique échouée MUST rester distinct de l'indisponibilité PLLM et de son attente d'instruction humaine ; il MUST NOT suspendre le RUN au seul motif de cet échec. Une échéance ou un échec statistique MUST NOT déclencher d'évaluation ou de benchmark PLLM.

#### Scenario: Relève manquée ou sonde échouée

- **WHEN** une relève est manquée ou une sonde statistique échoue
- **THEN** le rapport conserve la cause sans inventer de mesure et le RUN poursuit son travail autorisé sans déclencher de benchmark PLLM
