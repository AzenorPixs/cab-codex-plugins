## ADDED Requirements

### Requirement: Sondes périodiques sans attente du créneau

Pendant une session de codage pilotée, l'orchestrateur MUST prévoir les sondes
statistiques toutes les 30 minutes (1 800 secondes), en complément des sondes
initiale et finale. Il MUST poursuivre le travail entre les échéances et
MUST NOT arrêter le travail pour attendre un créneau ou maintenir une attente
bloquante de trente minutes. La collecte MUST rester distincte du contexte de
travail de l'agent de codage.

#### Scenario: Travail entre deux sondes

- **WHEN** la prochaine échéance statistique n'est pas encore atteinte
- **THEN** l'orchestrateur poursuit les mandats autorisés sans arrêter le travail pour attendre le créneau

### Requirement: Échec statistique distinct d'un échec PLLM

Une relève manquée ou une mesure indisponible MUST être signalée sans
reconstruction rétroactive. Le traitement d'une sonde statistique échouée
MUST rester distinct des nouvelles tentatives illimitées du benchmark PLLM ;
il MUST NOT suspendre le RUN au seul motif de cet échec.

#### Scenario: Relève manquée ou sonde échouée

- **WHEN** une relève est manquée ou une sonde statistique échoue
- **THEN** le rapport conserve la cause sans inventer de mesure et le RUN poursuit son travail autorisé
